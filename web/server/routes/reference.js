import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import auth from "../middleware/auth.js";
import { REFERENCE_SYSTEM_PROMPT } from "../prompts/reference.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "liftpal" } }
);

const anthropic = new Anthropic();

router.post("/query", auth, async (req, res) => {
  try {
    var userId = req.user.id;
    var { query } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "A query string is required" });
    }

    var searchTerm = query.trim();

    // Fuzzy search lift_reference table
    var matches = null;
    var searchError = null;
    try {
      var dbRes = await supabaseService
        .from("lift_reference")
        .select("*")
        .ilike("title", "%" + searchTerm + "%")
        .limit(5);
      matches = dbRes.data;
      searchError = dbRes.error;

      if (!searchError && (!matches || matches.length === 0)) {
        var res2 = await supabaseService
          .from("lift_reference")
          .select("*")
          .ilike("category", "%" + searchTerm + "%")
          .limit(5);
        matches = res2.data;
        searchError = res2.error;
      }

      if (!searchError && (!matches || matches.length === 0)) {
        var res3 = await supabaseService
          .from("lift_reference")
          .select("*")
          .ilike("equipment_type", "%" + searchTerm + "%")
          .limit(5);
        matches = res3.data;
        searchError = res3.error;
      }
    } catch (dbErr) {
      console.error("DB search error:", dbErr);
    }

    if (!searchError && matches && matches.length > 0) {
      var match = matches[0];
      await supabaseService
        .from("lift_reference")
        .update({ query_count: (match.query_count || 0) + 1 })
        .eq("id", match.id);
      return res.json({ result: match, source: "database" });
    }

    // SUBSCRIPTION GATE for AI lookups
    if (req.profile.subscription_tier === "free") {
      var startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      var { count } = await supabaseService
        .from("reference_queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 5) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 5 AI reference lookups per month. Upgrade to Pro for unlimited access.",
          limit: 5, used: count,
        });
      }
    }

    var message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: REFERENCE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });

    var rawText = message.content[0].text;

    var result;
    try {
      var jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse Claude response:", rawText);
      return res.status(500).json({ error: "Failed to parse reference result", raw: rawText });
    }

    // Store AI result for future lookups
    await supabaseService.from("lift_reference").insert({
      category: result.category || "general",
      title: result.title || searchTerm,
      equipment_type: result.equipment_type,
      system_type: result.system_type,
      specification: result.specification,
      content_json: result.content || result,
      source: "ai_generated",
      query_count: 1,
    }).catch(function (e) { console.error("Reference insert error:", e); });

    await supabaseService.from("reference_queries").insert({ user_id: userId, query: searchTerm, source: "ai" });

    return res.json({ result: result, source: "ai" });
  } catch (err) {
    console.error("Reference query error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
