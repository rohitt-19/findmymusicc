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
  for (const [key, value] of rateLimit.entries()) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW) {
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
  const parts = data?.candidates?.[0]?.content?.parts || [];

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLineValue(text, key) {
  const regex = new RegExp(`^${escapeRegex(key)}:\\s*(.*)$`, "mi");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function parsePipeList(value) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMoreSongs(text) {
  const lines = text.split(/\r?\n/);
  const songs = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) continue;

    if (line === "MORE_SONGS:") {
      inSection = true;
      continue;
    }

    if (!inSection) continue;

    const match = line.match(/^\d+\.\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*)$/);
    if (!match) continue;

    songs.push({
      title: match[1].trim(),
      artist: match[2].trim(),
      mood_tag: match[3].trim(),
    });
  }

  return songs.filter((song) => song.title && song.artist);
}

function normalizeResult(rawText) {
  const result = {
    vibe_description: getLineValue(rawText, "VIBE_DESCRIPTION"),
    perfect_song: {
      title: getLineValue(rawText, "PERFECT_SONG_TITLE"),
      artist: getLineValue(rawText, "PERFECT_SONG_ARTIST"),
      reason: getLineValue(rawText, "PERFECT_SONG_REASON"),
      tags: parsePipeList(getLineValue(rawText, "PERFECT_SONG_TAGS")),
    },
    more_songs: parseMoreSongs(rawText),
  };

  const style_aesthetic = getLineValue(rawText, "OUTFIT_STYLE_AESTHETIC");
  const color_story = getLineValue(rawText, "OUTFIT_COLOR_STORY");
  const vibe_summary = getLineValue(rawText, "OUTFIT_VIBE_SUMMARY");
  const style_tags = parsePipeList(getLineValue(rawText, "OUTFIT_STYLE_TAGS"));

  if (style_aesthetic || color_story || vibe_summary || style_tags.length) {
    result.outfit_analysis = {
      style_aesthetic,
      color_story,
      vibe_summary,
      style_tags,
    };
  }

  if (
    !result.vibe_description ||
    !result.perfect_song.title ||
    !result.perfect_song.artist ||
    !result.perfect_song.reason ||
    result.more_songs.length < 5
  ) {
    return null;
  }

  return result;
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
    return jsonResponse(400, {
      error: "Invalid image type.",
    });
  }

  if (imageBase64.length > 14_000_000) {
    return jsonResponse(413, {
      error: "Image too large. Please use an image under 10MB.",
    });
  }

  const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const formatInstructions = `
IGNORE ANY PREVIOUS OUTPUT FORMAT INSTRUCTIONS.

DO NOT RETURN JSON.
DO NOT USE MARKDOWN.
DO NOT USE CODE BLOCKS.
DO NOT ADD ANY EXTRA TEXT.

RETURN EXACTLY THIS PLAIN TEXT FORMAT:

VIBE_DESCRIPTION: 2 vivid sentences describing the mood and aesthetic
OUTFIT_STYLE_AESTHETIC: specific fashion aesthetic or blank if not relevant
OUTFIT_COLOR_STORY: 5 words or less or blank if not relevant
OUTFIT_VIBE_SUMMARY: 2 sentences or blank if not relevant
OUTFIT_STYLE_TAGS: tag1 | tag2 | tag3 | tag4 | tag5
PERFECT_SONG_TITLE: song title
PERFECT_SONG_ARTIST: artist name
PERFECT_SONG_REASON: 2-3 sentences explaining why it matches
PERFECT_SONG_TAGS: tag1 | tag2 | tag3
MORE_SONGS:
1. title | artist | mood tag
2. title | artist | mood tag
3. title | artist | mood tag
4. title | artist | mood tag
5. title | artist | mood tag

Rules:
- Every label must appear exactly once.
- Keep each label on one line.
- MORE_SONGS must contain exactly 5 songs.
- Do not write anything before VIBE_DESCRIPTION.
- Do not write anything after song 5.
`;

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
            text: `${prompt}\n\n${formatInstructions}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      thinkingConfig: {
        thinkingBudget: 0,
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
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || "Gemini API error";
      console.error("Gemini API error:", JSON.stringify(data, null, 2));
      return jsonResponse(response.status, { error: message });
    }

    const rawText = getRawModelText(data);

    if (!rawText) {
      console.error("Gemini returned no text:", JSON.stringify(data, null, 2));
      return jsonResponse(500, {
        error: "Empty response from AI. Please try again.",
      });
    }

    const normalized = normalizeResult(rawText);

    if (!normalized) {
      console.error("Gemini output could not be parsed:");
      console.error(rawText);
      return jsonResponse(500, {
        error: "AI returned invalid JSON. Please try again.",
      });
    }

    return jsonResponse(200, normalized);
  } catch (error) {
    console.error("Gemini fetch error:", error);
    return jsonResponse(500, {
      error: "Failed to reach AI service. Check your connection.",
    });
  }
}
