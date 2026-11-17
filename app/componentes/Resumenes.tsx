"use client";

import { useCallback, useState } from "react";
import { formatearFecha, type Persona } from "@/lib/config";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { usePareja } from "@/lib/pareja";
import { etiqueta, numero, tarjeta, titulo as tituloSeccion } from "@/lib/estilos";
import Imagen from "./Imagen";

type Mes = { n: number; inicio: string; fin: string; terminado: boolean };
type Resumen = {
  n: number;
  inicio: string;
  fin: string;
  terminado: boolean;
  mensajes: Record<Persona, number>;
  fotos: { total: number; dias: number; muestra: { url: string; persona: Persona; nota: string | null }[] };
  momentos: { titulo: string; fecha: string; creado_por: Persona }[];
  preguntas: { total: number; destacada: { fecha: string; pregunta: string; a: string; b: string } | null };
  pendientes: string[];
  visitas: { inicio: string; fin: string; ciudad: string | null }[];
  cartas: number;
};

const corto = { day: "numeric", month: "short" } as const;

function Cifra({ n, texto }: { n: number; texto: string }) {
  return (
    <div>
      <p className={`${numero} text-4xl text-acento-texto`}>{n}</p>
      <p className="text-xs text-suave">{texto}</p>
    </div>
  );
}

// El resumen de un mes: todo lo que pasó, como portada de periódico
function ResumenMes({ r }: { r: Resumen }) {
  const { nombres, acentos } = usePareja();
  const totalMensajes = r.mensajes.a + r.mensajes.b;
  return (
    <article className="space-y-6">
      <header className="border-b border-borde pb-4 text-center">
        <p className="text-xs tracking-wide text-suave">
          {r.terminado ? "Resumen del mes" : "En curso"} · {formatearFecha(r.inicio, corto)} – {formatearFecha(r.fin, { ...corto, year: "numeric" })}
        </p>
        <h2 className="mt-1 font-serif text-5xl tracking-tight">
          Mes <span className="text-acento-texto italic">{r.n}</span>
        </h2>
      </header>

      <section className="grid grid-cols-3 gap-4 border-b border-borde pb-5">
        <Cifra n={totalMensajes} texto={totalMensajes === 1 ? "mensaje" : "mensajes"} />
        <Cifra n={r.fotos.total} texto={r.fotos.total === 1 ? "foto" : "fotos"} />
        <Cifra n={r.preguntas.total} texto={r.preguntas.total === 1 ? "pregunta respondida" : "preguntas respondidas"} />
      </section>

      {totalMensajes > 0 && (
        <p className="font-serif text-lg leading-snug">
          <span style={{ color: acentos.a }}>{nombres.a}</span> mandó {r.mensajes.a} y <span style={{ color: acentos.b }}>{nombres.b}</span> mandó{" "}
          {r.mensajes.b} mensajes
          {r.fotos.dias > 0 && `, y compartieron fotos ${r.fotos.dias} ${r.fotos.dias === 1 ? "día" : "días"}`}.
        </p>
      )}

      {r.fotos.muestra.length > 0 && (
        <section className="grid grid-cols-3 gap-2">
          {r.fotos.muestra.map((f) => (
            <Imagen key={f.url} src={f.url} alt={f.nota ?? `Foto de ${nombres[f.persona]}`} className="aspect-square w-full rounded-lg bg-relleno" />
          ))}
        </section>
      )}

      {r.preguntas.destacada && (
        <section className={tarjeta}>
          <p className={etiqueta}>La pregunta del mes · {formatearFecha(r.preguntas.destacada.fecha, corto)}</p>
          <p className="mt-1 font-serif text-2xl leading-tight">{r.preguntas.destacada.pregunta}</p>
          <div className="mt-3 space-y-3">
            {(["a", "b"] as Persona[]).map((p) => (
              <div key={p} className="border-l-2 pl-3" style={{ borderColor: acentos[p] }}>
                <p className="font-serif text-lg leading-snug">{r.preguntas.destacada![p]}</p>
                <p className="text-xs text-suave">— {nombres[p]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {r.momentos.length > 0 && (
        <section className={tarjeta}>
          <p className={tituloSeccion}>Momentos</p>
          <ul className="mt-2 space-y-1.5">
            {r.momentos.map((m) => (
              <li key={m.fecha + m.titulo} className="flex items-baseline gap-2">
                <span className="text-xs" style={{ color: acentos[m.creado_por] }}>
                  {formatearFecha(m.fecha, corto)}
                </span>
                <span className="font-serif text-lg">{m.titulo}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.visitas.length > 0 && (
        <section className={tarjeta}>
          <p className={tituloSeccion}>Nos vimos</p>
          <ul className="mt-2 space-y-1">
            {r.visitas.map((v) => (
              <li key={v.inicio} className="font-serif text-lg">
                {v.ciudad ?? "Visita"} <span className="font-sans text-xs text-suave">{formatearFecha(v.inicio, corto)} – {formatearFecha(v.fin, corto)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.pendientes.length > 0 && (
        <section className={tarjeta}>
          <p className={tituloSeccion}>Lo que tachamos de la lista</p>
          <ul className="mt-2 list-inside list-disc space-y-1 font-serif text-lg marker:text-acento-texto">
            {r.pendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {r.cartas > 0 && (
        <p className="text-center font-serif italic text-suave">
          Y se escribieron {r.cartas} {r.cartas === 1 ? "carta" : "cartas"}.
        </p>
      )}
    </article>
  );
}

// Un resumen por cada "mes" de la relación (del 15 al 14)
export default function Resumenes() {
  const [meses, setMeses] = useState<Mes[] | null>(() => enCache<{ meses: Mes[] }>("/api/resumen")?.meses ?? null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const d = await api<{ meses: Mes[] }>("/api/resumen");
      setMeses(d.meses);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar);

  async function abrir(n: number) {
    setAbierto(n);
    setResumen(null);
    try {
      setResumen(await api<Resumen>(`/api/resumen?mes=${n}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (abierto !== null) {
    return (
      <div className="space-y-4">
        <button onClick={() => setAbierto(null)} className="text-sm text-suave hover:text-texto">
          ← Todos los meses
        </button>
        {error && <p className="text-sm text-acento-texto">{error}</p>}
        {resumen ? <ResumenMes r={resumen} /> : !error && <p className="py-10 text-center text-sm text-suave">Armando el resumen…</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-acento-texto">{error}</p>}
      {!meses && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}
      {meses && (
        <ul className={`${tarjeta} divide-y divide-borde`}>
          {meses.map((m) => (
            <li key={m.n}>
              <button onClick={() => abrir(m.n)} className="flex w-full items-baseline justify-between gap-3 py-3 text-left">
                <span className="font-serif text-2xl">
                  Mes <span className="text-acento-texto">{m.n}</span>
                </span>
                <span className="text-xs text-suave">
                  {m.terminado ? "" : "En curso · "}
                  {formatearFecha(m.inicio, corto)} – {formatearFecha(m.fin, corto)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
