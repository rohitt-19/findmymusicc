import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styled, { createGlobalStyle } from "./styles.js";
import StepUpload from "./components/StepUpload.jsx";
import StepTaste from "./components/StepTaste.jsx";
import StepArtists from "./components/StepArtists.jsx";
import StepResults from "./components/StepResults.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import Header from "./components/Header.jsx";
import StepsBar from "./components/StepsBar.jsx";

const PT_PROMPTS = {
  scene: `VISUAL ANALYSIS — SCENE:
Deeply analyze the scene like a cinematographer would. Note: exact setting (urban/rural/indoor/outdoor), dominant colors and their emotional weight, lighting quality (golden hour? neon? overcast?), time of day, weather/season, textures, the overall emotional atmosphere. What story does this place tell? What kind of person exists in this space?`,

  person: `VISUAL ANALYSIS — OUTFIT & PERSONAL AESTHETIC (this is your PRIMARY job):
You are a fashion-forward music curator. Analyze every detail of this person's look:
1. FASHION AESTHETIC: Name it precisely (e.g. "South Delhi Streetwear", "Mumbai Indie Kid", "Dark Academia", "Clean Girl Aesthetic", "Hypebeast", "Old Money", "Y2K Revival", "Gully Rap Energy", "Soft Boy", "Baddie", etc.)
2. CLOTHING: Specific items, brands if visible, how they're styled
3. COLOR PALETTE: The exact color story of the outfit
4. ACCESSORIES & DETAILS: Shoes, bags, jewelry, hair, makeup
5. BODY LANGUAGE & ENERGY: How do they carry themselves? What vibe do they radiate?
6. PERSONALITY READ: What does this aesthetic say about their taste in music, their personality, their world?
Songs must feel like what THIS exact person would have in their playlist — not just the aesthetic category, but THIS specific human.`,

  both: `VISUAL ANALYSIS — PERSON IN ENVIRONMENT:
Analyze the PERSON'S STYLE first (fashion aesthetic, outfit, vibe, personality energy) and then the SETTING they're in. How does their look interact with the environment? A person in streetwear in a college corridor vs a rooftop vs a mall all feel different. Songs must capture BOTH their personal aesthetic and the atmosphere of where they are.`,

  any: `VISUAL ANALYSIS — FULL SCENE:
Read everything in this image like a music supervisor scoring a film scene. Analyze: people and their energy/outfits if present, the setting and atmosphere, colors and lighting, mood, time, textures. What genre of film would this be? What feeling does it leave? Use ALL of this to determine the perfect sonic match.`,
};

const LOADING_MSGS = {
  scene: ["Reading your scene's atmosphere...", "Feeling the colors and light...", "Matching visuals to melodies...", "Composing your playlist..."],
  person: ["Reading your outfit's energy...", "Decoding your style DNA...", "Fashion meets music...", "Curating your personal soundtrack..."],
  both: ["Taking in the full picture...", "Reading outfit, setting & mood...", "Matching your whole vibe...", "Almost ready..."],
  any: ["Vibing with your photo...", "Consulting the music universe...", "Matching aesthetics to melodies...", "Almost ready..."],
};

