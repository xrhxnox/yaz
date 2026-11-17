"use client";

import { useCallback, useState } from "react";
import { formatearFecha, hoyCompartido, otra, type Persona } from "@/lib/config";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { usePareja } from "@/lib/pareja";
import { botonPrimario, botonSecundario, caja, campo, enlace, etiqueta, tarjeta, titulo as tituloSeccion } from "@/lib/estilos";

type Recibida = {
  id: number;
  de: Persona;
  titulo: string;
  contenido: string | null;
  abrir_desde: string | null;
  condicion: string | null;
  abierta_at: string | null;
  disponible: boolean;
  created_at: string;
};
type Enviada = Omit<Recibida, "disponible" | "contenido"> & { contenido: string };

const CONDICIONES = ["Cuando me extrañes", "Cuando estés triste", "Cuando no puedas dormir", "Cuando necesites ánimo", "Cuando estés feliz"];

function Escribir({ para, alTerminar }: { para: string; alTerminar: (guardada: boolean) => void }) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [modo, setModo] = useState<"fecha" | "momento" | "ya">("fecha");
  const [fecha, setFecha] = useState("");
  const [condicion, setCondicion] = useState(CONDICIONES[0]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (modo === "fecha" && !fecha) return setError("Elige la fecha en que se podrá abrir");
    setGuardando(true);
    setError("");
    try {
      await api("/api/cartas", {
        titulo,
        contenido,
        abrir_desde: modo === "fecha" ? fecha : null,
        condicion: modo === "momento" ? condicion : null,
      });
      alTerminar(true);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className={`${caja} space-y-3`}>
      <p className={tituloSeccion}>Carta para {para}</p>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Título (ej. Para nuestro aniversario)" className={campo} />
      <textarea
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        maxLength={10000}
        rows={8}
        placeholder="Escribe tu carta…"
        className={`${campo} resize-y font-serif text-base leading-relaxed`}
      />

      <div>
        <p className={etiqueta}>¿Cuándo se puede abrir?</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-full bg-relleno p-1 text-sm">
          {(
            [
              ["fecha", "En una fecha"],
              ["momento", "En un momento"],
              ["ya", "Ya"],
            ] as const
          ).map(([id, nombre]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModo(id)}
              className={`rounded-full py-1.5 transition ${modo === id ? "bg-acento font-medium text-sobre-acento" : "text-suave hover:text-texto"}`}
            >
              {nombre}
            </button>
          ))}
        </div>
        {modo === "fecha" && (
          <input type="date" value={fecha} min={hoyCompartido()} onChange={(e) => setFecha(e.target.value)} className={`${campo} mt-2`} />
        )}
        {modo === "momento" && (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CONDICIONES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondicion(c)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${condicion === c ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:bg-relleno"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input value={condicion} onChange={(e) => setCondicion(e.target.value)} maxLength={120} className={`${campo} mt-2 text-sm`} />
          </>
        )}
      </div>

      {error && <p className="text-sm text-acento-texto">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => alTerminar(false)} className={botonSecundario}>
          Cancelar
        </button>
        <button disabled={!titulo.trim() || !contenido.trim() || guardando} className={`${botonPrimario} flex-1`}>
          {guardando ? "Enviando…" : "Enviar carta"}
        </button>
      </div>
    </form>
  );
}

function cuando(c: { abrir_desde: string | null; condicion: string | null }) {
  if (c.abrir_desde) return `Se abre el ${formatearFecha(c.abrir_desde)}`;
  if (c.condicion) return c.condicion;
  return "Se puede abrir cuando quieras";
}

// Cartas que se abren en una fecha o en un momento especial
export default function Cartas({ yo }: { yo: Persona }) {
  const { nombres, acentos } = usePareja();
  const [datos, setDatos] = useState<{ recibidas: Recibida[]; enviadas: Enviada[] } | null>(() => enCache("/api/cartas"));
  const [error, setError] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [leyendo, setLeyendo] = useState<number | null>(null);
  const tu = otra(yo);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/api/cartas"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar);

  async function abrir(c: Recibida) {
    if (!c.abierta_at && c.condicion && !confirm(`Esta carta es para "${c.condicion.toLowerCase()}". ¿La abres ahora?`)) return;
    try {
      if (!c.abierta_at) await api("/api/cartas", { id: c.id }, "PATCH");
      await cargar();
      setLeyendo(c.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function borrar(c: Enviada) {
    if (!confirm(`¿Borrar la carta "${c.titulo}"?`)) return;
    try {
      await api(`/api/cartas?id=${c.id}`, undefined, "DELETE");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  return (
    <div className="space-y-6">
      {escribiendo ? (
        <Escribir
          para={nombres[tu]}
          alTerminar={(guardada) => {
            setEscribiendo(false);
            if (guardada) cargar();
          }}
        />
      ) : (
        <button onClick={() => setEscribiendo(true)} className={`${botonPrimario} w-full py-2.5`}>
          Escribir una carta para {nombres[tu]}
        </button>
      )}

      {error && <p className="text-sm text-acento-texto">{error}</p>}
      {!datos && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}

      {datos && (
        <section className={tarjeta}>
          <p className={tituloSeccion}>Para ti</p>
          {datos.recibidas.length === 0 ? (
            <p className="mt-2 font-serif italic text-suave">Todavía no tienes cartas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-borde">
              {datos.recibidas.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill={c.abierta_at ? "none" : "currentColor"}
                      fillOpacity={0.15}
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                      style={{ color: acentos[c.de] }}
                      className="mt-1 shrink-0"
                      aria-hidden
                    >
                      {c.abierta_at ? <path d="M3 10l9-6 9 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10l9 6 9-6" /> : <path d="M3 6h18v12H3zM3 6l9 7 9-7" />}
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-xl leading-tight">{c.titulo}</p>
                      <p className="text-xs text-suave">
                        De <span style={{ color: acentos[c.de] }}>{nombres[c.de]}</span> · {cuando(c)}
                      </p>
                    </div>
                    {c.disponible ? (
                      <button onClick={() => (leyendo === c.id ? setLeyendo(null) : abrir(c))} className={`${botonSecundario} shrink-0 py-1.5 text-xs`}>
                        {leyendo === c.id ? "Cerrar" : c.abierta_at ? "Leer" : "Abrir"}
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-relleno px-3 py-1.5 text-xs text-suave">Cerrada</span>
                    )}
                  </div>
                  {leyendo === c.id && c.contenido && (
                    <div className="mt-3 rounded-xl bg-relleno p-4 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                      {c.contenido}
                      <p className="mt-3 text-right text-sm italic text-suave">— {nombres[c.de]}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {datos && datos.enviadas.length > 0 && (
        <section className={tarjeta}>
          <p className={tituloSeccion}>Las que escribiste</p>
          <ul className="mt-2 divide-y divide-borde">
            {datos.enviadas.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg leading-tight">{c.titulo}</p>
                  <p className="text-xs text-suave">
                    {cuando(c)} · {c.abierta_at ? `${nombres[tu]} ya la abrió` : "Sin abrir"}
                  </p>
                </div>
                <button onClick={() => borrar(c)} className={`${enlace} shrink-0 text-xs`}>
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
