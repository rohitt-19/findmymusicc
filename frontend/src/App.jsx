import React, { useState, useRef, useCallback } from "react";
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
  scene: `Analyze the SCENE: its setting, environment, colors, lighting, time of day, weather, and emotional atmosphere. The visual storytelling of the place drives the music.`,
  person: `Analyze the PERSON'S OUTFIT AND STYLE as the PRIMARY focus. Identify: their specific fashion aesthetic (e.g. Dark Academia, Streetwear, Y2K, Cottagecore, Clean Girl, Grunge, Soft Boy, Baddie, Old Money, Gorpcore, etc.), exact clothing items, color palette, accessories, body language, and overall personality vibe they project. Songs must feel like what THIS person's playlist actually sounds like based on how they dress.`,
  both: `Analyze BOTH the person's OUTFIT AND STYLE (primary) AND the scene/setting (secondary). How does their fashion interact with the environment? Songs reflect both their personal aesthetic and the atmosphere of the place.`,
  any: `Analyze everything — subjects, setting, people if any, fashion if visible, colors, mood, lighting, atmosphere. Use all visual signals to determine the perfect sonic match.`,
};

const LOADING_MSGS = {
  scene: ["Reading your scene's atmosphere...", "Feeling the colors and light...", "Matching visuals to melodies...", "Composing your playlist..."],
  person: ["Reading your outfit's energy...", "Decoding your style DNA...", "Fashion meets music...", "Curating your personal soundtrack..."],
  both: ["Taking in the full picture...", "Reading outfit, setting & mood...", "Matching your whole vibe...", "Almost ready..."],
  any: ["Vibing with your photo...", "Consulting the music universe...", "Matching aesthetics to melodies...", "Almost ready..."],
};

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

    const prompt = `You are a world-class music curator${isOutfit ? " and fashion analyst" : ""}.

${PT_PROMPTS[photoType]}

User music preferences:
- Genres: ${gStr}
- Favourite artists (style reference): ${aStr}
- Energy: ${ENERGY_L[energy]}
- Lyrical depth: ${LYRIC_L[lyric]}
- Era: ${ERA_L[era]}

Return ONLY a valid JSON object, no extra text, no markdown:
{
  "vibe_description": "2 vivid sentences describing the aesthetic and mood of the image",
  ${isOutfit ? `"outfit_analysis": {
    "style_aesthetic": "Specific fashion aesthetic name (be precise and creative)",
    "color_story": "Color palette in 5 words or less",
    "vibe_summary": "2 sentences: what their style says about personality and music taste",
    "style_tags": ["tag1","tag2","tag3","tag4","tag5"]
  },` : ""}
  "perfect_song": {
    "title": "Song title",
    "artist": "Artist name",
    "reason": "2-3 sentences why this is the perfect match${isOutfit ? ". Mention the outfit aesthetic explicitly" : ""}",
    "tags": ["mood","genre","vibe"]
  },
  "more_songs": [
    {"title":"...","artist":"...","mood_tag":"..."},
    {"title":"...","artist":"...","mood_tag":"..."},
    {"title":"...","artist":"...","mood_tag":"..."},
    {"title":"...","artist":"...","mood_tag":"..."},
    {"title":"...","artist":"...","mood_tag":"..."}
  ]
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

      // Gemini API now returns parsed JSON directly from the server
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
      {/* Ambient blobs */}
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
