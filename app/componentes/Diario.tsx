"use client";

import { useCallback, useState } from "react";
import { TIPOS_DIARIO, formatearFecha, hoyCompartido, otra, type Persona, type TipoDiario } from "@/lib/config";
import { useNombres, usePareja } from "@/lib/pareja";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, campo, junto, tarjeta, titulo } from "@/lib/estilos";
import Reacciones, { type Reaccion } from "./Reacciones";

type Entrada = {
  id: number;
  persona: Persona;
  fecha: string;
  tipo: TipoDiario;
  texto: string;
  link: string | null;
  created_at: string;
  reacciones?: Reaccion[];
};
type Datos = { fecha: string; hoy: string; entradas: Entrada[] };

const NOMBRE_TIPO = Object.fromEntries(TIPOS_DIARIO.map((t) => [t.id, t.nombre])) as Record<TipoDiario, string>;

// Mueve una fecha AAAA-MM-DD n días
function moverDia(fecha: string, n: number) {
  return new Date(Date.parse(fecha + "T12:00:00Z") + n * 86400e3).toISOString().slice(0, 10);
}

function dominio(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Corregir algo que anoté: tipo, texto y link
function EditarEntrada({ e, alListo, alCancelar }: { e: Entrada; alListo: () => Promise<void>; alCancelar: () => void }) {
  const [tipo, setTipo] = useState<TipoDiario>(e.tipo);
  const [texto, setTexto] = useState(e.texto);
  const [link, setLink] = useState(e.link ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const conLink = TIPOS_DIARIO.find((t) => t.id === tipo)!.conLink;

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!texto.trim()) return;
    setGuardando(true);
    try {
      await api("/api/diario", { id: e.id, tipo, texto, link: conLink ? link : "" }, "PATCH");
      await alListo();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {TIPOS_DIARIO.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTipo(t.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition ${tipo === t.id ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:bg-relleno"}`}
          >
            {t.nombre}
          </button>
        ))}
      </div>
      <input value={texto} onChange={(x) => setTexto(x.target.value)} maxLength={300} className={`${campo} text-sm`} autoFocus />
      {conLink && (
        <input value={link} onChange={(x) => setLink(x.target.value)} type="url" inputMode="url" maxLength={500} placeholder="Link (opcional)" className={`${campo} sin-mayuscula text-sm`} />
      )}
      {error && <p className="text-xs text-acento-texto">{error}</p>}
      <div className="flex gap-3 text-xs">
        <button disabled={guardando || !texto.trim()} className="font-medium text-acento-texto disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={alCancelar} className="text-suave">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Lo que anotó una persona en el día, en su color
function Lista({
  persona,
  yo,
  nombre,
  entradas,
  alBorrar,
  alCambiar,
}: {
  persona: Persona;
  yo: Persona;
  nombre: string;
  entradas: Entrada[];
  alBorrar: (e: Entrada) => void;
  alCambiar: () => Promise<void>;
}) {
  const color = usePareja().acentos[persona];
  const propias = persona === yo;
  const [editando, setEditando] = useState<number | null>(null);
  // Canciones ya pasadas a la playlist en esta visita
  const [enPlaylist, setEnPlaylist] = useState<Record<number, "guardando" | "listo" | string>>({});

  async function aPlaylist(e: Entrada) {
    setEnPlaylist((x) => ({ ...x, [e.id]: "guardando" }));
    try {
      await api("/api/canciones", { url: e.link, nota: e.texto, respaldo: e.texto });
      setEnPlaylist((x) => ({ ...x, [e.id]: "listo" }));
    } catch (err) {
      setEnPlaylist((x) => ({ ...x, [e.id]: (err as Error).message }));
    }
  }
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-suave">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span style={{ color }}>{nombre}</span>
      </p>
      {entradas.length === 0 ? (
        <p className="font-serif text-sm italic text-suave">{propias ? "Todavía no anotas nada." : "Todavía no anota nada."}</p>
      ) : (
        <ul className="space-y-4">
          {entradas.map((e) => (
            <li key={e.id} className="border-l-2 pl-3" style={{ borderColor: color }}>
              {editando === e.id ? (
                <EditarEntrada
                  e={e}
                  alCancelar={() => setEditando(null)}
                  alListo={async () => {
                    await alCambiar();
                    setEditando(null);
                  }}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] tracking-wide" style={{ color }}>
                      {NOMBRE_TIPO[e.tipo]}
                    </p>
                    <p className="font-serif text-lg leading-snug break-words">{e.texto}</p>
                    {e.link && (
                      <a
                        href={e.link}
                        target="_blank"
                        rel="noreferrer"
                        className="sin-mayuscula mt-0.5 inline-block text-xs text-suave underline decoration-borde underline-offset-4 hover:text-texto"
                      >
                        {dominio(e.link)} ↗
                      </a>
                    )}
                    {e.link && e.tipo === "escuche" && (
                      <button
                        onClick={() => aPlaylist(e)}
                        disabled={enPlaylist[e.id] === "guardando" || enPlaylist[e.id] === "listo"}
                        className="ml-3 text-xs text-suave transition hover:text-texto disabled:opacity-60"
                      >
                        {enPlaylist[e.id] === "listo" ? "En la playlist ✓" : enPlaylist[e.id] === "guardando" ? "Agregando…" : "+ Playlist"}
                      </button>
                    )}
                    {enPlaylist[e.id] && !["listo", "guardando"].includes(enPlaylist[e.id]) && (
                      <p className="mt-0.5 text-xs text-acento-texto">{enPlaylist[e.id]}</p>
                    )}
                    <Reacciones tipo="diario" id={e.id} duenio={e.persona} yo={yo} reacciones={e.reacciones} alCambiar={alCambiar} />
                    {propias && (
                      <button onClick={() => setEditando(e.id)} className="mt-1 text-xs text-suave transition hover:text-texto">
                        Editar
                      </button>
                    )}
                  </div>
                  {propias && (
                    <button onClick={() => alBorrar(e)} aria-label="Borrar" className="mt-1 shrink-0 p-1 text-suave hover:text-acento-texto">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Diario del día: qué hizo, comió, vio o escuchó cada quien
export default function Diario({ yo }: { yo: Persona }) {
  const nombres = useNombres();
  const tu = otra(yo);
  const [fecha, setFecha] = useState(() => hoyCompartido());
  const [datos, setDatos] = useState<Datos | null>(() => enCache(`/api/diario?fecha=${hoyCompartido()}`));
  const [error, setError] = useState("");
  const [tipo, setTipo] = useState<TipoDiario>("hice");
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>(`/api/diario?fecha=${fecha}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [fecha]);

  useCarga(cargar, 30000);

  const hoy = datos?.hoy ?? hoyCompartido();
  const actual = TIPOS_DIARIO.find((t) => t.id === tipo)!;
  const delDia = datos?.fecha === fecha ? datos.entradas : null;

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setGuardando(true);
    try {
      await api("/api/diario", { tipo, texto, link: actual.conLink ? link : "", fecha });
      setTexto("");
      setLink("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
    await cargar();
  }

  async function borrar(x: Entrada) {
    if (!confirm(`¿Borrar "${x.texto}"?`)) return;
    try {
      await api(`/api/diario?id=${x.id}`, undefined, "DELETE");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  const titular =
    fecha === hoy ? "Hoy" : fecha === moverDia(hoy, -1) ? "Ayer" : formatearFecha(fecha, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0">
      <section className={`${tarjeta} lg:sticky lg:top-8 lg:col-span-5`}>
        <p className={titulo}>
          ¿Qué hiciste?<span className={junto}>{titular}</span>
        </p>
        <form onSubmit={agregar} className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_DIARIO.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipo(t.id)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  tipo === t.id ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:bg-relleno"
                }`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder={`Ej. ${actual.ejemplo}`} className={`${campo} text-sm`} />
          {actual.conLink && (
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              type="url"
              inputMode="url"
              maxLength={500}
              placeholder="Link (opcional): YouTube, TikTok, Spotify…"
              className={`${campo} sin-mayuscula text-sm`}
            />
          )}
          <button disabled={guardando || !texto.trim()} className={`${botonPrimario} w-full py-2.5`}>
            {guardando ? "Guardando…" : "Anotar"}
          </button>
        </form>
      </section>

      <section className={`${tarjeta} lg:col-span-7`}>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setFecha((f) => moverDia(f, -1))}
            className="rounded-full border border-borde px-3 py-1 text-sm transition hover:bg-relleno"
            aria-label="Día anterior"
          >
            ←
          </button>
          <p className="text-center font-serif text-lg">{titular}</p>
          <button
            onClick={() => setFecha((f) => moverDia(f, 1))}
            disabled={fecha >= hoy}
            className="rounded-full border border-borde px-3 py-1 text-sm transition hover:bg-relleno disabled:opacity-30"
            aria-label="Día siguiente"
          >
            →
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-acento-texto">{error}</p>}
        {!delDia && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}
        {delDia && (
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <Lista persona={yo} yo={yo} nombre="Tú" entradas={delDia.filter((e) => e.persona === yo)} alBorrar={borrar} alCambiar={cargar} />
            <Lista persona={tu} yo={yo} nombre={nombres[tu]} entradas={delDia.filter((e) => e.persona === tu)} alBorrar={borrar} alCambiar={cargar} />
          </div>
        )}
      </section>
    </div>
  );
}
