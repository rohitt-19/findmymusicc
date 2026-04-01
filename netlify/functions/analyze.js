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

function getRawTextFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

function extractJsonBlock(raw) {
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
  const attempts = [];
  const cleaned = extractJsonBlock(raw);

  attempts.push(raw);
  attempts.push(cleaned);
  attempts.push(
    cleaned
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\t/g, " ")
  );

  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      return JSON.parse(attempt);
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

    if (line === "TRENDING_NOW:") {
      break;
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

function parseTrendingNow(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "TRENDING_NOW:") {
      inSection = true;
      continue;
    }

    if (!inSection) continue;

    const richMatch = line.match(/^\d+\.\s*(.*?)\s*\|\s*(.*)$/);
    if (richMatch) {
      items.push({
        artist: richMatch[1].trim(),
        reason: richMatch[2].trim(),
      });
      continue;
    }

    const simpleMatch = line.match(/^\d+\.\s*(.*)$/);
    if (simpleMatch) {
      items.push({
        artist: simpleMatch[1].trim(),
        reason: "",
      });
    }
  }

  return items.filter((item) => item.artist);
}

function parseStructuredFallback(rawText) {
  if (!rawText) return null;

  const vibe_description = getLineValue(rawText, "VIBE_DESCRIPTION");
  const perfect_song = {
    title: getLineValue(rawText, "PERFECT_SONG_TITLE"),
    artist: getLineValue(rawText, "PERFECT_SONG_ARTIST"),
    reason: getLineValue(rawText, "PERFECT_SONG_REASON"),
    tags: parsePipeList(getLineValue(rawText, "PERFECT_SONG_TAGS")),
  };

  const more_songs = parseMoreSongs(rawText);
  const trending_now = parseTrendingNow(rawText);

  const style_aesthetic = getLineValue(rawText, "OUTFIT_STYLE_AESTHETIC");
  const color_story = getLineValue(rawText, "OUTFIT_COLOR_STORY");
  const vibe_summary = getLineValue(rawText, "OUTFIT_VIBE_SUMMARY");
  const style_tags = parsePipeList(getLineValue(rawText, "OUTFIT_STYLE_TAGS"));

  const parsed = {
    vibe_description,
    perfect_song,
    more_songs,
    trending_now,
  };

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

function normalizeParsed(parsed) {
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
    !normalized.more_songs.length ||
    !normalized.trending_now.length
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

  const fallbackFormat = `
If you cannot produce perfect strict JSON, use this exact plain-text fallback format instead:

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
- Use double quotes if returning JSON
- If returning fallback text, keep exactly one value per labeled line
`;

  const geminiBody = {
    contents: [{
      parts: [
        { inline_data: { mime_type: imageMime, data: imageBase64 } },
        { text: `${prompt}\n\n${fallbackFormat}` },
      ],
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1500,
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

    const raw = getRawTextFromGemini(data);
    if (!raw) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Empty response from Gemini." }) };
    }

    let parsed = tryParseJson(raw);

    if (!parsed) {
      parsed = parseStructuredFallback(raw);
    }

    parsed = normalizeParsed(parsed);

    if (!parsed) {
      console.error("Gemini raw output parse failure:");
      console.error(raw);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "AI returned invalid JSON. Try again." }) };
    }

    if (!parsed.perfect_song || !parsed.more_songs || !parsed.trending_now) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Incomplete AI response. Try again." }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };

  } catch (err) {
    console.error("Gemini error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to reach Gemini. Check your connection." }) };
  }
};