// Indian Hip-Hop scene knowledge injected into every request
const INDIAN_SCENE_CONTEXT = `
INDIAN MUSIC SCENE KNOWLEDGE (use this when recommending Indian music):
- Seedhe Maut: Delhi-based rap duo (Encore ABJ + Calm). Raw, introspective, politically conscious Hindi rap. Albums: Bayaan, Nayaab. Signature: dense wordplay, lo-fi beats.
- Divine: Mumbai gully rap pioneer. Street anthems, motivational, Hindi/Hinglish. Collabed with Nas. Songs: Mere Gully Mein, Gunehgar, Mirchi.
- KR$NA: Delhi rapper. Technical, fast-paced, complex Hindi bars. Known for diss tracks and street rap credibility.
- Prabh Deep: Delhi. Conscious hip-hop, social commentary, Punjabi/Hindi. Album: Class-Sikh.
- Hanumankind: Kerala-born rapper. Blends Malayalam/English/Hindi. Big Jump went viral globally. Energetic live shows.
- Raftaar: High-energy Hindi rap, Desi trap. Mainstream but respected. Fast delivery.
- Badshah: Desi pop-rap, party anthems, massive streaming numbers.
- Nucleya: Bass music, Indian electronic, festival energy. Blends folk samples with EDM.
- AP Dhillon: Punjabi pop-R&B crossover. Global sound. Brown Munde, With You.
- Diljit Dosanjh: Punjabi superstar. Authentic bhangra meets modern pop.
- Prateek Kuhad: Delhi indie folk. Soft, emotional, English/Hindi. cold/mess, Kasoor.
- Ritviz: Pune. Electronic + Hindi indie. Udd Gaye, Sage.
- Talwiinder: Indie Punjabi. Melancholic, cinematic, minimal production.
- Anuv Jain: Indie pop. Soft, emotional, Hindi. Baarishein, Gul.
- When Chai Met Toast: Kerala indie pop. Warm, feel-good, English/Hindi.
`;

