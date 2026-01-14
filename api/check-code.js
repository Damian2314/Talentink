export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { language, code } = req.body || {};
    if (!language || typeof code !== "string") {
      return res.status(400).json({ error: "Missing language or code" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    }

    // короткий, дешёвый промпт: найти ошибки + короткий фикс
    const prompt = `
You are a strict code reviewer.
Language: ${language}

Task:
1) List issues (syntax errors, runtime bugs, obvious logic mistakes, security pitfalls).
2) If issues exist, provide a minimal corrected version.
3) If code is OK, say "OK" and give 1-3 small improvement tips.

Return format:
ISSUES:
- ...
FIXED_CODE:
\`\`\`
...
\`\`\`
NOTES:
- ...

Code:
\`\`\`
${code.slice(0, 20000)}
\`\`\`
`.trim();

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        input: prompt,
        // ограничиваем ответ, чтобы было дёшево
        max_output_tokens: 700,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: "OpenAI error", detail: text });
    }

    const data = await r.json();

    // у Responses API текст лежит в output_text
    const outputText = data.output_text || "";
    return res.status(200).json({ result: outputText });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e) });
  }
}
