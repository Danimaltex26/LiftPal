import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { callClaude } from "../utils/claudeClient.js";
import { TROUBLESHOOT_SYSTEM_PROMPT } from "../prompts/troubleshoot.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "liftpal" } }
);

router.post("/", auth, async (req, res) => {
  try {
    var userId = req.user.id;
    var {
      equipment_type,
      manufacturer_model,
      component,
      symptom,
      environment,
      already_tried = [],
      follow_up,
      conversation_history = [],
      session_id,
    } = req.body;

    // SUBSCRIPTION GATE
    if (req.profile.subscription_tier === "free") {
      var startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      var { count } = await supabaseService
        .from("troubleshoot_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 2) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 2 troubleshoot sessions per month. Upgrade to Pro for unlimited access.",
          limit: 2, used: count,
        });
      }
    }

    // Load existing session for follow-up
    var existingSession = null;
    var existingHistory = [];

    if (session_id) {
      var { data, error: fetchError } = await supabaseService
        .from("troubleshoot_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", userId)
        .single();
      if (fetchError || !data) return res.status(404).json({ error: "Session not found" });
      existingSession = data;
      existingHistory = data.conversation_json || [];
    }

    // Follow-ups need the JSON reminder appended — otherwise the model
    // drifts into conversational prose and the response won't parse.
    var userMessage = session_id && follow_up
      ? follow_up + "\n\nRespond with a JSON object exactly matching the schema in your instructions. No prose before or after, no markdown code fences."
      : buildTroubleshootMessage(req.body);

    var messages = [];
    if (existingHistory.length > 0) messages.push(...existingHistory);
    else if (conversation_history.length > 0) messages.push(...conversation_history);
    messages.push({ role: "user", content: userMessage });

    // CLAUDE API CALL: LiftPal troubleshoot diagnosis
    // Elevator troubleshoot always routes to Sonnet — public conveyance
    // safety requires Sonnet's reasoning depth on every submission.
    // See utils/modelRouter.js classifyTroubleshoot()
    var troubleshootContext = {
      // Prior conversation turns
      conversationHistory: existingHistory || [],

      // Symptom for safety keyword detection
      symptom: req.body.symptom || req.body.symptomDescription ||
        req.body.fault_code || req.body.faultCode || '',

      // Fault code present = platform-specific controller interpretation = Sonnet
      hasFaultCode: !!(
        (req.body.fault_code || req.body.faultCode) &&
        String(req.body.fault_code || req.body.faultCode).trim()
      ),

      // Safety device or safety circuit category = always Sonnet
      isSafetyCircuitIssue: [req.body.problem_category, req.body.problemCategory]
        .some(c => (c || '').toLowerCase() === 'safety_circuit'),

      // Door system = most common cause of passenger entrapment = Sonnet
      isDoorSystem: [req.body.problem_category, req.body.problemCategory]
        .some(c => (c || '').toLowerCase() === 'door_system'),

      // 480V systems = arc flash risk = Sonnet
      isHighVoltage: (req.body.voltage_system || req.body.voltageSystem || '').includes('480'),

      // Modernization = complex code compliance across old/new = Sonnet
      isModernization: (req.body.installation_type || req.body.installationType || '')
        .toLowerCase().includes('modern'),

      // 2+ already-tried steps = fault not clearing = Sonnet
      alreadyTriedMultiple: (already_tried?.length || 0) >= 2,

      requiresCodeCompliance: false,
      isSpecialtyMaterial: false,
    };

    var aiResult = await callClaude({
      feature: 'troubleshoot',
      context: troubleshootContext,
      systemPrompt: TROUBLESHOOT_SYSTEM_PROMPT,
      messages: messages,
    });
    var rawText = aiResult.content;

    var result;
    try {
      var jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse Claude response:", rawText);
      return res.status(500).json({ error: "Failed to parse troubleshoot result", raw: rawText });
    }

    var updatedHistory = [...messages, { role: "assistant", content: rawText }];

    var sessionPayload = {
      user_id: userId,
      equipment_type: equipment_type || existingSession?.equipment_type,
      component: component || existingSession?.component,
      environment: environment || existingSession?.environment,
      conversation_json: updatedHistory,
    };

    var savedSession;
    if (session_id && existingSession) {
      var { data: updated, error: updateError } = await supabaseService
        .from("troubleshoot_sessions")
        .update(sessionPayload)
        .eq("id", session_id)
        .select()
        .single();
      if (updateError) return res.json({ result, session_id: session_id, saved: false, model: aiResult.model });
      savedSession = updated;
    } else {
      var { data: inserted, error: insertError } = await supabaseService
        .from("troubleshoot_sessions")
        .insert(sessionPayload)
        .select()
        .single();
      if (insertError) return res.json({ result, saved: false, model: aiResult.model });
      savedSession = inserted;
    }

    return res.json({ result, session_id: savedSession.id, model: aiResult.model });
  } catch (err) {
    console.error("Troubleshoot error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Builds the user message from form fields.
// Supports current LiftPal fields (equipment_type, manufacturer_model,
// component, symptom, environment, already_tried) plus additional spec
// fields (problem_category, fault_code, voltage_system, installation_type,
// manufacturer) if the frontend is extended later.
function buildTroubleshootMessage(body) {
  var lines = [];
  var b = body || {};

  var equipmentType = b.equipment_type || b.equipmentType;
  var manufacturer = b.manufacturer || b.manufacturer_model;
  var model = b.model || b.manufacturer_model;
  var voltageSystem = b.voltage_system || b.voltageSystem;
  var installationType = b.installation_type || b.installationType;
  var problemCategory = b.problem_category || b.problemCategory;
  var faultCode = b.fault_code || b.faultCode;
  var component = b.component;
  var environment = b.environment;
  var alreadyTried = b.already_tried || b.alreadyTried || [];
  var symptom = b.symptom || b.symptomDescription;

  if (equipmentType && equipmentType !== 'Unknown') {
    lines.push('Equipment type: ' + equipmentType);
  }
  if (manufacturer && manufacturer !== 'Unknown') {
    lines.push('Manufacturer / model: ' + manufacturer);
  } else if (model) {
    lines.push('Model: ' + model);
  }
  if (component) lines.push('Component: ' + component);
  if (voltageSystem) lines.push('Voltage system: ' + voltageSystem);
  if (installationType) lines.push('Installation type: ' + installationType);

  if (problemCategory) {
    var categoryLabels = {
      door_system: 'Door system',
      leveling: 'Leveling / landing accuracy',
      ride_quality: 'Ride quality / comfort',
      controller_fault: 'Controller fault / electrical',
      safety_circuit: 'Safety circuit',
      hydraulic: 'Hydraulic system',
      escalator: 'Escalator / moving walk',
      modernization: 'Modernization issue',
      other: 'Other',
    };
    lines.push('Problem category: ' + (categoryLabels[problemCategory] || problemCategory));
  }

  if (faultCode && String(faultCode).trim()) {
    lines.push('Fault code: ' + String(faultCode).trim());
  }
  if (environment) lines.push('Environment: ' + environment);
  if (alreadyTried && alreadyTried.length > 0) {
    lines.push('Already tried: ' + alreadyTried.join(', '));
  }
  if (symptom && String(symptom).trim()) {
    lines.push('Mechanic description: ' + String(symptom).trim());
  }

  var contextBlock = lines.length > 0
    ? lines.join('\n')
    : 'No additional context provided.';

  return contextBlock + '\n\nDiagnose this elevator/escalator problem and return your complete assessment as a JSON object exactly matching the schema in your instructions. Determine if passengers can ride first.';
}

export default router;
