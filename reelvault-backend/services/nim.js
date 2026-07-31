/* ReelVault — NVIDIA NIM (free tier): tagging + AI chat + usage stats */
const { CFG, TOPICS } = require("../config");

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "meta/llama-3.1-8b-instruct";

/* ---- tiny in-memory usage counter (survives until Render redeploys) ---- */
const usage = { total: 0, chat: 0, tag: 0, errors: 0, since: new Date().toISOString(), lastError: "" };
const stats = () => ({ ...usage, model: MODEL, configured: !!CFG.NIM_KEY });

async function callNIM(messages, { maxTokens = 160, temperature = 0.15, timeoutMs = 12000 } = {}) {
  if (!CFG.NIM_KEY) return null;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CFG.NIM_KEY}` },
      body: JSON.stringify({ model: MODEL, temperature, max_tokens: maxTokens, messages }),
      signal: ctrl.signal,
    });
    if (!res.ok) { usage.errors++; usage.lastError = `HTTP ${res.status}`; return null; }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    usage.errors++; usage.lastError = e.name === "AbortError" ? "timeout" : e.message;
    return null;
  } finally { clearTimeout(to); }
}

async function tagCaption(caption) {
  if (!CFG.NIM_KEY || !caption) return null;
  const list = TOPICS.map((t) => t.label).join(", ");
  usage.total++; usage.tag++;
  const txt = await callNIM([
    { role: "system", content:
      "You classify short social-media video captions. Reply ONLY with compact JSON: " +
      '{"topic":"<one of the allowed topics>","confidence":<0-1>,"tags":["3-5 lowercase tags"]}. ' +
      `Allowed topics: ${list}. If unsure, choose "Misc / Other" with low confidence.` },
    { role: "user", content: caption.slice(0, 500) },
  ], { maxTokens: 160, temperature: 0.15 });
  if (!txt) return null;
  try {
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const topic = TOPICS.some((t) => t.label === parsed.topic) ? parsed.topic : "Misc / Other";
    const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map((t) => String(t).toLowerCase().replace(/[^a-z0-9 \-]/g, "").trim()).filter(Boolean) : [];
    return { topic, confidence: +parsed.confidence || 0, tags };
  } catch { return null; }
}

/* ---- AI Chat (dashboard chatbot) ---- */
async function chat(messages, context) {
  if (!CFG.NIM_KEY) return null;
  usage.total++; usage.chat++;
  const sys =
    "You are ReelVault AI — a friendly assistant inside a personal video-library app. " +
    "The user saves Instagram/Facebook/YouTube/X videos, auto-downloads them to Google Drive, " +
    "organizes them by topic and rating (Very Useful / Useful / Average), tracks downloads in a Google Sheet, " +
    "and stores influencer-shared workflows in a Vault. " +
    (context ? `Live app stats right now: ${context}. ` : "") +
    "Answer helpfully in 2-5 short sentences. The user speaks Hinglish sometimes — you may answer in simple English or Hinglish matching their tone. " +
    "If asked about app usage, explain features briefly. Never invent statistics not given to you.";
  const safe = Array.isArray(messages) ? messages.slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 1000) })) : [];
  return await callNIM([{ role: "system", content: sys }, ...safe], { maxTokens: 300, temperature: 0.6, timeoutMs: 20000 });
}

module.exports = { tagCaption, chat, stats };
