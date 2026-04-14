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

    var userMessage = session_id && follow_up
      ? follow_up
      : [
          "Equipment type: " + (equipment_type || "not specified"),
          "Manufacturer/model: " + (manufacturer_model || "not specified"),
          "Component: " + (component || "not specified"),
          "Symptoms: " + (symptom || "not specified"),
          "Environment: " + (environment || "not specified"),
          "Already tried: " + (already_tried.length > 0 ? already_tried.join(", ") : "nothing yet"),
        ].join("\n");

    var messages = [];
    if (existingHistory.length > 0) messages.push(...existingHistory);
    else if (conversation_history.length > 0) messages.push(...conversation_history);
    messages.push({ role: "user", content: userMessage });

    var aiResult = await callClaude({
      feature: 'troubleshoot',
      context: {
        conversationHistory: existingHistory || [],
        symptom: req.body.symptom || '',
      },
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
      if (updateError) return res.json({ result, session_id: session_id, saved: false });
      savedSession = updated;
    } else {
      var { data: inserted, error: insertError } = await supabaseService
        .from("troubleshoot_sessions")
        .insert(sessionPayload)
        .select()
        .single();
      if (insertError) return res.json({ result, saved: false });
      savedSession = inserted;
    }

    return res.json({ result, session_id: savedSession.id });
  } catch (err) {
    console.error("Troubleshoot error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
