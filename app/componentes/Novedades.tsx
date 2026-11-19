"use client";

import { useCallback, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, enCache, medianocheLocal } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { irA } from "@/lib/navegar";
import Avatar from "./Avatar";

type Item = { id: string; texto: string; detalle: string | null; fecha: string; url: string };

// Lo que hizo hoy la otra persona, en una tira de botoncitos arriba de Hoy (si no hizo nada, no aparece)
export default function Novedades({ yo }: { yo: Persona }) {
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
  if (!grupos.size) return null;

  return (
    <section aria-label={`Hoy de ${nombres[tu]}`}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-suave">
        <Avatar persona={tu} size={16} />
        Lo nuevo de <span style={{ color: acentos[tu] }}>{nombres[tu]}</span> hoy
      </p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
        {[...grupos.values()].map((g) => (
          <button
            key={g.texto}
            onClick={() => irA(g.url)}
            className="shrink-0 rounded-full border border-borde bg-tarjeta px-3 py-1.5 text-sm transition hover:border-suave active:scale-95"
          >
            {g.texto}
            {g.veces > 1 && <span className="ml-1 text-suave">· {g.veces}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
