// lib/anim.mjs
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function pulse(now, periodMs = 2600, min = 0.6, max = 1) {
  const phase = (now % periodMs) / periodMs;
  const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2; // 0..1
  return min + (max - min) * wave;
}

export function shimmerIndex(now, width, periodMs = 1200) {
  if (width <= 0) return -1;
  const phase = (now % periodMs) / periodMs;
  return Math.floor(phase * width) % width;
}

export function spinner(now, frameMs = 120, frames = SPINNER) {
  return frames[Math.floor(now / frameMs) % frames.length];
}

export function glitchOn(now, seed = 0, periodMs = 1800, windowMs = 140) {
  return ((now + seed * 137) % periodMs) < windowMs; // 137: prime multiplier to spread seeds across the phase
}

export function glitchChar(now, seed = 0, chars = "▒░▓#%&") {
  const arr = [...chars];
  if (arr.length === 0) return "";
  const i = (Math.floor(now / 60) + seed * 7) % arr.length;
  return arr[(i + arr.length) % arr.length];
}

export function marquee(text, width, now, stepMs = 220) {
  const chars = [...text];
  if (chars.length <= width) return text + " ".repeat(width - chars.length);
  const padded = [...chars, " ", " ", " "];
  const off = Math.floor(now / stepMs) % padded.length;
  const doubled = [...padded, ...padded];
  return doubled.slice(off, off + width).join("");
}
