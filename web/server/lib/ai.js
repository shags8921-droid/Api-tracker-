/**
 * Optional Gemini client. Used only when GEMINI_API_KEY is configured.
 * - API key goes in a header (never the URL, so it cannot leak into logs/proxies).
 * - Hard timeout and output cap; any failure resolves to null so callers fall back to the rule-based engine.
 * - Model output is TEXT ONLY: it can never create actions, change data or widen permissions.
 */
export function createGeminiClient({ apiKey, model = 'gemini-2.5-flash', fetchImpl = globalThis.fetch, timeoutMs = 8000, maxChars = 2000 }) {
  if (!apiKey) return null;
  return {
    engine: `Google ${model}`,
    async generate({ system, prompt }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: String(prompt).slice(0, 1000) }] }],
            systemInstruction: { parts: [{ text: system }] }
          }),
          signal: controller.signal
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return typeof text === 'string' && text.trim() ? text.trim().slice(0, maxChars) : null;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
