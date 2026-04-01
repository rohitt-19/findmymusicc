// Rate limiting: simple in-memory store (resets on cold start)
// For production, use Vercel KV or Upstash Redis
const rateLimit = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per IP per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Clean up old entries every 5 minutes to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimit.entries()) {
    if (now - val.windowStart > RATE_LIMIT_WINDOW) rateLimit.delete(key);
  }
}, 5 * 60 * 1000);

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }

  // API key check
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server." });
  }

  const { imageBase64, imageMime, prompt } = req.body;

  // Input validation
  if (!imageBase64 || !imageMime || !prompt) {
    return res.status(400).json({ error: "Missing required fields: imageBase64, imageMime, prompt." });
  }
  if (!imageMime.startsWith("image/")) {
    return res.status(400).json({ error: "Invalid image type." });
  }
  // Rough size check: base64 of 10MB image ~ 13.3M chars
  if (imageBase64.length > 14_000_000) {
    return res.status(413).json({ error: "Image too large. Please use an image under 10MB." });
  }

  // Gemini API call — gemini-1.5-flash is free tier, fast, supports vision
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const geminiBody = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: imageMime,
            data: imageBase64,
          },
        },
        {
          text: prompt,
        },
      ],
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
      responseMimeType: "application/json", // Ask Gemini to return JSON directly
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
      // Surface Gemini's error message clearly
      const msg = data?.error?.message || "Gemini API error";
      return res.status(response.status).json({ error: msg });
    }

    // Extract the text from Gemini's response structure
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return res.status(500).json({ error: "Empty response from Gemini." });
    }

    // Parse and validate JSON
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      return res.status(500).json({ error: "AI returned invalid JSON. Please try again." });
    }

    // Validate required fields exist
    if (!parsed.perfect_song || !parsed.more_songs) {
      return res.status(500).json({ error: "Incomplete response from AI. Please try again." });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Gemini fetch error:", err);
    return res.status(500).json({ error: "Failed to reach AI service. Check your connection." });
  }
}
