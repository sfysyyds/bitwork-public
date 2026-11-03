import { useEffect, useState } from "react";

const key = "bitwork-effects";
export function effectsDisabled(systemReduced: boolean, stored: string | null) {
  return systemReduced || stored === "off";
}
export function setEffectsEnabled(enabled: boolean) {
  try { localStorage.setItem(key, enabled ? "on" : "off"); } catch { /* Session-only setting still works. */ }
  document.documentElement.dataset.effectsPreference = enabled ? "on" : "off";
  window.dispatchEvent(new Event("bitwork-effects-change"));
}
export function useReducedEffects() {
  const [state, setState] = useState({ reduced: true, systemReduced: false });
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      let stored = document.documentElement.dataset.effectsPreference ?? null;
      try { stored = localStorage.getItem(key) ?? stored; } catch { /* Keep the session setting. */ }
      const reduced = effectsDisabled(query.matches, stored);
      document.documentElement.dataset.effects = reduced ? "off" : "on";
      setState({ reduced, systemReduced: query.matches });
    };
    query.addEventListener("change", update);
    window.addEventListener("bitwork-effects-change", update);
    window.addEventListener("storage", update);
    update();
    return () => { query.removeEventListener("change", update); window.removeEventListener("bitwork-effects-change", update); window.removeEventListener("storage", update); };
  }, []);
  return state;
}
