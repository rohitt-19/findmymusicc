// Rate limiting: simple in-memory store (resets on cold start)
// For production, use Netlify Blobs, Upstash Redis, or another shared store.
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

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Clean up old entries every 5 minutes to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimit.entries()) {
    if (now - val.windowStart > RATE_LIMIT_WINDOW) {
      rateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
    body: JSON.stringify(body),
  };
}

function extractJsonText(apiData) {
  const parts = apiData?.candidates?.[0]?.content?.parts || [];

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .replace(/```json|```/gi, "")
    .trim();
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const ip =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return jsonResponse(429, {
      error: "Too many requests. Please wait a moment.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      error: "API key not configured on server.",
    });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, {
      error: "Invalid JSON request body.",
    });
  }

  const { imageBase64, imageMime, prompt } = requestBody;

  if (!imageBase64 || !imageMime || !prompt) {
    return jsonResponse(400, {
      error: "Missing required fields: imageBase64, imageMime, prompt.",
    });
  }

  if (!imageMime.startsWith("image/")) {
    return jsonResponse(400, { error: "Invalid image type." });
  }

  // Rough size check: base64 of 10MB image is about 13.3M chars
  if (imageBase64.length > 14_000_000) {
    return jsonResponse(413, {
      error: "Image too large. Please use an image under 10MB.",
    });
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const geminiBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: imageMime,
              data: imageBase64,
            },
          },
          {
            text: `${prompt}

Return exactly one valid JSON object.
Do not wrap it in markdown fences.
Do not add any explanation before or after the JSON.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          vibe_description: {
            type: "STRING",
          },
          outfit_analysis: {
            type: "OBJECT",
            properties: {
              style_aesthetic: { type: "STRING" },
              color_story: { type: "STRING" },
              vibe_summary: { type: "STRING" },
              style_tags: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
          },
          perfect_song: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              artist: { type: "STRING" },
              reason: { type: "STRING" },
              tags: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: ["title", "artist", "reason", "tags"],
          },
          more_songs: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                artist: { type: "STRING" },
                mood_tag: { type: "STRING" },
              },
              required: ["title", "artist", "mood_tag"],
            },
          },
        },
        required: ["vibe_description", "perfect_song", "more_songs"],
      },
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || "Gemini API error";
      console.error("Gemini API error:", data);
      return jsonResponse(response.status, { error: msg });
    }

    const raw = extractJsonText(data);

    if (!raw) {
      console.error("Gemini empty response:", JSON.stringify(data, null, 2));
      return jsonResponse(500, {
        error: "Empty response from Gemini.",
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Gemini JSON parse failed:", raw);
      return jsonResponse(500, {
        error: "AI returned invalid JSON. Please try again.",
      });
    }

    if (
      !parsed?.vibe_description ||
      !parsed?.perfect_song?.title ||
      !parsed?.perfect_song?.artist ||
      !parsed?.perfect_song?.reason ||
      !Array.isArray(parsed?.perfect_song?.tags) ||
      !Array.isArray(parsed?.more_songs)
    ) {
      console.error("Gemini incomplete response:", parsed);
      return jsonResponse(500, {
        error: "Incomplete response from AI. Please try again.",
      });
    }

    return jsonResponse(200, parsed);
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return jsonResponse(500, {
      error: "Failed to reach AI service. Check your connection.",
    });
  }
}
