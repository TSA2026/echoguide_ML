import { StyleSheet } from "react-native";

export const C = {
  bg:        "#020917",
  bgCard:    "#0c1628",
  bgCard2:   "#0b1222",
  border:    "#1a2744",
  borderMid: "#2a3f6a",
  text:      "#f0f4ff",
  textBody:  "#8fa4c8",
  textMuted: "#4a6080",
  cyan:      "#22d3ee",
  pink:      "#fb7185",
  blue:      "#3b82f6",
  blueBg:    "#0f2347",
  blueLt:    "#93c5fd",
  green:     "#10b981",
  amber:     "#f59e0b",
  red:       "#ef4444",
} as const;

export const F = {
  sans:  "System",   // swap for custom font if loaded
  mono:  "Courier",  // monospace fallback
} as const;

export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 20,
  },
  label: {
    fontSize: 10,
    fontFamily: F.mono,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.textMuted,
  },
  body: {
    fontSize: 15,
    color: C.textBody,
    lineHeight: 24,
  },
  muted: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 20,
  },
  h1: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    color: C.text,
    lineHeight: 42,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: C.text,
    lineHeight: 34,
  },
  btnPrimary: {
    backgroundColor: "#1d4ed8",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  btnGhost: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    borderWidth: 1.5,
    borderColor: C.borderMid,
  },
  btnGhostText: {
    color: C.textBody,
    fontSize: 15,
    fontWeight: "600",
  },
  btnCta: {
    backgroundColor: C.cyan,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: "center",
    width: "100%",
  },
  btnCtaText: {
    color: C.bg,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
