import { useSyncExternalStore } from "react";

// Pestaña dentro de una sección, tomada del #hash (ej. #momentos/cartas → "cartas")
function leer() {
  return window.location.hash.slice(1).split("/")[1] ?? "";
}

function suscribir(oyente: () => void) {
  window.addEventListener("hashchange", oyente);
  return () => window.removeEventListener("hashchange", oyente);
}

export function useSubseccion<T extends string>(validas: readonly T[], porDefecto: T): [T, (t: T) => void] {
  const crudo = useSyncExternalStore(suscribir, leer, () => "");
  const actual = (validas as readonly string[]).includes(crudo) ? (crudo as T) : porDefecto;
  const cambiar = (t: T) => {
    const seccion = window.location.hash.slice(1).split("/")[0];
    // replaceState: cambiar de pestaña no llena el historial del botón "atrás"
    history.replaceState(null, "", `#${seccion}/${t}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  return [actual, cambiar];
}
