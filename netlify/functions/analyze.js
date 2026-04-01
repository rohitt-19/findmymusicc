const rateLimit = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

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

function getRawModelText(data) {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  const joined = parts
    .map((part) => {
      if (typeof part?.text === "string") return part.text;
      return "";
    })
    .join("\n")
    .trim();

  return joined;
}

function extractJsonCandidate(raw) {
  if (!raw) return "";

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1).trim();
  }

  return cleaned;
}

function tryParseModelJson(raw) {
  const attempts = [];

  attempts.push(raw);
  attempts.push(extractJsonCandidate(raw));

  for (const attempt of attempts) {
    if (!attempt) continue;

    try {
      return JSON.parse(attempt);
    } catch {}
  }

  return null;
}

function normalizeResult(parsed) {
  if (!parsed || typeof parsed !== "object") return null;

  const perfectSong = parsed.perfect_song || {};
  const moreSongs = Array.isArray(parsed.more_songs) ? parsed.more_songs : [];

  const normalized = {
    vibe_description:
      typeof parsed.vibe_description === "string"
        ? parsed.vibe_description.trim()
        : "",
    perfect_song: {
      title:
        typeof perfectSong.title === "string" ? perfectSong.title.trim() : "",
      artist:
        typeof perfectSong.artist === "string" ? perfectSong.artist.trim() : "",
      reason:
        typeof perfectSong.reason === "string"
          ? perfectSong.reason.trim()
          : "",
      tags: Array.isArray(perfectSong.tags)
        ? perfectSong.tags.filter((tag) => typeof tag === "string" && tag.trim())
        : [],
    },
    more_songs: moreSongs
      .filter((song) => song && typeof song === "object")
      .map((song) => ({
        title: typeof song.title === "string" ? song.title.trim() : "",
        artist: typeof song.artist === "string" ? song.artist.trim() : "",
        mood_tag:
          typeof song.mood_tag === "string" ? song.mood_tag.trim() : "",
      }))
      .filter((song) => song.title && song.artist),
  };

  if (
    parsed.outfit_analysis &&
    typeof parsed.outfit_analysis === "object"
  ) {
    normalized.outfit_analysis = {
      style_aesthetic:
        typeof parsed.outfit_analysis.style_aesthetic === "string"
          ? parsed.outfit_analysis.style_aesthetic.trim()
          : "",
      color_story:
        typeof parsed.outfit_analysis.color_story === "string"
          ? parsed.outfit_analysis.color_story.trim()
          : "",
      vibe_summary:
        typeof parsed.outfit_analysis.vibe_summary === "string"
          ? parsed.outfit_analysis.vibe_summary.trim()
          : "",
      style_tags: Array.isArray(parsed.outfit_analysis.style_tags)
        ? parsed.outfit_analysis.style_tags.filter(
            (tag) => typeof tag === "string" && tag.trim()
          )
        : [],
    };
  }

  if (
    !normalized.vibe_description ||
    !normalized.perfect_song.title ||
    !normalized.perfect_song.artist ||
    !normalized.perfect_song.reason ||
    normalized.more_songs.length === 0
  ) {
    return null;
  }

  return normalized;
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

  if (imageBase64.length > 14_000_000) {
    return jsonResponse(413, {
      error: "Image too large. Please use an image under 10MB.",
    });
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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

IMPORTANT:
- Return exactly one JSON object
- No markdown fences
- No intro text
- No notes after the JSON
- Use double quotes for all keys and string values`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
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
      console.error("Gemini API error:", JSON.stringify(data, null, 2));
      return jsonResponse(response.status, { error: msg });
    }

    const raw = getRawModelText(data);

    if (!raw) {
      console.error("Gemini returned no text:", JSON.stringify(data, null, 2));
      return jsonResponse(500, {
        error: "Empty response from AI. Please try again.",
      });
    }

    const parsed = tryParseModelJson(raw);

    if (!parsed) {
      console.error("Raw Gemini output that failed to parse:");
      console.error(raw);
      return jsonResponse(500, {
        error: "AI returned invalid JSON. Please try again.",
      });
    }

    const normalized = normalizeResult(parsed);

    if (!normalized) {
      console.error("Parsed Gemini JSON missing required fields:");
      console.error(JSON.stringify(parsed, null, 2));
      return jsonResponse(500, {
        error: "Incomplete response from AI. Please try again.",
      });
    }

    return jsonResponse(200, normalized);
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return jsonResponse(500, {
      error: "Failed to reach AI service. Check your connection.",
    });
  }
}
