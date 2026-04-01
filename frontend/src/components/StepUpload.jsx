import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { tokens } from "../styles.js";

const PHOTO_TYPES = [
  { id: "scene", icon: "🌆", title: "A place / scene", sub: "Landscape, city, room, nature" },
  { id: "person", icon: "🧍", title: "Person / outfit", sub: "Selfie, OOTD, full body look" },
  { id: "both", icon: "🌇", title: "Person + scene", sub: "Someone in a setting" },
  { id: "any", icon: "✨", title: "Just vibe it", sub: "Let AI figure it out" },
];

const TYPE_ICONS = { scene: "🌄", person: "🧍", both: "🌇", any: "✨" };
const TYPE_TITLES = { scene: "Drop a scene or place", person: "Drop your fit or selfie", both: "Drop the full photo", any: "Upload any photo" };

export default function StepUpload({ photoType, onPhotoType, imageData, onImage, onNext }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    // Compress image before sending — keeps Gemini fast and within free tier limits
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1024; // max dimension px — enough for Gemini vision, saves ~80% bandwidth
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const scale = MAX / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      // JPEG at 0.82 quality — great visual quality, ~3-5x smaller than original
      const compressed = canvas.toDataURL("image/jpeg", 0.82);
      onImage(compressed.split(",")[1], "image/jpeg");
    };
    img.src = objectUrl;
  };

  return (
    <div>
      {/* Photo type grid */}
      <div style={tokens.card}>
        <div style={tokens.cardLabel}>📸 What kind of photo is this?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {PHOTO_TYPES.map((pt) => (
            <motion.div
              key={pt.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPhotoType(pt.id)}
              style={{
                padding: "18px 12px", borderRadius: 16, textAlign: "center", cursor: "pointer",
                border: `1px solid ${photoType === pt.id ? "var(--accent2)" : "var(--border2)"}`,
                background: photoType === pt.id ? "rgba(124,58,237,0.2)" : "var(--bg2)",
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{pt.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3, color: "var(--text)" }}>{pt.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{pt.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <div style={tokens.card}>
        <div style={tokens.cardLabel}>📤 Drop your photo</div>
        <div
          onClick={() => !imageData && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          style={{
            border: `1.5px ${imageData ? "solid" : "dashed"} ${dragOver ? "var(--accent)" : imageData ? "var(--accent2)" : "var(--border2)"}`,
            borderRadius: 16, overflow: "hidden",
            padding: imageData ? 0 : "44px 32px",
            textAlign: "center", cursor: imageData ? "default" : "pointer",
            background: dragOver ? "rgba(124,58,237,0.1)" : "var(--bg2)",
            transition: "all 0.25s", position: "relative",
          }}
        >
          {imageData ? (
            <div style={{ position: "relative" }}>
              <img src={`data:image/jpeg;base64,${imageData}`} alt="Preview"
                style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 14, display: "block" }} />
              <div
                onClick={() => fileRef.current.click()}
                style={{
                  position: "absolute", inset: 0, background: "rgba(8,8,16,0)", borderRadius: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, color: "#fff", cursor: "pointer", gap: 8,
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(8,8,16,0.5)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(8,8,16,0)"}
              >
                🔄 Change photo
              </div>
            </div>
          ) : (
            <>
              <div style={{ width: 56, height: 56, margin: "0 auto 14px", background: "var(--card2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                {TYPE_ICONS[photoType]}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 5 }}>{TYPE_TITLES[photoType]}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Drag & drop or click to browse</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

        {(photoType === "person" || photoType === "both") && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 14 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px", background: "rgba(244,114,182,0.1)",
              border: "1px solid rgba(244,114,182,0.25)", borderRadius: 100,
              fontSize: 12, color: "var(--pink)",
            }}>
              👗 Outfit & style analysis enabled — AI reads your fashion, colors & vibe
            </div>
          </motion.div>
        )}
      </div>

      <motion.button
        whileHover={imageData ? { scale: 1.01, boxShadow: "0 12px 40px rgba(124,58,237,0.4)" } : {}}
        whileTap={imageData ? { scale: 0.99 } : {}}
        onClick={onNext}
        disabled={!imageData}
        style={{ ...tokens.btnPrimary, opacity: imageData ? 1 : 0.45, cursor: imageData ? "pointer" : "not-allowed" }}
      >
        Continue →
      </motion.button>
    </div>
  );
}
