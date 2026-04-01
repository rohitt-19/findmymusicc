const rateLimit = new Map();
const WINDOW = 60 * 1000;
const MAX = 10;

function checkRate(ip) {
  const now = Date.now();
  const e = rateLimit.get(ip);

  if (!e || now - e.t > WINDOW) {
    rateLimit.set(ip, { count: 1, t: now });
    return true;
  }

  if (e.count >= MAX) return false;
  e.count++;
  return true;
}

function response(headers, statusCode, body) {
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

function tryParseJson(raw) {
  const candidates = [
    raw,
    extractJsonChunk(raw),
    extractJsonChunk(raw)
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\t/g, " "),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
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
  return (value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseListSection(text, sectionName, mapper) {
  const lines = text.split(/\r?\n/);
  const results = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === `${sectionName}:`) {
      inSection = true;
      continue;
    }

    if (!inSection) continue;

    if (/^[A-Z_]+:\s*/.test(line)) break;

    const mapped = mapper(line);
    if (mapped) results.push(mapped);
  }

  return results;
}

function parseMoreSongs(text) {
  return parseListSection(text, "MORE_SONGS", (line) => {
    const match = line.match(/^\d+\.\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*)$/);
    if (!match) return null;

    const song = {
      title: match[1].trim(),
      artist: match[2].trim(),
      mood_tag: match[3].trim(),
    };

    return song.title && song.artist ? song : null;
  });
}

function parseTrendingNow(text) {
  return parseListSection(text, "TRENDING_NOW", (line) => {
    const richMatch = line.match(/^\d+\.\s*(.*?)\s*\|\s*(.*)$/);
    if (richMatch) {
      const item = {
        artist: richMatch[1].trim(),
        reason: richMatch[2].trim(),
      };
      return item.artist ? item : null;
    }

    const simpleMatch = line.match(/^\d+\.\s*(.*)$/);
    if (simpleMatch) {
      const item = {
        artist: simpleMatch[1].trim(),
        reason: "",
      };
      return item.artist ? item : null;
    }

    return null;
  });
}

function parseFallbackText(raw) {
  if (!raw) return null;

  const parsed = {
    vibe_description: getLineValue(raw, "VIBE_DESCRIPTION"),
    perfect_song: {
      title: getLineValue(raw, "PERFECT_SONG_TITLE"),
      artist: getLineValue(raw, "PERFECT_SONG_ARTIST"),
      reason: getLineValue(raw, "PERFECT_SONG_REASON"),
      tags: parsePipeList(getLineValue(raw, "PERFECT_SONG_TAGS")),
    },
    more_songs: parseMoreSongs(raw),
    trending_now: parseTrendingNow(raw),
  };

  const style_aesthetic = getLineValue(raw, "OUTFIT_STYLE_AESTHETIC");
  const color_story = getLineValue(raw, "OUTFIT_COLOR_STORY");
  const vibe_summary = getLineValue(raw, "OUTFIT_VIBE_SUMMARY");
  const style_tags = parsePipeList(getLineValue(raw, "OUTFIT_STYLE_TAGS"));

  if (style_aesthetic || color_story || vibe_summary || style_tags.length) {
    parsed.outfit_analysis = {
      style_aesthetic,
      color_story,
      vibe_summary,
      style_tags,
    };
  }

  return parsed;
}

