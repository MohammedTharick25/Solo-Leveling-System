// Modular accent palettes. Colors live in styles/tokens.css under
// :root[data-palette="<id>"]; this file only registers and applies them.
export const PALETTES = [
  { id: "system", name: "System", hint: "Azure + violet", swatch: ["#4ab6ff", "#a78bfa"] },
  { id: "shadow", name: "Shadow", hint: "Violet + magenta", swatch: ["#a78bfa", "#e879f9"] },
  { id: "ember", name: "Ember", hint: "Orange + rose", swatch: ["#fb923c", "#fb7185"] },
  { id: "jade", name: "Jade", hint: "Emerald + sky", swatch: ["#34d399", "#38bdf8"] },
];

const KEY = "sl-palette";
const DEFAULT = "system";

export const getPalette = () => {
  try {
    const saved = window.localStorage.getItem(KEY);
    return PALETTES.some((p) => p.id === saved) ? saved : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

export const applyPalette = (id = getPalette()) => {
  const root = document.documentElement;
  if (id === DEFAULT) root.removeAttribute("data-palette");
  else root.setAttribute("data-palette", id);
};

export const setPalette = (id) => {
  if (!PALETTES.some((p) => p.id === id)) return;
  try { window.localStorage.setItem(KEY, id); } catch { /* storage unavailable */ }
  applyPalette(id);
  window.dispatchEvent(new CustomEvent("sl-palette-change", { detail: id }));
};
