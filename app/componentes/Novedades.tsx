"use client";

import { useCallback, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, enCache, medianocheLocal } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { irA } from "@/lib/navegar";

type Item = { id: string; texto: string; detalle: string | null; fecha: string; url: string };

const MAXIMO = 3;

function saludo(hora: number) {
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Junto a las historias: lo que hizo hoy la otra persona (botoncitos que llevan ahí).
// Si hoy no ha hecho nada, un saludo con la fecha
export default function Novedades({ yo, ahora }: { yo: Persona; ahora: Date }) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const [items, setItems] = useState<Item[]>(() => enCache<{ items: Item[] }>("/api/actividad")?.items ?? []);

  const cargar = useCallback(async () => {
    try {
      setItems((await api<{ items: Item[] }>("/api/actividad")).items);
    } catch {
      // Es un extra
    }
  }, []);
  useCarga(cargar, 60000);

  const desde = Date.parse(medianocheLocal());
  // Lo de hoy, agrupado ("publicó en el muro · 2")
  const grupos = new Map<string, { texto: string; url: string; veces: number }>();
  for (const i of items) {
    if (i.id.startsWith("resumen-") || Date.parse(i.fecha) < desde) continue;
    const g = grupos.get(i.texto);
    if (g) g.veces++;
    else grupos.set(i.texto, { texto: i.texto, url: i.url, veces: 1 });
  }
  const lista = [...grupos.values()];

  if (!lista.length)
    return (
      <div>
        <p className="font-serif text-xl leading-tight">
          {saludo(ahora.getHours())}, <span style={{ color: acentos[yo] }}>{nombres[yo]}</span>
        </p>
        <p className="mt-0.5 text-xs text-suave first-letter:uppercase">{ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
    );

  return (
    <section aria-label={`Lo nuevo de ${nombres[tu]} hoy`}>
      <p className="text-[11px] text-suave">
        Hoy, <span style={{ color: acentos[tu] }}>{nombres[tu]}</span>…
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {lista.slice(0, MAXIMO).map((g) => (
          <button
            key={g.texto}
            onClick={() => irA(g.url)}
            className="max-w-full truncate rounded-full border border-borde bg-tarjeta px-2.5 py-1 text-xs transition hover:border-suave active:scale-95"
          >
            {g.texto}
            {g.veces > 1 && <span className="ml-1 text-suave">· {g.veces}</span>}
          </button>
        ))}
        {lista.length > MAXIMO && <span className="self-center text-[11px] text-suave">y {lista.length - MAXIMO} más</span>}
      </div>
    </section>
  );
}
