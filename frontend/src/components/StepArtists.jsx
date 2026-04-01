import React from "react";
import { motion } from "framer-motion";
import { tokens } from "../styles.js";

const ARTISTS = [
  { n: "Taylor Swift", e: "🌟", g: "Pop" },
  { n: "Bad Bunny", e: "🔥", g: "Latin" },
  { n: "The Weeknd", e: "🌙", g: "R&B" },
  { n: "Billie Eilish", e: "🖤", g: "Alt Pop" },
  { n: "Drake", e: "💎", g: "Hip-Hop" },
  { n: "SZA", e: "🌸", g: "R&B" },
  { n: "Kendrick Lamar", e: "👑", g: "Rap" },
  { n: "Olivia Rodrigo", e: "💔", g: "Pop Rock" },
  { n: "Post Malone", e: "⭐", g: "Hip-Hop" },
  { n: "Doja Cat", e: "🐱", g: "Pop/Rap" },
  { n: "Travis Scott", e: "🚀", g: "Trap" },
  { n: "Dua Lipa", e: "💃", g: "Dance Pop" },
  { n: "Frank Ocean", e: "🌊", g: "Alt R&B" },
  { n: "Harry Styles", e: "🎸", g: "Pop Rock" },
  { n: "Tyler the Creator", e: "🌺", g: "Hip-Hop" },
  { n: "Ariana Grande", e: "☁️", g: "Pop" },
  { n: "Lana Del Rey", e: "🌹", g: "Indie Pop" },
  { n: "Sabrina Carpenter", e: "✨", g: "Pop" },
  { n: "Peso Pluma", e: "🎩", g: "Regional Mex" },
  { n: "Gracie Abrams", e: "🌙", g: "Indie Pop" },
  { n: "Chappell Roan", e: "💄", g: "Art Pop" },
  { n: "Benson Boone", e: "🎹", g: "Pop Rock" },
  { n: "Noah Kahan", e: "🍂", g: "Folk Pop" },
  { n: "Mitski", e: "🌿", g: "Indie Rock" },
];

export default function StepArtists({ selected, onSelect, onGenerate }) {
  const toggle = (name) => {
    if (selected.includes(name)) {
      onSelect(selected.filter(x => x !== name));
    } else {
      if (selected.length >= 5) return;
      onSelect([...selected, name]);
    }
  };

  return (
    <div>
      <div style={tokens.card}>
        <div style={tokens.cardLabel}>🌟 Trending artists — pick your favourites</div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>From Spotify's current top charts. Select up to 5.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 10 }}>
          {ARTISTS.map((a) => (
            <motion.div
              key={a.n}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(a.n)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 7, padding: "13px 7px", borderRadius: 15, textAlign: "center", cursor: "pointer",
                border: `1px solid ${selected.includes(a.n) ? "var(--accent2)" : "var(--border)"}`,
                background: selected.includes(a.n) ? "rgba(124,58,237,0.2)" : "var(--bg2)",
                transition: "all 0.2s",
                opacity: (!selected.includes(a.n) && selected.length >= 5) ? 0.4 : 1,
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: "50%", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card2)" }}>{a.e}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text)", lineHeight: 1.3 }}>{a.n}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{a.g}</div>
            </motion.div>
          ))}
        </div>
        {selected.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--muted)" }}>
            Selected: <span style={{ color: "var(--accent3)" }}>{selected.join(", ")}</span>
          </div>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.01, boxShadow: "0 12px 40px rgba(124,58,237,0.4)" }}
        whileTap={{ scale: 0.99 }}
        onClick={onGenerate}
        style={tokens.btnPrimary}
      >
        ✦ Find my songs
      </motion.button>
    </div>
  );
}
