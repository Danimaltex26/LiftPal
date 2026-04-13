import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

const supabaseApp = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "liftpal" } }
);

const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/profile
router.get("/", auth, async (req, res) => {
  try {
    var userId = req.user.id;
    var profile = req.profile;
    var startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    var [analysisCount, troubleshootCount, referenceCount, prefs] = await Promise.all([
      supabaseApp.from("lift_analyses").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfMonth),
      supabaseApp.from("troubleshoot_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfMonth),
      supabaseApp.from("reference_queries").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfMonth),
      supabaseApp.from("user_preferences").select("equipment_types, certifications, specialties").eq("user_id", userId).maybeSingle(),
    ]);

    return res.json({
      ...profile,
      equipment_types: prefs.data?.equipment_types || [],
      certifications: prefs.data?.certifications || [],
      specialties: prefs.data?.specialties || [],
      usage: {
        analysis_count: analysisCount.count || 0,
        troubleshoot_count: troubleshootCount.count || 0,
        reference_count: referenceCount.count || 0,
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/profile
router.patch("/", auth, async (req, res) => {
  try {
    var userId = req.user.id;
    var { equipment_types, certifications, specialties, display_name } = req.body;

    if (display_name !== undefined) {
      var { error } = await supabasePublic.from("profiles").update({ display_name: display_name }).eq("id", userId);
      if (error) return res.status(500).json({ error: "Failed to update profile" });
    }

    if (equipment_types !== undefined || certifications !== undefined || specialties !== undefined) {
      var prefUpdates = { user_id: userId };
      if (equipment_types !== undefined) prefUpdates.equipment_types = equipment_types;
      if (certifications !== undefined) prefUpdates.certifications = certifications;
      if (specialties !== undefined) prefUpdates.specialties = specialties;

      var { error: prefError } = await supabaseApp.from("user_preferences").upsert(prefUpdates, { onConflict: "user_id" });
      if (prefError) return res.status(500).json({ error: "Failed to update preferences" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
