import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function LoadingScreen({ messages }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % messages.length), 2200);
    return () => clearInterval(iv);
  }, [messages]);

  return (
    <div style={{ textAlign: "center", padding: "80px 32px" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{
          width: 80, height: 80, margin: "0 auto 28px", borderRadius: "50%",
          background: "conic-gradient(#1a1a2e 0deg,#16213e 45deg,#0f3460 90deg,#1a1a2e 135deg,#16213e 180deg,#0f3460 225deg,#1a1a2e 270deg,#16213e 315deg)",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 28, background: "var(--bg)", borderRadius: "50%", border: "2px solid var(--border2)" }} />
      </motion.div>

      <motion.p
        key={idx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ fontSize: 15, color: "var(--muted)" }}
      >
        {messages[idx]}
      </motion.p>
    </div>
  );
}
