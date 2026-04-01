// Shared style tokens — import these in components
export const tokens = {
  card: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, marginBottom: 20 },
  cardLabel: { fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 },
  btnPrimary: {
    width: "100%", padding: "18px", background: "linear-gradient(135deg,#7c3aed,#9333ea)",
    border: "none", borderRadius: 16, color: "#fff", fontFamily: "'DM Sans', sans-serif",
    fontSize: 16, fontWeight: 500, cursor: "pointer", marginTop: 8, letterSpacing: "0.2px",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  btnSecondary: {
    flex: 1, padding: 14, background: "var(--card2)", border: "1px solid var(--border2)",
    borderRadius: 14, color: "var(--text)", fontFamily: "'DM Sans', sans-serif",
    fontSize: 14, cursor: "pointer",
  },
};

export default {};
