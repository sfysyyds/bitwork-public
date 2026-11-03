import { useEffect, useState } from "react";

export function effectsDisabled(systemReduced: boolean) {
  return systemReduced;
}
export function useReducedEffects() {
  const [state, setState] = useState({ reduced: true, systemReduced: false });
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const reduced = effectsDisabled(query.matches);
      setState({ reduced, systemReduced: query.matches });
    };
    query.addEventListener("change", update);
    update();
    return () => { query.removeEventListener("change", update); };
  }, []);
  return state;
}
