import React from "react";

const STEPS = ["Upload", "Taste", "Artists", "Discover"];

export default function StepsBar({ currentStep }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 42, flexWrap: "wrap", gap: 4 }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < currentStep;
        const active = n === currentStep;
        return (
          <React.Fragment key={n}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: done ? "var(--teal)" : active ? "var(--accent3)" : "var(--muted)", transition: "color 0.3s" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                border: `1px solid ${done ? "var(--teal)" : active ? "var(--accent2)" : "var(--border2)"}`,
                background: done ? "var(--teal)" : active ? "var(--accent2)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: done ? 14 : 12, fontWeight: 500,
                color: done ? "#080810" : active ? "#fff" : "var(--muted)",
                transition: "all 0.3s",
              }}>
                {done ? "✓" : n}
              </div>
              <span>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 32, height: 1, background: "var(--border2)", margin: "0 3px" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
