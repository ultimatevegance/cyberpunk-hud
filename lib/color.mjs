// lib/color.mjs
const ESC = "\x1b[";

export function detectMode(env = process.env) {
  if (env.CYBERPUNK_HUD_COLOR) return env.CYBERPUNK_HUD_COLOR; // explicit user override wins
  if (env.NO_COLOR != null && env.NO_COLOR !== "") return "none";
  if (env.TERM === "dumb") return "none";
  const ct = (env.COLORTERM || "").toLowerCase();
  if (ct.includes("truecolor") || ct.includes("24bit")) return "truecolor";
  if ((env.TERM || "").includes("256")) return "256";
  return "truecolor";
}

export function rgbTo256([r, g, b]) {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const f = (v) => Math.round((v / 255) * 5);
  return 16 + 36 * f(r) + 6 * f(g) + f(b);
}

export function fg(rgb, mode = "truecolor") {
  if (mode === "none") return "";
  if (mode === "256") return `${ESC}38;5;${rgbTo256(rgb)}m`;
  return `${ESC}38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
}

export function paint(rgb, s, mode = "truecolor", boldOn = false) {
  if (mode === "none") return s;
  const b = boldOn ? `${ESC}1m` : "";
  return `${fg(rgb, mode)}${b}${s}${ESC}0m`;
}

export function interp(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function gradient(stops, t) {
  t = Math.max(0, Math.min(1, t));
  if (stops.length === 0) return [0, 0, 0];
  if (stops.length === 1) return stops[0];
  const seg = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  return interp(stops[i], stops[i + 1], seg - i);
}

export function brightness(rgb, factor) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return [clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2])];
}
