import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "liftpal" } }
);

// GET /history — return all analyses and troubleshoot sessions
router.get("/", auth, async (req, res) => {
  try {
    var userId = req.user.id;
    var limit = req.profile.subscription_tier === "pro" ? 100 : 10;

    var [analyses, sessions] = await Promise.all([
      supabaseService
        .from("lift_analyses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseService
        .from("troubleshoot_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    return res.json({
      inspections: analyses.data || [],
      troubleshoot_sessions: sessions.data || [],
    });
  } catch (err) {
    console.error("History fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/analysis/:id
router.patch("/analysis/:id", auth, async (req, res) => {
  try {
    var updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.saved !== undefined) updates.saved = req.body.saved;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields" });

    var { error } = await supabaseService
      .from("lift_analyses")
      .update(updates)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: "Failed to update" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Analysis update error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /history/analysis/:id
router.delete("/analysis/:id", auth, async (req, res) => {
  try {
    var { error } = await supabaseService
      .from("lift_analyses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: "Failed to delete" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Analysis delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/troubleshoot/:id
router.patch("/troubleshoot/:id", auth, async (req, res) => {
  try {
    var updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields" });

    var { error } = await supabaseService
      .from("troubleshoot_sessions")
      .update(updates)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: "Failed to update" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Troubleshoot update error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/troubleshoot/:id/resolve
router.patch("/troubleshoot/:id/resolve", auth, async (req, res) => {
  try {
    var { error } = await supabaseService
      .from("troubleshoot_sessions")
      .update({ resolved: true })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: "Failed to resolve" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Troubleshoot resolve error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /history/troubleshoot/:id
router.delete("/troubleshoot/:id", auth, async (req, res) => {
  try {
    var { error } = await supabaseService
      .from("troubleshoot_sessions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: "Failed to delete" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Troubleshoot delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
