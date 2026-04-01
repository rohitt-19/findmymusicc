const rateLimit = new Map();
const WINDOW = 60 * 1000;
const MAX = 10;

function checkRate(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now - entry.t > WINDOW) {
    rateLimit.set(ip, { count: 1, t: now });
    return true;
  }

  if (entry.count >= MAX) return false;
  entry.count += 1;
  return true;
}

function makeResponse(headers, statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function getRawText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

function extractJsonChunk(raw) {
  if (!raw) return "";

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^\uFEFF/, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1).trim();
  }

  return cleaned;
}

function repairCommonJsonIssues(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/\t/g, " ");
}

function tryParseJson(raw) {
  const base = extractJsonChunk(raw);
  const attempts = [
    raw,
    base,
    repairCommonJsonIssues(base),
  ];

  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      return JSON.parse(attempt);
    } catch {}
  }

  return null;
}

function normalizeTags(tags, fallback) {
  if (Array.isArray(tags)) {
    const clean = tags
      .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
      .filter(Boolean);
    if (clean.length) return clean.slice(0, 5);
  }
  return fallback;
}

function normalizeSongs(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((song) => {
      if (!song || typeof song !== "object") return null;
      return {
        title: typeof song.title === "string" ? song.title.trim() : "",
        artist: typeof song.artist === "string" ? song.artist.trim() : "",
        mood_tag:
          typeof song.mood_tag === "string"
            ? song.mood_tag.trim()
            : typeof song.mood === "string"
            ? song.mood.trim()
            : "",
      };
    })
    .filter((song) => song && song.title && song.artist)
    .slice(0, 5);
}

function normalizeTrending(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (typeof item === "string") {
        const artist = item.trim();
        return artist ? { artist, reason: "" } : null;
      }

      if (!item || typeof item !== "object") return null;

      const artist =
        typeof item.artist === "string"
          ? item.artist.trim()
          : typeof item.name === "string"
          ? item.name.trim()
          : "";

      const reason =
        typeof item.reason === "string" ? item.reason.trim() : "";

      return artist ? { artist, reason } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeResult(parsed) {
  if (!parsed || typeof parsed !== "object") return null;

  const perfectSong = parsed.perfect_song || parsed.perfectSong || {};
  const moreSongs = parsed.more_songs || parsed.moreSongs || [];
  const trendingNow = parsed.trending_now || parsed.trendingNow || [];

  const result = {
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
      tags: normalizeTags(perfectSong.tags, ["vibe", "music", "match"]),
    },
    more_songs: normalizeSongs(moreSongs),
    trending_now: normalizeTrending(trendingNow),
  };

  const outfit = parsed.outfit_analysis || parsed.outfitAnalysis;
  if (outfit && typeof outfit === "object") {
    result.outfit_analysis = {
      style_aesthetic:
        typeof outfit.style_aesthetic === "string"
          ? outfit.style_aesthetic.trim()
          : typeof outfit.styleAesthetic === "string"
          ? outfit.styleAesthetic.trim()
          : "",
      color_story:
        typeof outfit.color_story === "string"
          ? outfit.color_story.trim()
          : typeof outfit.colorStory === "string"
          ? outfit.colorStory.trim()
          : "",
      vibe_summary:
        typeof outfit.vibe_summary === "string"
          ? outfit.vibe_summary.trim()
          : typeof outfit.vibeSummary === "string"
          ? outfit.vibeSummary.trim()
          : "",
      style_tags: normalizeTags(outfit.style_tags || outfit.styleTags, []),
    };
  }

  if (
    !result.vibe_description ||
    !result.perfect_song.title ||
    !result.perfect_song.artist ||
    !result.perfect_song.reason ||
    result.more_songs.length === 0
  ) {
    return null;
  }

  if (result.trending_now.length === 0) {
    result.trending_now = result.more_songs.slice(0, 5).map((song) => ({
      artist: song.artist,
      reason: "Matches this vibe.",
    }));
  }

  return result;
}

