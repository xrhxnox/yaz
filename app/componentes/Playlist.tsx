"use client";

import { useCallback, useEffect, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { useNombres, usePareja } from "@/lib/pareja";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, caja, campo, etiqueta, titulo } from "@/lib/estilos";
import Corazon from "./Corazon";
import Vacio, { ICONOS_VACIO } from "./Vacio";
import { useReproductor, type Pista } from "@/lib/reproductor";
import { hay, limpiar } from "@/lib/intencion";

type Cancion = {
  id: number;
  persona: Persona;
  url: string;
  titulo: string;
  artista: string | null;
  portada: string | null;
  nota: string | null;
  corazon_a: boolean;
  corazon_b: boolean;
  destacada: boolean;
  created_at: string;
};

// De dónde es el link, para mostrarlo junto al artista
function servicio(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^(www|m)\./, "");
    if (host.endsWith("spotify.com")) return "Spotify";
    if (host === "music.youtube.com") return "YouTube Music";
    if (host === "youtube.com" || host === "youtu.be") return "YouTube";
    if (host.endsWith("music.apple.com")) return "Apple Music";
    if (host.endsWith("soundcloud.com")) return "SoundCloud";
    return host;
  } catch {
    return "";
  }
}

// Buscador: cada palabra escrita debe ser el inicio de una palabra del nombre, artista o nota,
// sin importar acentos ni mayúsculas ("never ri", "astley")
const normalizar = (s: string | null) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function coincide(c: Cancion, busqueda: string) {
  const piezas = normalizar(busqueda).split(/\s+/).filter(Boolean);
  const palabras = normalizar(`${c.titulo} ${c.artista ?? ""} ${c.nota ?? ""}`).split(/[\s,.;:!?¿¡()"'-]+/);
  return piezas.every((p) => palabras.some((w) => w.startsWith(p)));
}

// Portada con borde del color de quien la agregó
function Portada({ cancion, medida }: { cancion: Cancion; medida: string }) {
  const color = usePareja().acentos[cancion.persona];
  return (
    <div className={`${medida} shrink-0 overflow-hidden rounded-xl border-2 bg-relleno`} style={{ borderColor: color }}>
      {cancion.portada ? (
        // Portadas de Spotify/YouTube: <img> normal (vienen de otros dominios)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cancion.portada} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center" style={{ color }}>
          <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Botón redondo de play: suena dentro de la app (o se abre afuera si el servicio no deja)
function Play({ cancion, grande, cola }: { cancion: Cancion; grande?: boolean; cola: Pista[] }) {
  const { actual, poner } = useReproductor();
  const sonando = actual?.id === cancion.id;
  const medida = grande ? "h-14 w-14" : "h-11 w-11";
  return (
    <button
      onClick={() => poner(cancion, cola)}
      aria-label={sonando ? `Sonando: ${cancion.titulo}` : `Reproducir ${cancion.titulo}`}
      className={`${medida} flex shrink-0 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-sm transition group-hover:scale-110 active:scale-95`}
    >
      {sonando ? (
        // Barritas de "sonando"
        <svg width="42%" height="42%" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="4" y="9" width="3.5" height="11" rx="1.2" className="animate-pulse" />
          <rect x="10.25" y="4" width="3.5" height="16" rx="1.2" className="animate-pulse [animation-delay:200ms]" />
          <rect x="16.5" y="11" width="3.5" height="9" rx="1.2" className="animate-pulse [animation-delay:400ms]" />
        </svg>
      ) : (
        // Triángulo centrado por su centro visual (no por su caja), para que no se vea corrido
        <svg width="42%" height="42%" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
        </svg>
      )}
    </button>
  );
}

// Corregir nombre, artista y nota de una canción que agregué
function EditarCancion({ cancion, alListo, alCancelar }: { cancion: Cancion; alListo: () => Promise<void>; alCancelar: () => void }) {
  const [tituloCancion, setTitulo] = useState(cancion.titulo);
  const [artista, setArtista] = useState(cancion.artista ?? "");
  const [nota, setNota] = useState(cancion.nota ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!tituloCancion.trim()) return;
    setGuardando(true);
    try {
      await api("/api/canciones", { id: cancion.id, titulo: tituloCancion, artista, nota }, "PATCH");
      await alListo();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="mt-3 space-y-2">
      <input value={tituloCancion} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Nombre de la canción" className={`${campo} text-sm`} autoFocus />
      <input value={artista} onChange={(e) => setArtista(e.target.value)} maxLength={120} placeholder="Artista" className={`${campo} text-sm`} />
      <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="¿Por qué la agregaste? (opcional)" className={`${campo} text-sm`} />
      {error && <p className="text-xs text-acento-texto">{error}</p>}
      <div className="flex gap-3 text-xs">
        <button disabled={guardando || !tituloCancion.trim()} className="font-medium text-acento-texto disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={alCancelar} className="text-suave">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Tarjeta de una canción: portada, nombre, artista y play. Lo demás va en "Más"
function Tarjeta({
  cancion,
  cola,
  yo,
  grande,
  alCorazon,
  alDestacar,
  alBorrar,
  alCambiar,
}: {
  cancion: Cancion;
  cola: Pista[];
  yo: Persona;
  grande?: boolean;
  alCorazon: () => void;
  alDestacar: () => void;
  alBorrar: () => void;
  alCambiar: () => Promise<void>;
}) {
  const { nombres, acentos } = usePareja();
  const [abierta, setAbierta] = useState(false);
  const [editando, setEditando] = useState(false);
  const tu = otra(yo);
  const mio = cancion[`corazon_${yo}`];
  const suyo = cancion[`corazon_${tu}`];
  const fecha = new Date(cancion.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const detalle = [cancion.artista, servicio(cancion.url)].filter(Boolean).join(" · ");

  return (
    <li
      className={`group rounded-2xl border border-borde bg-tarjeta transition hover:-translate-y-0.5 hover:shadow-lg ${grande ? "p-4 sm:col-span-2" : "p-3"}`}
      style={{ backgroundImage: `radial-gradient(220px 120px at 0% 0%, color-mix(in srgb, ${acentos[cancion.persona]} 14%, transparent), transparent 70%)` }}
    >
      {grande && <p className={`${etiqueta} mb-2`}>Nuestra canción</p>}
      <div className="flex items-center gap-3">
        <Portada cancion={cancion} medida={grande ? "h-24 w-24" : "h-16 w-16"} />
        <div className="min-w-0 flex-1">
          <p className={`leading-snug ${grande ? "line-clamp-2 font-serif text-2xl leading-tight" : "truncate font-medium"}`}>{cancion.titulo}</p>
          {detalle && <p className="truncate text-sm text-suave">{detalle}</p>}
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-suave">
            <span style={{ color: acentos[cancion.persona] }}>{cancion.persona === yo ? "Tú" : nombres[cancion.persona]}</span>
            <span>· {fecha}</span>
            {(mio || suyo) && (
              <span className="flex items-center gap-0.5">
                {mio && (
                  <span style={{ color: acentos[yo] }}>
                    <Corazon size={11} className="inline" />
                  </span>
                )}
                {suyo && (
                  <span style={{ color: acentos[tu] }}>
                    <Corazon size={11} className="inline" />
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        <Play cancion={cancion} grande={grande} cola={cola} />
      </div>

      {cancion.nota && <p className="mt-2 line-clamp-2 font-serif text-sm italic break-words">“{cancion.nota}”</p>}

      {editando ? (
        <EditarCancion
          cancion={cancion}
          alCancelar={() => setEditando(false)}
          alListo={async () => {
            await alCambiar();
            setEditando(false);
          }}
        />
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
          <button onClick={alCorazon} aria-pressed={mio} className="flex items-center gap-1 transition hover:text-texto">
            <span style={{ color: mio ? acentos[yo] : undefined }}>
              <Corazon size={14} contorno={!mio} grosor={2} />
            </span>
            {mio ? "Te gusta" : "Me gusta"}
          </button>
          <button onClick={() => setAbierta((x) => !x)} aria-expanded={abierta} className="transition hover:text-texto">
            {abierta ? "Menos" : "Más…"}
          </button>
          {abierta && (
            <>
              <button onClick={alDestacar} className="transition hover:text-texto">
                {cancion.destacada ? "Quitar de nuestra canción" : "Hacerla nuestra canción"}
              </button>
              {cancion.persona === yo && (
                <button onClick={() => setEditando(true)} className="transition hover:text-texto">
                  Editar
                </button>
              )}
              {cancion.persona === yo && (
                <button onClick={alBorrar} className="transition hover:text-acento-texto">
                  Quitar
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

// Playlist compartida: tarjetas con play que abren la canción en su app
export default function Playlist({ yo }: { yo: Persona }) {
  const nombres = useNombres();
  const { acentos } = usePareja();
  const [canciones, setCanciones] = useState<Cancion[] | null>(() => enCache<{ canciones: Cancion[] }>("/api/canciones")?.canciones ?? null);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [nota, setNota] = useState("");
  const [nombre, setNombre] = useState("");
  const [artista, setArtista] = useState("");
  const [guardando, setGuardando] = useState(false);
  // El formulario solo se abre al querer agregar una canción
  const [agregando, setAgregando] = useState(() => hay("cancion"));
  useEffect(() => limpiar("cancion"), []);
  const [busqueda, setBusqueda] = useState("");
  const { poner } = useReproductor();

  const cargar = useCallback(async () => {
    try {
      setCanciones((await api<{ canciones: Cancion[] }>("/api/canciones")).canciones);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 30000);

  async function hacer(accion: Promise<unknown>) {
    try {
      await accion;
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setGuardando(true);
    try {
      await api("/api/canciones", { url, nota, titulo: nombre, artista });
      setUrl("");
      setNota("");
      setNombre("");
      setArtista("");
      setError("");
      setAgregando(false);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const cambiar = (c: Cancion, cambios: Partial<Cancion>) => setCanciones((x) => x && x.map((y) => (y.id === c.id ? { ...y, ...cambios } : y)));

  const buscando = busqueda.trim().length > 0;
  const visibles = (canciones ?? []).filter((c) => !buscando || coincide(c, busqueda));
  // La canción fijada va hasta arriba en grande (salvo al buscar: ahí todas iguales)
  const destacada = buscando ? undefined : visibles.find((c) => c.destacada);
  const lista = destacada ? [destacada, ...visibles.filter((c) => c !== destacada)] : visibles;
  const cuenta = (p: Persona) => canciones?.filter((c) => c.persona === p).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-serif text-3xl leading-tight tracking-tight">Nuestra playlist</p>
          {canciones && (
            <p className="mt-0.5 text-xs text-suave">
              {canciones.length} {canciones.length === 1 ? "canción" : "canciones"} · <span style={{ color: acentos[yo] }}>{cuenta(yo)} tuyas</span> ·{" "}
              <span style={{ color: acentos[otra(yo)] }}>
                {cuenta(otra(yo))} de {nombres[otra(yo)]}
              </span>
            </p>
          )}
        </div>
        {!agregando && (
          <button
            onClick={() => {
              setAgregando(true);
              setError("");
            }}
            className={`${botonPrimario} shrink-0`}
          >
            + Agregar
          </button>
        )}
      </div>

      {agregando && (
        <form onSubmit={agregar} className={`${caja} space-y-2`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className={titulo}>Agregar canción</p>
            <button
              type="button"
              onClick={() => {
                setAgregando(false);
                setError("");
              }}
              className="text-sm text-suave transition hover:text-texto"
            >
              Cancelar
            </button>
          </div>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="Link de Spotify, YouTube, Apple Music…"
            className={`${campo} sin-mayuscula text-sm`}
          />
          {/* Con Spotify y YouTube se llenan solos; aquí se pueden escribir o corregir */}
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} placeholder="Nombre de la canción" className={`${campo} text-sm`} />
            <input value={artista} onChange={(e) => setArtista(e.target.value)} maxLength={120} placeholder="Artista" className={`${campo} text-sm`} />
          </div>
          <p className="text-xs text-suave">Con links de Spotify o YouTube, el nombre, el artista y la portada se llenan solos si los dejas vacíos.</p>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="¿Por qué la agregas? (opcional)" className={`${campo} text-sm`} />
          <button disabled={guardando || !url.trim()} className={`${botonPrimario} w-full py-2.5`}>
            {guardando ? "Buscando la canción…" : "Agregar a la playlist"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-acento-texto">{error}</p>}

      {/* Buscador: Enter pone la primera canción que coincide */}
      {!!canciones?.length && (
        <label className="flex items-center gap-2.5 rounded-full border border-borde bg-tarjeta px-4 text-suave transition focus-within:border-suave">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && lista[0]) {
                e.preventDefault();
                poner(lista[0], lista);
              }
            }}
            placeholder="Buscar canción o artista"
            aria-label="Buscar canción o artista"
            enterKeyHint="go"
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-texto outline-none placeholder:text-suave"
          />
        </label>
      )}

      {!canciones && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}

      {canciones && canciones.length === 0 && (
        !agregando && <Vacio icono={ICONOS_VACIO.musica} texto="Todavía no hay canciones." accion="Agregar la primera" alAccion={() => setAgregando(true)} />
      )}

      {canciones && canciones.length > 0 && lista.length === 0 && (
        <p className="py-6 text-center font-serif text-lg italic text-suave">Esa no está en la playlist.</p>
      )}

      {lista.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {lista.map((c) => (
            <Tarjeta
              key={c.id}
              cancion={c}
              cola={lista}
              yo={yo}
              grande={c === destacada}
              alCambiar={cargar}
              alCorazon={() => {
                const valor = !c[`corazon_${yo}`];
                cambiar(c, { [`corazon_${yo}`]: valor });
                hacer(api("/api/canciones", { id: c.id, corazon: valor }, "PATCH"));
              }}
              alDestacar={() => hacer(api("/api/canciones", { id: c.id, destacada: !c.destacada }, "PATCH"))}
              alBorrar={() => {
                if (confirm(`¿Quitar "${c.titulo}" de la playlist?`)) hacer(api(`/api/canciones?id=${c.id}`, undefined, "DELETE"));
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