export default function App() {
  const [step, setStep] = useState(1);
  const [photoType, setPhotoType] = useState("any");
  const [imageData, setImageData] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const [genres, setGenres] = useState([]);
  const [energy, setEnergy] = useState(2);
  const [lyric, setLyric] = useState(1);
  const [era, setEra] = useState(0);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const isOutfit = photoType === "person" || photoType === "both";
  const hasIndianTaste = genres.some(g => ["Bollywood","Indian Hip-Hop","Gully Rap","Punjabi Pop","Desi Trap","Indie Hindi","Indian Classical","Sufi / Folk"].includes(g));
  const hasIndianArtist = artists.some(a => ["Seedhe Maut","Divine","Raftaar","Badshah","Hanumankind","KR$NA","Prabh Deep","Nucleya","AP Dhillon","Diljit Dosanjh","Prateek Kuhad","Ritviz","Talwiinder","When Chai Met Toast","Anuv Jain"].includes(a));
  const wantsIndian = hasIndianTaste || hasIndianArtist;

  const ENERGY_L = ["Dead Calm", "Chill", "Medium", "Energetic", "Full Hype"];
  const LYRIC_L = ["Instrumental / No lyrics", "Balanced", "Deep & Meaningful"];
  const ERA_L = ["Any era", "Classic (70s–90s)", "2000s–2010s", "Fresh (2020s+)"];

  const goStep = (n) => setStep(n);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setStep(4);

    const gStr = genres.length ? genres.join(", ") : "any genre";
    const aStr = artists.length ? artists.join(", ") : "any";

    const prompt = `You are an elite music curator with deep knowledge of both global and Indian music scenes. Your recommendations are known for being surprisingly accurate, specific, and non-obvious.

${PT_PROMPTS[photoType]}

${wantsIndian ? INDIAN_SCENE_CONTEXT : ""}

USER'S MUSIC PROFILE:
- Genres they love: ${gStr}
- Favourite artists (MOST IMPORTANT — use these as the primary signal for recommendations): ${aStr}
- Energy preference: ${ENERGY_L[energy]}
- Lyrical depth: ${LYRIC_L[lyric]}
- Era: ${ERA_L[era]}

RECOMMENDATION RULES (follow strictly):
1. The selected ARTISTS are the strongest signal. If they chose Seedhe Maut + The Weeknd, recommendations must live in that world — don't give generic pop.
2. NEVER repeat the same artist twice across all 6 recommendations.
3. Include at least one deep cut / underrated pick that a true music fan would appreciate.
4. Each song must match BOTH the visual aesthetic AND the user's music taste simultaneously.
5. mood_tag must be ultra-specific (not just "sad" — use things like "3am drive energy", "rooftop monsoon vibes", "Delhi winter nostalgia", "rage with melody", etc.)
6. If Indian genres/artists selected, at least 2-3 of the more_songs must be Indian.
7. The "reason" field must specifically reference what you saw in the image — make it feel personal.
8. For trending_now picks: recommend songs that are genuinely buzzing in ${new Date().getFullYear()} — recent releases, viral moments, chart-toppers. These should feel current and exciting.

Return ONLY a valid JSON object, no markdown, no extra text:
{
  "vibe_description": "2 vivid, poetic sentences describing the aesthetic and emotional mood of the image — make it feel like a caption",
  ${isOutfit ? `"outfit_analysis": {
    "style_aesthetic": "Precise fashion aesthetic name — be creative and specific",
    "color_story": "The color palette in 5 words or less",
    "vibe_summary": "2 sentences: what their style reveals about their personality and music taste",
    "style_tags": ["tag1","tag2","tag3","tag4","tag5"]
  },` : ""}
  "perfect_song": {
    "title": "Song title",
    "artist": "Artist name",
    "reason": "2-3 sentences — be specific about what in the image/outfit led you here. Make it feel like a human curator wrote it.",
    "tags": ["specific mood tag","genre","vibe word"]
  },
  "more_songs": [
    {"title":"...","artist":"...","mood_tag":"ultra specific vibe in 3-5 words"},
    {"title":"...","artist":"...","mood_tag":"..."},
    {"title":"...","artist":"...","mood_tag":"..."},
    {"title":"...","artist":"...","mood_tag":"..."},
    {"title":"...","artist":"...","mood_tag":"..."}
  ],
  "trending_now": {
    "international": {
      "title": "A song that is genuinely trending/buzzing globally right now in ${new Date().getFullYear()}",
      "artist": "Artist name",
      "why_trending": "One sentence on why this is having a moment right now"
    },
    "indian": {
      "title": "A song that is genuinely trending in India right now in ${new Date().getFullYear()} — could be Hindi rap, Bollywood, Punjabi, indie",
      "artist": "Artist name",
      "why_trending": "One sentence on why this is having a moment in India right now"
    }
  }
}`;

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData,
          imageMime: imageMime,
          prompt: prompt,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "API error");
      setResults(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || "Something went wrong. Please try again.");
      setStep(3);
    }
  };

  const reset = () => {
    setStep(1); setPhotoType("any"); setImageData(null); setImageMime(null);
    setGenres([]); setEnergy(2); setLyric(1); setEra(0);
    setArtists([]); setResults(null); setError(null);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div style={{ position: "fixed", top: "-20vh", left: "-10vw", width: "min(60vw,700px)", height: "min(60vw,700px)", borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,0.12) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20vh", right: "-10vw", width: "min(50vw,600px)", height: "min(50vw,600px)", borderRadius: "50%", background: "radial-gradient(circle,rgba(244,114,182,0.08) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", padding: "0 24px 80px" }}>
        <Header />

        <AnimatePresence mode="wait">
          {!loading && results === null && (
            <motion.div key="stepsbar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StepsBar currentStep={step} />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: "14px 18px", marginBottom: 20, fontSize: 14, color: "#fca5a5" }}>
            ⚠ {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <LoadingScreen photoType={photoType} messages={LOADING_MSGS[photoType]} />
            </motion.div>
          ) : results ? (
            <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <StepResults results={results} onReset={reset} />
            </motion.div>
          ) : (
            <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {step === 1 && (
                <StepUpload
                  photoType={photoType}
                  onPhotoType={setPhotoType}
                  imageData={imageData}
                  onImage={(data, mime) => { setImageData(data); setImageMime(mime); }}
                  onNext={() => goStep(2)}
                />
              )}
              {step === 2 && (
                <StepTaste
                  genres={genres} onGenres={setGenres}
                  energy={energy} onEnergy={setEnergy}
                  lyric={lyric} onLyric={setLyric}
                  era={era} onEra={setEra}
                  onNext={() => goStep(3)}
                />
              )}
              {step === 3 && (
                <StepArtists
                  selected={artists}
                  onSelect={setArtists}
                  onGenerate={generate}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
