// Generate and seed training questions for LiftPal via Claude API
// Run: node seeds/seedQuestions.js [CERT_LEVEL]

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "liftpal" } }
);

const anthropic = new Anthropic();

const SYSTEM_PROMPT = "You are an expert elevator and lift certification instructor with 20+ years of experience training and examining elevator technicians at all levels. You have deep knowledge of ASME A17.1/CSA B44, ASME A17.2, ASME A17.3, ADA accessibility requirements, OSHA regulations, and state licensing exams.\n\nGenerate multiple choice exam questions for the {cert_level} certification exam.\n\nModule: {module_title}\nTopic: {specific_topic}\nDifficulty level: {difficulty}\nNumber of questions needed: {count}\n\nDIFFICULTY DEFINITIONS:\nfoundation — recall of key facts, standard sections, and specifications.\napplied — applying knowledge to a realistic field scenario or performing a calculation.\nanalysis — interpreting test results, diagnosing a problem, or evaluating competing options.\n\nReturn ONLY a valid JSON array. No preamble, no markdown, no explanation outside the JSON. Each element:\n{\n  \"question_text\": \"string\",\n  \"option_a\": \"string\",\n  \"option_b\": \"string\",\n  \"option_c\": \"string\",\n  \"option_d\": \"string\",\n  \"correct_answer\": \"A | B | C | D\",\n  \"explanation\": \"string — min 80 words, explains correct AND why each wrong answer is wrong\",\n  \"standard_reference\": \"string or null\",\n  \"difficulty\": \"foundation | applied | analysis\",\n  \"topic\": \"string\"\n}\n\nCRITICAL RULES:\n- Wrong answers must be plausible — use common misconceptions, close numerical values, or real alternatives\n- Never use \"none of the above\" as a filler\n- Applied/analysis questions must describe realistic field scenarios\n- Use actual standard sections, table values, and ASME A17.1 references\n- Each question must be independently answerable\n- Do not duplicate questions — vary the scenario or angle";

async function generateQuestions(certLevel, moduleTitle, topics, count) {
  var foundation = Math.round(count * 0.4);
  var applied = Math.round(count * 0.4);
  var analysis = count - foundation - applied;
  var allQuestions = [];

  var diffs = [["foundation", foundation], ["applied", applied], ["analysis", analysis]];
  for (var d = 0; d < diffs.length; d++) {
    var difficulty = diffs[d][0];
    var diffCount = diffs[d][1];
    if (diffCount <= 0) continue;
    var topicStr = topics.slice(0, 5).join(", ");
    var prompt = SYSTEM_PROMPT
      .replace("{cert_level}", certLevel).replace("{module_title}", moduleTitle)
      .replace("{specific_topic}", topicStr).replace("{difficulty}", difficulty).replace("{count}", String(diffCount));

    var retries = 0;
    while (retries < 2) {
      try {
        var response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514", max_tokens: 4096,
          system: prompt,
          messages: [{ role: "user", content: "Generate " + diffCount + " " + difficulty + "-level questions for " + moduleTitle + ". Topics: " + topicStr }],
        });
        var rawText = response.content[0].text;
        var stripped = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
        var parsed;
        try { parsed = JSON.parse(stripped); }
        catch { var s = stripped.indexOf("["), e = stripped.lastIndexOf("]"); if (s >= 0 && e > s) parsed = JSON.parse(stripped.substring(s, e + 1)); else throw new Error("No JSON array"); }
        if (Array.isArray(parsed)) { allQuestions = allQuestions.concat(parsed); break; }
      } catch (err) {
        retries++;
        if (retries >= 2) { console.log("    [FAIL] " + difficulty + " for " + moduleTitle + ": " + err.message); break; }
        console.log("    [retry] " + difficulty + " attempt " + retries + "...");
        await new Promise(function (r) { setTimeout(r, 2000); });
      }
    }
  }
  return allQuestions;
}

async function main() {
  var certFilter = process.argv[2] || null;
  console.log("=== Seeding LiftPal Training Questions ===\n");

  var { data: modules, error } = await supabase.from("training_modules").select("*").order("cert_level").order("module_number");
  if (error) { console.error("Failed to fetch modules:", error.message); return; }

  var totalSeeded = 0;
  for (var mod of modules) {
    if (certFilter && mod.cert_level !== certFilter) continue;

    var { count: existingCount } = await supabase.from("training_questions").select("*", { count: "exact", head: true }).eq("module_id", mod.id);
    var needed = 20 - (existingCount || 0);

    if (needed <= 0) { console.log("[skip] " + mod.cert_level + " M" + mod.module_number + ": " + mod.title + " — " + existingCount + " questions"); continue; }

    console.log("[gen] " + mod.cert_level + " M" + mod.module_number + ": " + mod.title + " — " + needed + " questions...");
    var questions = await generateQuestions(mod.cert_level, mod.title, mod.topic_list, needed);

    if (questions.length === 0) { console.log("  [WARN] None generated"); continue; }

    for (var q of questions) {
      var { error: insertErr } = await supabase.from("training_questions").insert({
        module_id: mod.id, cert_level: mod.cert_level, topic: q.topic || mod.title,
        question_text: q.question_text, option_a: q.option_a, option_b: q.option_b,
        option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer,
        explanation: q.explanation, standard_reference: q.standard_reference || null,
        difficulty: q.difficulty,
      });
      if (insertErr) console.error("    [ERR] " + insertErr.message);
    }
    totalSeeded += questions.length;
    console.log("  [ok] " + questions.length + " questions");
  }
  console.log("\n=== Done — " + totalSeeded + " questions seeded ===");
}

main().catch(console.error);