function normalize(parsed) {
  if (!parsed || typeof parsed !== "object") return null;

  const perfectSong = parsed.perfect_song || parsed.perfectSong || {};
  const moreSongs = parsed.more_songs || parsed.moreSongs || [];
  const trendingNow = parsed.trending_now || parsed.trendingNow || [];

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
    more_songs: Array.isArray(moreSongs)
      ? moreSongs
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
      : [],
    trending_now: Array.isArray(trendingNow)
      ? trendingNow
          .map((item) => {
            if (typeof item === "string") {
              return { artist: item.trim(), reason: "" };
            }
            if (!item || typeof item !== "object") return null;
            return {
              artist:
                typeof item.artist === "string"
                  ? item.artist.trim()
                  : typeof item.name === "string"
                  ? item.name.trim()
                  : "",
              reason:
                typeof item.reason === "string" ? item.reason.trim() : "",
            };
          })
          .filter((item) => item && item.artist)
      : [],
  };

  const outfit = parsed.outfit_analysis || parsed.outfitAnalysis;
  if (outfit && typeof outfit === "object") {
    normalized.outfit_analysis = {
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
      style_tags: Array.isArray(outfit.style_tags)
        ? outfit.style_tags.filter((tag) => typeof tag === "string" && tag.trim())
        : Array.isArray(outfit.styleTags)
        ? outfit.styleTags.filter((tag) => typeof tag === "string" && tag.trim())
        : [],
    };
  }

  if (
    !normalized.vibe_description ||
    !normalized.perfect_song.title ||
    !normalized.perfect_song.artist ||
    !normalized.perfect_song.reason ||
    normalized.more_songs.length === 0 ||
    normalized.trending_now.length === 0
  ) {
    return null;
  }

  return normalized;
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
    return response(headers, 405, { error: "Method not allowed" });
  }

  const ip = event.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRate(ip)) {
    return response(headers, 429, { error: "Too many requests. Wait a moment." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return response(headers, 500, { error: "GEMINI_API_KEY not set on server." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(headers, 400, { error: "Invalid JSON body." });
  }

  const { imageBase64, imageMime, prompt } = body;

  if (!imageBase64 || !imageMime || !prompt) {
    return response(headers, 400, {
      error: "Missing imageBase64, imageMime, or prompt.",
    });
  }

  if (!imageMime.startsWith("image/")) {
    return response(headers, 400, { error: "Invalid image type." });
  }

  if (imageBase64.length > 14_000_000) {
    return response(headers, 413, {
      error: "Image too large. Use an image under 10MB.",
    });
  }

  const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const fallbackFormat = `
If you cannot produce perfect JSON, return this exact plain-text fallback format instead.

VIBE_DESCRIPTION: 2 vivid sentences
OUTFIT_STYLE_AESTHETIC: specific fashion aesthetic or blank
OUTFIT_COLOR_STORY: 5 words or less or blank
OUTFIT_VIBE_SUMMARY: 2 sentences or blank
OUTFIT_STYLE_TAGS: tag1 | tag2 | tag3 | tag4 | tag5
PERFECT_SONG_TITLE: song title
PERFECT_SONG_ARTIST: artist name
PERFECT_SONG_REASON: 2-3 sentences
PERFECT_SONG_TAGS: tag1 | tag2 | tag3
MORE_SONGS:
1. title | artist | mood tag
2. title | artist | mood tag
3. title | artist | mood tag
4. title | artist | mood tag
5. title | artist | mood tag
TRENDING_NOW:
1. artist | short reason
2. artist | short reason
3. artist | short reason
4. artist | short reason
5. artist | short reason

Rules:
- No markdown fences
- No intro text
- No outro text
- If returning JSON, use double quotes
- If returning fallback text, keep one value per labeled line
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
            text: `${prompt}\n\n${fallbackFormat}`,
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
    const apiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(geminiBody),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const msg = data?.error?.message || "Gemini API error";

      if (
        apiResponse.status === 429 ||
        /quota|rate limit|resource has been exhausted/i.test(msg)
      ) {
        return response(headers, 429, {
          error: "AI is temporarily busy or out of quota. Please try again in a minute.",
        });
      }

      return response(headers, apiResponse.status, { error: msg });
    }

    const raw = getRawText(data);
    if (!raw) {
      console.error("Gemini empty response:", JSON.stringify(data, null, 2));
      return response(headers, 500, { error: "Empty response from Gemini." });
    }

    let parsed = tryParseJson(raw);

    if (!parsed) {
      parsed = parseFallbackText(raw);
    }

    parsed = normalize(parsed);

    if (!parsed) {
      console.error("Gemini raw output parse failure:");
      console.error(raw);
      return response(headers, 500, { error: "AI returned invalid JSON. Try again." });
    }

    return response(headers, 200, parsed);
  } catch (err) {
    console.error("Gemini error:", err);
    return response(headers, 500, {
      error: "Failed to reach Gemini. Check your connection.",
    });
  }
};
