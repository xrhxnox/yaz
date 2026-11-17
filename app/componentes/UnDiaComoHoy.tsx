"use client";

import { useCallback, useState } from "react";
import { TIPOS_DIARIO, formatearFecha, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { etiqueta, tarjeta, titulo } from "@/lib/estilos";
import Imagen from "./Imagen";

type Recuerdo = {
  fecha: string;
  hace: string;
  fotos: { url: string; persona: Persona; nota: string | null }[];
  momentos: string[];
  diario: { persona: Persona; tipo: string; texto: string }[];
};

const NOMBRE_TIPO: Record<string, string> = Object.fromEntries(TIPOS_DIARIO.map((t) => [t.id, t.nombre]));

// Lo que pasó en esta misma fecha en meses anteriores; si no hay nada, no se muestra
export default function UnDiaComoHoy() {
  const { nombres, acentos } = usePareja();
  const [recuerdos, setRecuerdos] = useState<Recuerdo[] | null>(() => enCache<{ recuerdos: Recuerdo[] }>("/api/recuerdo")?.recuerdos ?? null);

  const cargar = useCallback(async () => {
    try {
      setRecuerdos((await api<{ recuerdos: Recuerdo[] }>("/api/recuerdo")).recuerdos);
    } catch {
      // Es un extra: si falla, simplemente no aparece
    }
  }, []);

  useCarga(cargar);

  if (!recuerdos?.length) return null;

  return (
    <section className={tarjeta}>
      <p className={titulo}>Un día como hoy</p>
      <div className="mt-3 space-y-5">
        {recuerdos.map((r) => (
          <article key={r.fecha}>
            <p className={etiqueta}>
              {r.hace} · {formatearFecha(r.fecha, { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {r.momentos.map((m) => (
              <p key={m} className="mt-1 font-serif text-xl leading-snug">
                {m}
              </p>
            ))}
            {r.fotos.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {r.fotos.map((f, i) => (
                  <Imagen key={i}src={f.url} alt={f.nota ?? `Foto de ${nombres[f.persona]}`} className="aspect-square w-full rounded-lg bg-relleno" />
                ))}
              </div>
            )}
            {r.diario.length > 0 && (
              <ul className="mt-2 space-y-1">
                {r.diario.map((d, i) => (
                  <li key={i} className="text-sm leading-snug">
                    <span style={{ color: acentos[d.persona] }}>{nombres[d.persona]}</span>
                    <span className="text-suave"> · {NOMBRE_TIPO[d.tipo] ?? d.tipo}: </span>
                    <span className="font-serif">{d.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
