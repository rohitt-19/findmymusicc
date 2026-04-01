import React from "react";
import { motion } from "framer-motion";

export default function Header() {
  return (
    <header style={{ textAlign: "center", padding: "56px 0 44px" }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{
            width: 40, height: 40,
            background: "linear-gradient(135deg,#7c3aed,#f472b6)",
            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>♪</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 500 }}>FindMyMusicc</span>
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(36px,7vw,58px)", fontWeight: 400,
          lineHeight: 1.1, letterSpacing: -1, marginBottom: 14,
          background: "linear-gradient(135deg,#f0eefc 30%,#c4b5fd 65%,#f472b6 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Your vibe,<br /><em>your soundtrack.</em>
        </h1>

        <p style={{ color: "var(--muted)", fontSize: 15, fontWeight: 300 }}>
          Drop a photo — scene, outfit, selfie, anything. We'll find the songs inside it.
        </p>
      </motion.div>
    </header>
  );
}
