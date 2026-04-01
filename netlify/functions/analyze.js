const rateLimit = new Map();
const WINDOW = 60 * 1000;
const MAX = 10;

function checkRate(ip) {
  const now = Date.now();
  const e = rateLimit.get(ip);
  if (!e || now - e.t > WINDOW) { rateLimit.set(ip, { count: 1, t: now }); return true; }
  if (e.count >= MAX) return false;
  e.count++; return true;
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const ip = event.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRate(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests. Wait a moment." }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "GEMINI_API_KEY not set on server." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  const { imageBase64, imageMime, prompt } = body;

  if (!imageBase64 || !imageMime || !prompt) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageBase64, imageMime, or prompt." }) };
  }
  if (!imageMime.startsWith("image/")) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid image type." }) };
  }
  if (imageBase64.length > 14_000_000) {
    return { statusCode: 413, headers, body: JSON.stringify({ error: "Image too large. Use an image under 10MB." }) };
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const geminiBody = {
    contents: [{
      parts: [
        { inline_data: { mime_type: imageMime, data: imageBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || "Gemini API error";
      return { statusCode: response.status, headers, body: JSON.stringify({ error: msg }) };
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Empty response from Gemini." }) };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "AI returned invalid JSON. Try again." }) };
    }

    if (!parsed.perfect_song || !parsed.more_songs) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Incomplete AI response. Try again." }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };

  } catch (err) {
    console.error("Gemini error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to reach Gemini. Check your connection." }) };
  }
};
