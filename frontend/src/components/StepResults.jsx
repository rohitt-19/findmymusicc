import React, { useState } from "react";
import { motion } from "framer-motion";
import { tokens } from "../styles.js";

const spotifySearch = (title, artist) =>
  `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;

function PlayBtn({ title, artist }) {
  return (
    <a
      href={spotifySearch(title, artist)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "var(--card2)", border: "1px solid var(--border2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0, textDecoration: "none",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--accent2)"; e.currentTarget.style.borderColor = "var(--accent2)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "var(--card2)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--text)"><path d="M8 5v14l11-7z" /></svg>
    </a>
  );
}

export default function StepResults({ results, onReset }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const share = () => {
    const ps = results.perfect_song;
    const more = (results.more_songs || []).slice(0, 4);
    const oa = results.outfit_analysis;
    const lines = [
      "🎵 My FindMyMusicc playlist:",
      oa ? `\n👗 Style: ${oa.style_aesthetic}` : "",
      `\n★ ${ps.title} — ${ps.artist}`,
      ...more.map((s, i) => `${i + 1}. ${s.title} — ${s.artist}`),
      "\nfindmymusicc.app ✦",
    ].filter(Boolean).join("\n");

    // Save to localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("mt_saved") || "[]");
      saved.unshift({ id: Date.now(), vibe: (results.vibe_description || "").slice(0, 65) + "...", songs: [ps, ...more], date: new Date().toLocaleDateString() });
      localStorage.setItem("mt_saved", JSON.stringify(saved.slice(0, 5)));
    } catch {}

    if (navigator.share) {
      navigator.share({ text: lines }).catch(() => {});
    } else {
      navigator.clipboard.writeText(lines).then(() => showToast("💜 Copied to clipboard!"));
    }
  };

  const ps = results.perfect_song;
  const oa = results.outfit_analysis;

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "34px 0 26px" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 400, marginBottom: 8 }}>Your Soundtrack ✦</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>
          {results.vibe_description}
        </p>
      </div>

      {/* Outfit insight */}
      {oa && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "linear-gradient(135deg,rgba(244,114,182,0.12),rgba(124,58,237,0.1))",
            border: "1px solid rgba(244,114,182,0.22)",
            borderRadius: 18, padding: "22px 24px", marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--pink)", marginBottom: 12 }}>👗 Outfit & Style Reading</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--pink)", marginBottom: 7 }}>{oa.style_aesthetic}</div>
          <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{oa.vibe_summary}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Color palette: <span style={{ color: "var(--text)" }}>{oa.color_story}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {(oa.style_tags || []).map(t => (
              <span key={t} style={{ padding: "4px 12px", borderRadius: 100, background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.2)", fontSize: 12, color: "var(--pink)" }}>{t}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Featured song */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: oa ? 0.1 : 0 }}
        style={{
          background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(244,114,182,0.1))",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 20, padding: 28, marginBottom: 18, position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: "-50%", right: "-20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(167,139,250,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 500, color: "var(--gold)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 18 }}>
          ★ Perfect Match
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 500, marginBottom: 5, lineHeight: 1.2 }}>{ps.title}</div>
        <div style={{ fontSize: 15, color: "var(--accent3)", marginBottom: 14 }}>{ps.artist}</div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, borderLeft: "2px solid var(--accent2)", paddingLeft: 14, marginBottom: 18 }}>
          {ps.reason}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {(ps.tags || []).map(t => (
            <span key={t} style={{ padding: "4px 12px", borderRadius: 100, fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--muted)" }}>{t}</span>
          ))}
        </div>
        <PlayBtn title={ps.title} artist={ps.artist} />
      </motion.div>

      {/* More songs */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Also perfect for this vibe</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(results.more_songs || []).map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              style={{
                background: "var(--card)", border: "1px solid var(--border)", borderRadius: 15,
                padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.background = "var(--card2)"; e.currentTarget.style.transform = "translateX(4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: 13, color: "var(--muted)", minWidth: 18, fontWeight: 500 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{s.artist}</div>
                {s.mood_tag && (
                  <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, padding: "2px 10px", borderRadius: 100, background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.2)", color: "var(--teal)" }}>
                    {s.mood_tag}
                  </span>
                )}
              </div>
              <PlayBtn title={s.title} artist={s.artist} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button onClick={onReset} style={{ ...tokens.btnSecondary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          ↩ Try another photo
        </button>
        <button
          onClick={share}
          style={{ flex: 1, padding: 14, background: "transparent", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 14, color: "var(--pink)", fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(244,114,182,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          ⬡ Share playlist
        </button>
      </div>

      {/* Toast */}
      <motion.div
        initial={false}
        animate={{ y: toastVisible ? 0 : 100, opacity: toastVisible ? 1 : 0 }}
        style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "var(--card2)", border: "1px solid var(--border2)",
          borderRadius: 100, padding: "12px 20px", fontSize: 13,
          whiteSpace: "nowrap", pointerEvents: "none", zIndex: 1000,
        }}
      >
        {toastMsg}
      </motion.div>
    </div>
  );
}
