"use client";

import { useCallback, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { useNombres, usePareja } from "@/lib/pareja";
import { api } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, caja, campo, etiqueta, titulo } from "@/lib/estilos";
import Corazon from "./Corazon";

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

function Portada({ cancion, grande }: { cancion: Cancion; grande?: boolean }) {
  const color = usePareja().acentos[cancion.persona];
  const medida = grande ? "h-24 w-24" : "h-14 w-14";
  if (cancion.portada) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cancion.portada} alt="" loading="lazy" className={`${medida} shrink-0 rounded-lg bg-relleno object-cover`} />;
  }
  return (
    <div className={`${medida} flex shrink-0 items-center justify-center rounded-lg bg-relleno`} style={{ color }}>
      <svg width={grande ? 34 : 22} height={grande ? 34 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

function Fila({
  cancion,
  destacada,
  yo,
  alCorazon,
  alDestacar,
  alBorrar,
}: {
  cancion: Cancion;
  destacada?: boolean;
  yo: Persona;
  alCorazon: () => void;
  alDestacar: () => void;
  alBorrar: () => void;
}) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const color = acentos[cancion.persona];
  const mio = cancion[`corazon_${yo}`];
  const suyo = cancion[`corazon_${tu}`];
  const fecha = new Date(cancion.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

  return (
    <li className={`border-l-2 pl-3 ${destacada ? "border-b border-b-borde pb-5" : ""}`} style={{ borderLeftColor: color }}>
      {destacada && <p className={`${etiqueta} mb-2`}>Nuestra canción</p>}
      <div className="flex items-start gap-3">
        <a href={cancion.url} target="_blank" rel="noreferrer" className="shrink-0">
          <Portada cancion={cancion} grande={destacada} />
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={cancion.url}
            target="_blank"
            rel="noreferrer"
            className={`block font-serif leading-snug break-words hover:underline ${destacada ? "text-2xl" : "text-lg"}`}
          >
            {cancion.titulo}
          </a>
          <p className="mt-0.5 truncate text-xs text-suave">{[cancion.artista, servicio(cancion.url)].filter(Boolean).join(" · ")}</p>
          {cancion.nota && <p className="mt-1.5 font-serif text-sm italic break-words">“{cancion.nota}”</p>}
          <p className="mt-1.5 text-[11px] text-suave">
            <span style={{ color }}>{cancion.persona === yo ? "Tú" : nombres[cancion.persona]}</span> · {fecha}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
            <button onClick={alCorazon} aria-pressed={mio} className="flex items-center gap-1 transition hover:text-texto">
              <span style={{ color: mio ? acentos[yo] : undefined }}>
                <Corazon size={14} contorno={!mio} grosor={2} />
              </span>
              {mio ? "Te gusta" : "Me gusta"}
            </button>
            {suyo && (
              <span className="flex items-center gap-1" style={{ color: acentos[tu] }}>
                <Corazon size={12} /> a {nombres[tu]}
              </span>
            )}
            <button onClick={alDestacar} className="transition hover:text-texto">
              {cancion.destacada ? "Quitar de nuestra canción" : "Hacerla nuestra canción"}
            </button>
            {cancion.persona === yo && (
              <button onClick={alBorrar} className="transition hover:text-acento-texto">
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

// Playlist compartida: canciones con link (Spotify, YouTube, Apple Music…) y por qué la agregaron
export default function Playlist({ yo }: { yo: Persona }) {
  const nombres = useNombres();
  const { acentos } = usePareja();
  const [canciones, setCanciones] = useState<Cancion[] | null>(null);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [nota, setNota] = useState("");
  const [nombre, setNombre] = useState("");
  const [artista, setArtista] = useState("");
  const [guardando, setGuardando] = useState(false);

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
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const cambiar = (c: Cancion, cambios: Partial<Cancion>) => setCanciones((x) => x && x.map((y) => (y.id === c.id ? { ...y, ...cambios } : y)));

  const destacada = canciones?.find((c) => c.destacada);
  const resto = canciones?.filter((c) => !c.destacada) ?? [];
  const cuenta = (p: Persona) => canciones?.filter((c) => c.persona === p).length ?? 0;

  return (
    <div className="space-y-6">
      <form onSubmit={agregar} className={`${caja} space-y-2`}>
        <p className={titulo}>Agregar canción</p>
        <input
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
        {error && <p className="text-sm text-acento-texto">{error}</p>}
      </form>

      {!canciones && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}

      {canciones && (
        <p className="text-xs text-suave">
          {canciones.length} {canciones.length === 1 ? "canción" : "canciones"} ·{" "}
          <span style={{ color: acentos[yo] }}>{cuenta(yo)} tuyas</span> ·{" "}
          <span style={{ color: acentos[otra(yo)] }}>
            {cuenta(otra(yo))} de {nombres[otra(yo)]}
          </span>
        </p>
      )}

      {canciones && canciones.length === 0 && (
        <p className="py-6 text-center font-serif text-lg italic text-suave">Todavía no hay canciones. Agrega la primera.</p>
      )}

      {canciones && canciones.length > 0 && (
        <ul className="space-y-5">
          {(destacada ? [destacada, ...resto] : resto).map((c) => (
            <Fila
              destacada={c.destacada}
              key={c.id}
              cancion={c}
              yo={yo}
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
