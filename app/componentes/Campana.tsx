"use client";

import { useCallback, useEffect, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { irA } from "@/lib/navegar";
import Avatar from "./Avatar";

type Item = { id: string; texto: string; detalle: string | null; fecha: string; url: string };

const clave = (yo: Persona) => `nosotros:actividad-visto:${yo}`;

function leerVisto(yo: Persona): number {
  try {
    return Number(localStorage.getItem(clave(yo))) || 0;
  } catch {
    return 0;
  }
}

function hace(iso: string) {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `${d} días`;
}

// Campanita con lo nuevo de la otra persona: me gusta, comentarios, historias, canciones, cartas, turnos…
export default function Campana({ yo }: { yo: Persona }) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const [items, setItems] = useState<Item[]>(() => enCache<{ items: Item[] }>("/api/actividad")?.items ?? []);
  const [abierta, setAbierta] = useState(false);
  // Hasta cuándo ya revisé (en este dispositivo)
  const [visto, setVisto] = useState(() => leerVisto(yo));
  // Lo que era nuevo al abrir, para marcarlo mientras está abierta
  const [nuevasAlAbrir, setNuevasAlAbrir] = useState(0);

  const cargar = useCallback(async () => {
    try {
      setItems((await api<{ items: Item[] }>("/api/actividad")).items);
    } catch {
      // Es un extra: si falla, la campana se queda como estaba
    }
  }, []);
  useCarga(cargar, 60000);

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta]);

  const nuevas = items.filter((i) => Date.parse(i.fecha) > visto).length;

  function abrir() {
    setNuevasAlAbrir(visto);
    setAbierta(true);
    const ahora = Date.now();
    setVisto(ahora);
    try {
      localStorage.setItem(clave(yo), String(ahora));
    } catch {}
  }

  return (
    <>
      <button
        onClick={() => (abierta ? setAbierta(false) : abrir())}
        aria-label={nuevas ? `Actividad, ${nuevas} nuevas` : "Actividad"}
        title="Actividad"
        className="relative flex h-7 w-7 items-center justify-center rounded-full border border-borde transition hover:text-texto lg:h-9 lg:w-9"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />
        </svg>
        {nuevas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-acento px-1 text-[10px] leading-none font-semibold text-sobre-acento">
            {nuevas > 9 ? "9+" : nuevas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="fixed inset-0 z-[70] bg-black/30" onClick={() => setAbierta(false)} role="presentation">
          <div
            role="dialog"
            aria-label="Actividad"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] max-h-[75vh] overflow-y-auto rounded-3xl border border-borde bg-tarjeta p-2 text-texto shadow-2xl sm:right-4 sm:left-auto sm:w-96 lg:top-16"
          >
            <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
              <p className="font-serif text-2xl tracking-tight">Actividad</p>
              <button onClick={() => setAbierta(false)} className="text-sm text-suave hover:text-texto">
                Cerrar
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center font-serif text-lg text-suave italic">Nada nuevo por ahora.</p>
            ) : (
              <ul>
                {items.map((i) => {
                  const nueva = Date.parse(i.fecha) > nuevasAlAbrir;
                  const esAviso = i.id.startsWith("resumen-");
                  return (
                    <li key={i.id}>
                      <button
                        onClick={() => {
                          setAbierta(false);
                          irA(i.url);
                        }}
                        className={`flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-relleno ${nueva ? "bg-acento-suave/40" : ""}`}
                      >
                        <Avatar persona={esAviso ? yo : tu} size={34} />
                        <span className="min-w-0 flex-1 text-sm leading-snug">
                          {!esAviso && (
                            <span className="mr-1 font-medium" style={{ color: acentos[tu] }}>
                              {nombres[tu]}
                            </span>
                          )}
                          {i.texto}
                          {i.detalle && <span className="block truncate font-serif text-suave italic">“{i.detalle}”</span>}
                          <span className="block text-[11px] text-suave">{hace(i.fecha)}</span>
                        </span>
                        {nueva && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-acento" aria-label="Nueva" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
