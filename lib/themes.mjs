// lib/themes.mjs
export const THEMES = {
  netrun: {
    accent: [255, 46, 160], accent2: [0, 229, 255],
    ok: [57, 255, 130], warn: [255, 196, 64], crit: [255, 64, 96],
    dim: [110, 96, 150], ink: [150, 140, 180],
  },
  synthwave: {
    accent: [255, 84, 201], accent2: [123, 97, 255],
    ok: [88, 255, 221], warn: [255, 179, 71], crit: [255, 71, 109],
    dim: [120, 90, 160], ink: [200, 170, 220],
  },
  matrix: {
    accent: [57, 255, 20], accent2: [0, 200, 80],
    ok: [57, 255, 20], warn: [200, 255, 80], crit: [255, 120, 60],
    dim: [40, 120, 40], ink: [120, 200, 120],
  },
  vapor: {
    accent: [255, 113, 206], accent2: [1, 205, 254],
    ok: [5, 255, 161], warn: [255, 231, 107], crit: [255, 113, 113],
    dim: [120, 110, 160], ink: [185, 103, 255],
  },
  ice: {
    accent: [120, 220, 255], accent2: [0, 150, 255],
    ok: [120, 255, 220], warn: [255, 225, 140], crit: [255, 110, 140],
    dim: [90, 120, 150], ink: [170, 200, 230],
  },
};

export function resolveTheme(name, overrides = {}) {
  const base = THEMES[name] || THEMES.netrun;
  return { ...base, ...overrides };
}
