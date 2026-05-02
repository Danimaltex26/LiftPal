import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import auth from "../middleware/auth.js";
import { sendAnalysisReadyEmail } from "../utils/email.js";
import { analyzeLiftPhoto } from "../utils/liftAnalyzer.js";
import { screenImage } from "../utils/contentGuard.js";

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

    // Content guard: screen first image for appropriateness and domain relevance
    var guard = await screenImage(req.files[0].buffer, req.files[0].mimetype, "liftpal");
    if (!guard.allowed) {
      return res.status(400).json({ error: guard.reason });
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

    // CLAUDE API CALL: lift photo analysis — see /server/utils/liftAnalyzer.js
    var analysisResult;
    try {
      analysisResult = await analyzeLiftPhoto({
        imageBase64: req.files[0].buffer.toString("base64"),
        imageMediaType: req.files[0].mimetype || "image/jpeg",
        analysisType: analysisType,
        equipmentType: req.body.equipment_type,
        manufacturer: req.body.manufacturer,
        installationType: req.body.installation_type,
        codeEdition: req.body.code_edition,
        symptoms: req.body.symptoms,
        userNotes: req.body.user_notes,
        userId: userId,
      });
    } catch (error) {
      if (error.type === 'api_error' || error.type === 'parse_error' || error.type === 'validation_error') {
        return res.status(error.status || 500).json({
          error: error.userMessage || 'Analysis failed. Please try again.'
        });
      }
      throw error;
    }

    var result = analysisResult.analysis;

    // Save to DB
    var { data: record, error: insertError } = await supabaseService
      .from("lift_analyses")
      .insert({
        user_id: userId,
        image_urls: imageUrls,
        analysis_type: result.analysis_type || analysisType,
        diagnosis: result.assessment_reasoning || result.overall_assessment,
        recommended_action: result.prioritized_actions && result.prioritized_actions[0] ? result.prioritized_actions[0].action : null,
        confidence: result.confidence,
        severity: result.overall_assessment,
        full_response_json: result,
      })
      .select("id")
      .single();

    if (insertError) console.error("DB insert error:", insertError);

    // Only send email for offline-queued analyses
    if (req.body.queued) {
      sendAnalysisReadyEmail({
        to: req.user.email,
        appKey: "liftpal",
        displayName: req.profile.display_name,
        analysisType: result.analysis_type || analysisType,
      }).catch(() => {});
    }

    return res.json({ result, record_id: record?.id, model: analysisResult.model });
  } catch (err) {
    console.error("Analysis error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