function buildEmergencyResult(rawText) {
  const preview = rawText
    ? rawText.replace(/\s+/g, " ").trim().slice(0, 220)
    : "A moody, stylish, image-driven music match.";

  return {
    vibe_description: preview || "A moody, stylish, image-driven music match.",
    perfect_song: {
      title: "Sunflower",
      artist: "Post Malone & Swae Lee",
      reason:
        "The AI response came back in a broken format, so this is a safe fallback result while keeping the app working. The overall vibe still reads as cinematic, warm, and instantly playlist-friendly.",
      tags: ["cinematic", "warm", "vibey"],
    },
    more_songs: [
      { title: "Electric Feel", artist: "MGMT", mood_tag: "dreamy" },
      { title: "Sweater Weather", artist: "The Neighbourhood", mood_tag: "moody" },
      { title: "Midnight City", artist: "M83", mood_tag: "neon" },
      { title: "After Dark", artist: "Mr.Kitty", mood_tag: "night" },
      { title: "Golden", artist: "Harry Styles", mood_tag: "glow" },
    ],
    trending_now: [
      { artist: "The Weeknd", reason: "Fits glossy late-night energy." },
      { artist: "Billie Eilish", reason: "Fits intimate moody visuals." },
      { artist: "SZA", reason: "Fits soft modern emotional texture." },
      { artist: "Lana Del Rey", reason: "Fits cinematic melancholy." },
      { artist: "Arctic Monkeys", reason: "Fits stylish cool-toned atmosphere." },
    ],
  };
}

async function callGemini(apiKey, body) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { response, data };
}

async function repairJsonWithGemini(apiKey, rawText) {
  const repairBody = {
    contents: [
      {
        parts: [
          {
            text: `Convert the following broken AI output into ONE valid JSON object only.

Required JSON shape:
{
  "vibe_description": "string",
  "outfit_analysis": {
    "style_aesthetic": "string",
    "color_story": "string",
    "vibe_summary": "string",
    "style_tags": ["string"]
  },
  "perfect_song": {
    "title": "string",
    "artist": "string",
    "reason": "string",
    "tags": ["string"]
  },
  "more_songs": [
    { "title": "string", "artist": "string", "mood_tag": "string" }
  ],
  "trending_now": [
    { "artist": "string", "reason": "string" }
  ]
}

Rules:
- Return valid JSON only
- No markdown
- If outfit info is missing, omit outfit_analysis
- Ensure more_songs has 5 items when possible
- Ensure trending_now has 5 items when possible

Broken output:
${rawText}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1400,
      thinkingConfig: {
        thinkingBudget: 0,
      },
      responseMimeType: "application/json",
    },
  };

  const { response, data } = await callGemini(apiKey, repairBody);
  if (!response.ok) return null;

  const repairedRaw = getRawText(data);
  return tryParseJson(repairedRaw);
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
    return makeResponse(headers, 405, { error: "Method not allowed" });
  }

  const ip = event.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRate(ip)) {
    return makeResponse(headers, 429, {
      error: "Too many requests. Wait a moment.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return makeResponse(headers, 500, {
      error: "GEMINI_API_KEY not set on server.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return makeResponse(headers, 400, { error: "Invalid JSON body." });
  }

  const { imageBase64, imageMime, prompt } = body;

  if (!imageBase64 || !imageMime || !prompt) {
    return makeResponse(headers, 400, {
      error: "Missing imageBase64, imageMime, or prompt.",
    });
  }

  if (!imageMime.startsWith("image/")) {
    return makeResponse(headers, 400, { error: "Invalid image type." });
  }

  if (imageBase64.length > 14_000_000) {
    return makeResponse(headers, 413, {
      error: "Image too large. Use an image under 10MB.",
    });
  }

  const primaryBody = {
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
- Return one valid JSON object only
- No markdown fences
- No explanation text
- Use double quotes
- Include keys: vibe_description, perfect_song, more_songs, trending_now
- perfect_song must include title, artist, reason, tags
- more_songs must be an array of 5 objects with title, artist, mood_tag
- trending_now must be an array of 5 objects with artist, reason`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1500,
      thinkingConfig: {
        thinkingBudget: 0,
      },
      responseMimeType: "application/json",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const { response, data } = await callGemini(apiKey, primaryBody);

    if (!response.ok) {
      const msg = data?.error?.message || "Gemini API error";

      if (
        response.status === 429 ||
        /quota|rate limit|exceeded|resource has been exhausted/i.test(msg)
      ) {
        return makeResponse(headers, 429, {
          error: "AI is temporarily busy or out of quota. Please try again in a minute.",
        });
      }

      return makeResponse(headers, response.status, { error: msg });
    }

    const raw = getRawText(data);
    if (!raw) {
      return makeResponse(headers, 500, { error: "Empty response from Gemini." });
    }

    let parsed = tryParseJson(raw);

    if (!parsed) {
      parsed = await repairJsonWithGemini(apiKey, raw);
    }

    parsed = normalizeResult(parsed);

    if (!parsed) {
      console.error("Primary Gemini raw output:");
      console.error(raw);

      const emergency = buildEmergencyResult(raw);
      return makeResponse(headers, 200, emergency);
    }

    return makeResponse(headers, 200, parsed);
  } catch (err) {
    console.error("Gemini error:", err);
    return makeResponse(headers, 500, {
      error: "Failed to reach Gemini. Check your connection.",
    });
  }
};
