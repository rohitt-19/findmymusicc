import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { tokens } from "../styles.js";

const INTERNATIONAL = [
  { n: "The Weeknd", e: "🌙", g: "R&B" },
  { n: "Taylor Swift", e: "🌟", g: "Pop" },
  { n: "Drake", e: "💎", g: "Hip-Hop" },
  { n: "Kendrick Lamar", e: "👑", g: "Rap" },
  { n: "Billie Eilish", e: "🖤", g: "Alt Pop" },
  { n: "SZA", e: "🌸", g: "R&B" },
  { n: "Travis Scott", e: "🚀", g: "Trap" },
  { n: "Dua Lipa", e: "💃", g: "Dance Pop" },
  { n: "Bad Bunny", e: "🔥", g: "Latin" },
  { n: "Frank Ocean", e: "🌊", g: "Alt R&B" },
  { n: "Tyler the Creator", e: "🌺", g: "Hip-Hop" },
  { n: "Lana Del Rey", e: "🌹", g: "Indie Pop" },
  { n: "Post Malone", e: "⭐", g: "Hip-Hop" },
  { n: "Doja Cat", e: "🐱", g: "Pop/Rap" },
  { n: "Olivia Rodrigo", e: "💔", g: "Pop Rock" },
  { n: "Harry Styles", e: "🎸", g: "Pop Rock" },
  { n: "Ariana Grande", e: "☁️", g: "Pop" },
  { n: "Sabrina Carpenter", e: "✨", g: "Pop" },
  { n: "Chappell Roan", e: "💄", g: "Art Pop" },
  { n: "Noah Kahan", e: "🍂", g: "Folk Pop" },
  { n: "Mitski", e: "🌿", g: "Indie Rock" },
  { n: "Gracie Abrams", e: "🌙", g: "Indie Pop" },
];

const BOLLYWOOD_INDIAN = [
  { n: "Seedhe Maut", e: "🔱", g: "Indian Hip-Hop" },
  { n: "Divine", e: "🏙️", g: "Gully Rap" },
  { n: "Raftaar", e: "⚡", g: "Hindi Rap" },
  { n: "Badshah", e: "👑", g: "Desi Hip-Hop" },
  { n: "Hanumankind", e: "🙏", g: "Indian Rap" },
  { n: "KR$NA", e: "🎤", g: "Hindi Rap" },
  { n: "Yungsta", e: "🌆", g: "Indian Hip-Hop" },
  { n: "Prabh Deep", e: "🎵", g: "Conscious Rap" },
  { n: "Ankur Tewari", e: "🎸", g: "Indie Hindi" },
  { n: "Arijit Singh", e: "🎶", g: "Bollywood" },
  { n: "AP Dhillon", e: "🌊", g: "Punjabi Pop" },
  { n: "Diljit Dosanjh", e: "🦁", g: "Punjabi" },
  { n: "Pritam", e: "🎼", g: "Bollywood" },
  { n: "A.R. Rahman", e: "🏆", g: "Fusion / OST" },
  { n: "Shankar Ehsaan Loy", e: "🎹", g: "Bollywood" },
  { n: "Nucleya", e: "🔊", g: "Bass / EDM" },
  { n: "When Chai Met Toast", e: "☕", g: "Indie Pop" },
  { n: "Prateek Kuhad", e: "🌸", g: "Indie Folk" },
  { n: "Ritviz", e: "🌈", g: "Electronic" },
  { n: "Shreya Ghoshal", e: "💫", g: "Classical/Bollywood" },
  { n: "Guru Randhawa", e: "🎙️", g: "Punjabi Pop" },
  { n: "Talwiinder", e: "🌙", g: "Indie Punjabi" },
];

