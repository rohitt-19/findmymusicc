import React from "react";
import { motion } from "framer-motion";
import { tokens } from "../styles.js";

const GENRES = ["Hip-Hop","R&B / Soul","Pop","Indie / Alt","Electronic","Lo-fi","Rock","K-Pop","Jazz","Classical","Latin","Afrobeats","Metal","Ambient","Drill","Bollywood","Indian Hip-Hop","Gully Rap","Punjabi Pop","Desi Trap","Indie Hindi","Indian Classical","Sufi / Folk"];
const ENERGY_L = ["Dead Calm","Chill","Medium","Energetic","Full Hype"];
const LYRIC_L = ["Instrumental / No lyrics","Balanced","Deep & Meaningful"];
const ERA_L = ["Any era","Classic (70s–90s)","2000s–2010s","Fresh (2020s+)"];

export default function StepTaste({ genres, onGenres, energy, onEnergy, lyric, onLyric, era, onEra, onNext }) {
  const toggle = (g) => {
    onGenres(genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g]);
  };

  return (
    <div>
      <div style={tokens.card}>
        <div style={tokens.cardLabel}>🎵 Your music taste</div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>Select all genres you vibe with</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {GENRES.map(g => (
            <motion.div
              key={g}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggle(g)}
              style={{
                padding: "7px 15px", borderRadius: 100, fontSize: 13, cursor: "pointer",
                border: `1px solid ${genres.includes(g) ? "var(--accent)" : "var(--border2)"}`,
                background: genres.includes(g) ? "rgba(124,58,237,0.2)" : "transparent",
                color: genres.includes(g) ? "var(--accent3)" : "var(--muted)",
                transition: "all 0.2s",
              }}
            >
              {g}
            </motion.div>
          ))}
        </div>
      </div>

      <div style={tokens.card}>
        <div style={tokens.cardLabel}>✨ Mood dials</div>
        {[
          { label: "Energy level", val: energy, set: onEnergy, max: 4, labels: ENERGY_L },
          { label: "Lyrical depth", val: lyric, set: onLyric, max: 2, labels: LYRIC_L },
          { label: "Era", val: era, set: onEra, max: 3, labels: ERA_L },
        ].map(({ label, val, set, max, labels }) => (
          <div key={label}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent3)", minWidth: 150, textAlign: "right" }}>{labels[val]}</span>
            </div>
            <input
              type="range" min={0} max={max} value={val} step={1}
              onChange={e => set(Number(e.target.value))}
              style={{ width: "100%", marginBottom: 22 }}
            />
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.01, boxShadow: "0 12px 40px rgba(124,58,237,0.4)" }}
        whileTap={{ scale: 0.99 }}
        onClick={onNext}
        style={tokens.btnPrimary}
      >
        Pick your artists →
      </motion.button>
    </div>
  );
}
