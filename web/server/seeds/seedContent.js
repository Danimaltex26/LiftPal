// Generate and seed training content for LiftPal via Claude API
// Run: node seeds/seedContent.js [CERT_LEVEL]

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "liftpal" } }
);

const anthropic = new Anthropic();

const SYSTEM_PROMPT = "You are an expert elevator and lift certification instructor with 20+ years of experience training elevator technicians at all levels from apprentice through QEI (Qualified Elevator Inspector) and senior technician. You have deep knowledge of ASME A17.1/CSA B44, ASME A17.2, ASME A17.3, ADA accessibility requirements, OSHA regulations, and all major elevator manufacturer systems.\n\nGenerate learning content sections for a training module. Each section should teach a specific concept in depth — written for working elevator technicians, not academics. Use real-world examples, actual standard section references, and practical field context.\n\nReturn ONLY a valid JSON array with 5 sections. No preamble, no markdown fences, no explanation outside the JSON. Each element:\n{\n  \"section_number\": 1,\n  \"section_title\": \"string — clear, descriptive title\",\n  \"content_type\": \"concept | example | formula | tip\",\n  \"content_text\": \"string — 150-300 words of instructional content. Use real standard sections, actual values, and practical explanations. Write in a direct, professional tone.\",\n  \"standard_reference\": \"string or null — e.g. ASME A17.1 Rule 2.26.1, ADA Section 4.10\"\n}\n\nCONTENT TYPE GUIDELINES:\n- concept: Core instructional material explaining how something works, why it matters, and key code values\n- example: A realistic field scenario showing the concept in practice — include specific measurements, components, or procedures\n- formula: Mathematical relationships with worked examples using real values (safety factors, rope calculations, door timing)\n- tip: Practical field advice that comes from experience — things a technician might not learn in a classroom\n\nRULES:\n- Every section must be independently useful — no \"as we discussed\" references\n- Use actual standard section numbers and table references from the current code cycle\n- Include specific measurements, tolerances, component data, or equipment where relevant\n- Write for comprehension, not memorization — explain the WHY behind each code requirement\n- Section 1 should introduce the core concept\n- Section 5 should be a practical tip or field example that ties everything together\n- Vary content_type across sections — don't make all 5 the same type";

async function generateContent(certLevel, moduleTitle, topicList) {
  var topicStr = topicList.join(", ");
  var userPrompt = "Generate 5 learning content sections for the " + certLevel + " certification module: \"" + moduleTitle + "\"\n\nTopics to cover: " + topicStr + "\n\nWrite content that would prepare an elevator technician for the " + certLevel + " certification exam while giving them practical field knowledge.";

  var retries = 0;
  while (retries < 3) {
    try {
      var response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      var rawText = response.content[0].text;
      var stripped = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

      var parsed;
      try {
        parsed = JSON.parse(stripped);
      } catch {
        var start = stripped.indexOf("[");
        var end = stripped.lastIndexOf("]");
        if (start >= 0 && end > start) parsed = JSON.parse(stripped.substring(start, end + 1));
        else throw new Error("No JSON array found");
      }

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty array");
      return parsed;
    } catch (err) {
      retries++;
      if (retries >= 3) { console.error("    [FAIL] " + certLevel + " " + moduleTitle + ": " + err.message); return null; }
      console.warn("    [retry] attempt " + retries + "...");
      await new Promise(function (r) { setTimeout(r, 2000); });
    }
  }
}

async function main() {
  var certFilter = process.argv[2] || null;
  console.log("=== Seeding LiftPal Training Content ===\n");

  var { data: modules, error } = await supabase
    .from("training_modules")
    .select("*")
    .order("cert_level").order("module_number");

  if (error) { console.error("Failed to fetch modules:", error.message); return; }

  var totalSeeded = 0;

  for (var mod of modules) {
    if (certFilter && mod.cert_level !== certFilter) continue;

    var { count } = await supabase
      .from("training_content")
      .select("*", { count: "exact", head: true })
      .eq("module_id", mod.id);

    if (count > 0) {
      console.log("[skip] " + mod.cert_level + " M" + mod.module_number + ": " + mod.title + " — " + count + " sections");
      continue;
    }

    console.log("[gen] " + mod.cert_level + " M" + mod.module_number + ": " + mod.title + "...");
    var sections = await generateContent(mod.cert_level, mod.title, mod.topic_list);
    if (!sections) continue;

    for (var s of sections) {
      var { error: insertErr } = await supabase.from("training_content").insert({
        module_id: mod.id,
        section_number: s.section_number,
        section_title: s.section_title,
        content_type: s.content_type,
        content_text: s.content_text,
        standard_reference: s.standard_reference || null,
      });
      if (insertErr) console.error("    [ERR] section " + s.section_number + ": " + insertErr.message);
    }
    totalSeeded += sections.length;
    console.log("  [ok] " + sections.length + " sections");
  }

  console.log("\n=== Done — " + totalSeeded + " sections seeded ===");
}

main().catch(console.error);