function ArtistChip({ a, selected, onToggle, disabled }) {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.04 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={() => !disabled && onToggle(a.n)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, padding: "12px 7px", borderRadius: 15, textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${selected ? "var(--accent2)" : "var(--border)"}`,
        background: selected ? "rgba(124,58,237,0.2)" : "var(--bg2)",
        transition: "all 0.2s",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: "50%", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card2)" }}>{a.e}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text)", lineHeight: 1.3 }}>{a.n}</div>
      <div style={{ fontSize: 10, color: "var(--muted)" }}>{a.g}</div>
    </motion.div>
  );
}

export default function StepArtists({ selected, onSelect, onGenerate }) {
  const [tab, setTab] = useState("international");
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");

  const toggle = (name) => {
    if (selected.includes(name)) {
      onSelect(selected.filter(x => x !== name));
    } else {
      if (selected.length >= 8) return;
      onSelect([...selected, name]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selected.includes(trimmed)) return;
    if (selected.length >= 8) return;
    onSelect([...selected, trimmed]);
    setCustomInput("");
  };

  const removeArtist = (name) => onSelect(selected.filter(x => x !== name));

  const list = tab === "international" ? INTERNATIONAL : BOLLYWOOD_INDIAN;
  const filtered = search.trim()
    ? list.filter(a => a.n.toLowerCase().includes(search.toLowerCase()) || a.g.toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <div>
      <div style={tokens.card}>
        <div style={tokens.cardLabel}>🎤 Pick your favourite artists</div>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>Select up to 8. Mix international and Indian!</p>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { id: "international", label: "🌍 International" },
            { id: "indian", label: "🇮🇳 Bollywood & Indian" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(""); }}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12,
                border: `1px solid ${tab === t.id ? "var(--accent2)" : "var(--border2)"}`,
                background: tab === t.id ? "rgba(124,58,237,0.2)" : "var(--bg2)",
                color: tab === t.id ? "var(--accent3)" : "var(--muted)",
                fontFamily: "var(--font-sans,'DM Sans',sans-serif)",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                transition: "all 0.2s",
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--muted)" }}>🔍</span>
          <input
            type="text"
            placeholder={`Search ${tab === "international" ? "international" : "Indian"} artists...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px 10px 36px",
              background: "var(--bg2)", border: "1px solid var(--border2)",
              borderRadius: 12, color: "var(--text)", fontSize: 13,
              fontFamily: "var(--font-sans,'DM Sans',sans-serif)",
              outline: "none",
            }}
          />
        </div>

        {/* Artist grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 10, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
          {filtered.map(a => (
            <ArtistChip
              key={a.n} a={a}
              selected={selected.includes(a.n)}
              onToggle={toggle}
              disabled={!selected.includes(a.n) && selected.length >= 8}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "24px 0", fontSize: 13, color: "var(--muted)" }}>
              No artists found — type their name below to add manually ↓
            </div>
          )}
        </div>

        {/* Custom artist input */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, letterSpacing: "0.5px" }}>
            🎵 Can't find your artist? Type their name:
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="e.g. Emiway Bantai, J. Cole..."
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              style={{
                flex: 1, padding: "10px 14px",
                background: "var(--bg2)", border: "1px solid var(--border2)",
                borderRadius: 12, color: "var(--text)", fontSize: 13,
                fontFamily: "var(--font-sans,'DM Sans',sans-serif)",
                outline: "none",
              }}
            />
            <button
              onClick={addCustom}
              disabled={!customInput.trim() || selected.length >= 8}
              style={{
                padding: "10px 18px", borderRadius: 12,
                background: customInput.trim() && selected.length < 8 ? "var(--accent2)" : "var(--card2)",
                border: "none", color: "white",
                fontFamily: "var(--font-sans,'DM Sans',sans-serif)",
                fontSize: 13, cursor: customInput.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
            >+ Add</button>
          </div>
        </div>

        {/* Selected pills */}
        {selected.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: "1px", textTransform: "uppercase" }}>
              Selected ({selected.length}/8)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selected.map(name => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 10px 5px 12px", borderRadius: 100,
                    background: "rgba(124,58,237,0.2)",
                    border: "1px solid var(--accent2)",
                    fontSize: 12, color: "var(--accent3)",
                  }}
                >
                  {name}
                  <span
                    onClick={() => removeArtist(name)}
                    style={{ cursor: "pointer", color: "var(--muted)", fontSize: 14, lineHeight: 1 }}
                  >×</span>
                </motion.div>
              ))}
            </div>
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
