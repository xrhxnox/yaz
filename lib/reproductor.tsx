"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { embedDe } from "./embed";

// Lo mínimo para poner una canción en el reproductor
export type Pista = { id: number | string; url: string; titulo: string; artista?: string | null; portada?: string | null };

type Reproductor = {
  actual: Pista | null;
  cola: Pista[];
  // Pone una canción; con cola, ⏮ ⏭ recorren esa lista. Si el link no se puede incrustar, lo abre afuera
  poner: (pista: Pista, cola?: Pista[]) => void;
  mover: (paso: 1 | -1) => void;
  cerrar: () => void;
};

const Contexto = createContext<Reproductor | null>(null);

export function ProveedorReproductor({ children }: { children: React.ReactNode }) {
  const [actual, setActual] = useState<Pista | null>(null);
  // Solo las que sí se pueden poner dentro de la app
  const [cola, setCola] = useState<Pista[]>([]);

  const poner = useCallback((pista: Pista, lista?: Pista[]) => {
    if (!embedDe(pista.url)) {
      window.open(pista.url, "_blank", "noopener");
      return;
    }
    setActual(pista);
    if (lista) setCola(lista.filter((p) => embedDe(p.url)));
  }, []);

  const mover = useCallback(
    (paso: 1 | -1) => {
      if (!actual || cola.length < 2) return;
      const i = cola.findIndex((p) => p.id === actual.id);
      setActual(cola[(i + paso + cola.length) % cola.length]);
    },
    [actual, cola],
  );

  const cerrar = useCallback(() => setActual(null), []);

  const valor = useMemo(() => ({ actual, cola, poner, mover, cerrar }), [actual, cola, poner, mover, cerrar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useReproductor() {
  const r = useContext(Contexto);
  if (!r) throw new Error("useReproductor fuera de ProveedorReproductor");
  return r;
}
