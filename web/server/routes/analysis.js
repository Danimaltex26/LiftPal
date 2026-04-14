import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import auth from "../middleware/auth.js";
import { callClaude } from "../utils/claudeClient.js";
import { ANALYSIS_SYSTEM_PROMPT } from "../prompts/analysis.js";
import { sendAnalysisReadyEmail } from "../utils/email.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "liftpal" } }
);

const supabaseStorage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/", auth, upload.array("images", 4), async (req, res) => {
  try {
    const userId = req.user.id;
    const analysisType = req.body.analysis_type || "general";

    // SUBSCRIPTION GATE
    if (req.profile.subscription_tier === "free") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabaseService
        .from("lift_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 2) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 2 photo analyses per month. Upgrade to Pro for unlimited access.",
          limit: 2, used: count,
        });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    // Upload images to storage
    var imageUrls = [];
    for (var i = 0; i < req.files.length; i++) {
      var file = req.files[i];
      var filePath = userId + "/" + Date.now() + "_" + file.originalname;
      var { error: uploadError } = await supabaseStorage.storage
        .from("liftpal-uploads")
        .upload(filePath, file.buffer, { contentType: file.mimetype });
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }
      var { data: urlData } = supabaseStorage.storage
        .from("liftpal-uploads")
        .getPublicUrl(filePath);
      imageUrls.push(urlData.publicUrl);
    }

    // Build Claude message with images
    var content = [];
    for (var j = 0; j < req.files.length; j++) {
      var f = req.files[j];
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: f.mimetype,
          data: f.buffer.toString("base64"),
        },
      });
    }
    content.push({
      type: "text",
      text: "Analysis type hint: " + analysisType + ". Analyze the elevator/lift equipment in these photos.",
    });

    var aiResult = await callClaude({
      feature: 'photo_diagnosis',
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: content }],
    });
    var rawText = aiResult.content;

    // Parse JSON
    var result;
    try {
      var stripped = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      result = JSON.parse(stripped);
    } catch {
      try {
        var start = stripped.indexOf("{");
        var depth = 0;
        var end = start;
        for (var k = start; k < stripped.length; k++) {
          if (stripped[k] === "{") depth++;
          if (stripped[k] === "}") depth--;
          if (depth === 0) { end = k + 1; break; }
        }
        result = JSON.parse(stripped.substring(start, end));
      } catch (e2) {
        console.error("Failed to parse Claude response:", rawText);
        return res.status(500).json({ error: "Failed to parse analysis result", raw: rawText });
      }
    }

    // Save to DB
    var { data: record, error: insertError } = await supabaseService
      .from("lift_analyses")
      .insert({
        user_id: userId,
        image_urls: imageUrls,
        analysis_type: analysisType,
        diagnosis: result.overall_diagnosis || result.plain_english_summary,
        recommended_action: result.recommended_action,
        confidence: result.confidence,
        severity: result.severity,
        full_response_json: result,
      })
      .select("id")
      .single();

    if (insertError) console.error("DB insert error:", insertError);

    // Fire-and-forget email
    sendAnalysisReadyEmail({
      to: req.user.email,
      appKey: "liftpal",
      displayName: req.profile.display_name,
      analysisType: analysisType,
    }).catch(() => {});

    return res.json({ result, record_id: record?.id, model: aiResult.model });
  } catch (err) {
    console.error("Analysis error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
