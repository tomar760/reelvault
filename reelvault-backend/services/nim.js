/* ReelVault — NVIDIA NIM (free tier) tagging: caption -> topic + tags */
const { CFG, TOPICS } = require("../config");

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "meta/llama-3.1-8b-instruct";

async function tagCaption(caption) {
  if (!CFG.NIM_KEY || !caption) return null;
  const list = TOPICS.map((t) => t.label).join(", ");
  const body = {
    model: MODEL,
    temperature: 0.15,
    max_tokens: 160,
    messages: [
      { role: "system", content:
        "You classify short social-media video captions. Reply ONLY with compact JSON: " +
        '{"topic":"<one of the allowed topics>","confidence":<0-1>,"tags":["3-5 lowercase tags"]}. ' +
        `Allowed topics: ${list}. If unsure, choose "Misc / Other" with low confidence.` },
      { role: "user", content: caption.slice(0, 500) },
    ],
  };
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CFG.NIM_KEY}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content || "";
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const topic = TOPICS.some((t) => t.label === parsed.topic) ? parsed.topic : "Misc / Other";
    const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map((t) => String(t).toLowerCase().replace(/[^a-z0-9 \-]/g, "").trim()).filter(Boolean) : [];
    return { topic, confidence: +parsed.confidence || 0, tags };
  } catch (e) {
    console.error("NIM tagging skipped:", e.message);
    return null;
  }
}

module.exports = { tagCaption };
