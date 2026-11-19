"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import Avatar from "./Avatar";
import Corazon from "./Corazon";
import { componerHistorias } from "./ComponerHistoria";
import { posicionEn, useCajaImagen } from "./CajaImagen";
import { irA, perfilDe } from "@/lib/navegar";

type Respuesta = { persona: Persona; corazon: boolean; texto: string | null; created_at: string };
export type Historia = { id: number; persona: Persona; url: string; texto: string | null; texto_x?: number | null; texto_y?: number | null; vista_at: string | null; created_at: string; respuestas: Respuesta[]; me_gusta?: boolean };

// Sube fotos como historias (una por llamada); al terminar avisa para que la fila se actualice
// Texto que se lee sobre un color: oscuro sobre colores claros, blanco sobre oscuros
export function textoSobreColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1a1a1a" : "#ffffff";
}

// Cuánto se ve cada historia
const DURACION = 5000;

function hace(iso: string) {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h`;
}

// ---------- Visor a pantalla completa ----------
export function Visor({
  historias,
  inicio,
  yo,
  alCerrar,
  alCambiar,
}: {
  historias: Historia[];
  inicio: number;
  yo: Persona;
  alCerrar: () => void;
  alCambiar: () => Promise<void>;
}) {
  const { nombres, acentos } = usePareja();
  const [i, setI] = useState(inicio);
  // Cambia cada vez que se pasa de historia: reinicia la barrita aunque sea la misma
  const [vuelta, setVuelta] = useState(0);
  // La historia cuya foto ya cargó (la barrita no avanza antes)
  const [cargada, setCargada] = useState<number | null>(null);
  const [pausa, setPausa] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [aviso, setAviso] = useState("");
  // Corazones que ya di (se ven al instante, aunque el servidor tarde)
  const [corazones, setCorazones] = useState<Record<number, boolean>>(() => Object.fromEntries(historias.map((x) => [x.id, !!x.me_gusta])));
  const [latido, setLatido] = useState(0);
  const presionado = useRef(0);
  const { contenedor: cajaRef, alCargar: alCargarFoto, rect: rectFoto } = useCajaImagen();
  const h = historias[i];
  const mia = h?.persona === yo;
  const lista = !!h && cargada === h.id;
  const detenida = pausa || escribiendo || !lista;
  const meGusta = !!h && !!corazones[h.id];

  const ir = useCallback(
    (n: number) => {
      setAviso("");
      setVuelta((v) => v + 1);
      if (n >= historias.length) return alCerrar();
      setI(Math.max(0, n));
    },
    [historias.length, alCerrar],
  );

  // La siguiente se va bajando mientras ves esta
  useEffect(() => {
    const sig = historias[i + 1];
    if (sig) new Image().src = sig.url;
  }, [i, historias]);

  // Marcar como vista la historia de la otra persona
  useEffect(() => {
    if (h && !mia && !h.vista_at) api("/api/historias", { id: h.id, vista: true }, "PATCH").catch(() => {});
  }, [h, mia]);

  // Sin scroll de la página mientras está abierto; Escape cierra
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [alCerrar]);

  if (!h) return null;

  async function responder(texto: string) {
    try {
      await api("/api/historias", { id: h.id, respuesta: { texto } }, "PATCH");
      setAviso("Respuesta enviada");
      setRespuesta("");
    } catch (e) {
      setAviso((e as Error).message);
    }
  }

  async function alternarCorazon() {
    const valor = !meGusta;
    setCorazones((c) => ({ ...c, [h.id]: valor }));
    if (valor) setLatido((x) => x + 1);
    try {
      await api("/api/historias", { id: h.id, respuesta: { corazon: valor } }, "PATCH");
    } catch (e) {
      setCorazones((c) => ({ ...c, [h.id]: !valor }));
      setAviso((e as Error).message);
    }
  }

  return (
    <div role="dialog" aria-label={`Historia de ${nombres[h.persona]}`} className="visor-abrir fixed inset-0 z-[80] flex flex-col bg-black text-white select-none">
      {/* Barritas de progreso */}
      <div className="flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {historias.map((x, n) => (
          <div key={x.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            {n < i && <div className="h-full w-full bg-white" />}
            {n === i && (
              <div
                key={`${x.id}-${vuelta}`}
                className="barra-historia h-full bg-white"
                style={{ animationDuration: `${DURACION}ms`, animationPlayState: detenida ? "paused" : "running" }}
                onAnimationEnd={() => ir(i + 1)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full p-[2px]" style={{ background: acentos[h.persona] }}>
          <Avatar persona={h.persona} size={30} className="border-2 border-black" />
        </span>
        <button
          onClick={() => {
            alCerrar();
            irA(perfilDe(h.persona, yo));
          }}
          className="text-sm font-medium hover:underline"
        >
          {mia ? "Tu historia" : nombres[h.persona]}
        </button>
        <p className="text-xs text-white/60">{hace(h.created_at)}</p>
        <div className="ml-auto flex items-center gap-1">
          {mia && (
            <>
              <button
                onClick={async () => {
                  setPausa(true);
                  try {
                    await api("/api/historias", { id: h.id, alMuro: true }, "PATCH");
                    setAviso("Guardada en el muro");
                  } catch (e) {
                    setAviso((e as Error).message);
                  }
                }}
                className="rounded-full px-2.5 py-1 text-xs text-white/85 hover:bg-white/10"
              >
                Guardar en el muro
              </button>
              <button
                onClick={async () => {
                  setPausa(true);
                  if (!confirm("¿Borrar esta historia?")) return setPausa(false);
                  await api(`/api/historias?id=${h.id}`, undefined, "DELETE");
                  await alCambiar();
                  alCerrar();
                }}
                aria-label="Borrar historia"
                className="rounded-full p-2 text-white/85 hover:bg-white/10"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                </svg>
              </button>
            </>
          )}
          <button onClick={alCerrar} aria-label="Cerrar" className="rounded-full p-2 text-white hover:bg-white/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Foto: tocar a la izquierda regresa, a la derecha avanza; mantener presionado pausa */}
      <div
        ref={cajaRef}
        className="relative min-h-0 flex-1 touch-none"
        onPointerDown={() => {
          presionado.current = Date.now();
          setPausa(true);
        }}
        onPointerUp={(e) => {
          const largo = Date.now() - presionado.current > 250;
          setPausa(false);
          if (largo || escribiendo) return;
          const caja = e.currentTarget.getBoundingClientRect();
          if (e.clientX - caja.left < caja.width * 0.3) ir(i - 1);
          else ir(i + 1);
        }}
        onPointerCancel={() => setPausa(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={h.id}
          src={h.url}
          alt={h.texto ?? `Historia de ${nombres[h.persona]}`}
          draggable={false}
          decoding="async"
          onLoad={(e) => {
            alCargarFoto(e);
            setCargada(h.id);
          }}
          onError={() => setCargada(h.id)}
          className={`pointer-events-none h-full w-full object-contain transition-opacity duration-150 ${lista ? "opacity-100" : "opacity-0"}`}
        />
        {!lista && (
          <span className="absolute inset-0 flex items-center justify-center" aria-label="Cargando">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          </span>
        )}
        {h.texto && lista && (
          <p
            className="pointer-events-none absolute max-w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-4 py-2.5 text-center text-lg leading-snug font-semibold break-words shadow-lg"
            style={{
              ...posicionEn(rectFoto, h.texto_x ?? 0.5, h.texto_y ?? 0.5),
              background: acentos[h.persona],
              color: textoSobreColor(acentos[h.persona]),
            }}
          >
            {h.texto}
          </p>
        )}
        {aviso && <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-xs text-black">{aviso}</p>}
      </div>

      <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {mia ? (
          <div className="space-y-1 text-sm">
            <p className="text-white/70">{h.vista_at ? `Visto por ${nombres[otra(yo)]} ✓` : "Todavía no la ve"}</p>
            {h.respuestas.map((r, n) => (
              <p key={n} className="flex items-center gap-1.5">
                <span style={{ color: acentos[r.persona] }}>{nombres[r.persona]}:</span>
                {r.corazon && (
                  <span className="text-[#ff3b5c]">
                    <Corazon size={14} />
                  </span>
                )}
                {r.texto && <span>{r.texto}</span>}
              </p>
            ))}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (respuesta.trim()) responder(respuesta);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              onFocus={() => setEscribiendo(true)}
              onBlur={() => setEscribiendo(false)}
              maxLength={300}
              placeholder={`Responder a ${nombres[h.persona]}…`}
              className="min-w-0 flex-1 rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-base text-white outline-none placeholder:text-white/60 focus:border-white"
            />
            {respuesta.trim() ? (
              <button className="px-1 text-sm font-medium">Enviar</button>
            ) : (
              <button
                type="button"
                onClick={alternarCorazon}
                aria-pressed={meGusta}
                aria-label={meGusta ? "Quitar corazón" : "Mandar un corazón"}
                className="p-1.5 transition active:scale-90"
              >
                <span key={meGusta ? `si-${latido}` : "no"} className={meGusta ? "corazon-latido text-[#ff3b5c]" : "text-white"}>
                  <Corazon size={28} contorno={!meGusta} grosor={1.8} />
                </span>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

// Círculo con la foto de perfil: aro de color si hay historias nuevas, gris si ya se vieron
function Circulo({
  persona,
  propia,
  hay,
  nuevas,
  etiqueta,
  acento,
  alAbrir,
  alAgregar,
}: {
  persona: Persona;
  propia?: boolean;
  hay: boolean;
  nuevas: boolean;
  etiqueta: string;
  acento: string;
  alAbrir: () => void;
  alAgregar?: () => void;
}) {
  const anillo = hay ? (nuevas ? acento : "var(--borde)") : "transparent";
  return (
    <button onClick={alAbrir} disabled={!hay && !propia} className="flex w-[72px] flex-col items-center gap-1 disabled:opacity-50">
      <span className="relative rounded-full p-[3px]" style={{ background: anillo }}>
        <span className="block rounded-full border-[3px] border-fondo">
          <Avatar persona={persona} size={56} />
        </span>
        {propia && alAgregar && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              alAgregar();
            }}
            role="button"
            aria-label="Agregar historia"
            className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-fondo bg-acento text-sm leading-none font-bold text-sobre-acento"
          >
            +
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px] text-suave">{etiqueta}</span>
    </button>
  );
}

// ---------- Fila de historias (en Inicio y en el Muro) ----------
// Las historias de las últimas 24 horas (se actualizan solas y cuando alguien sube una)
export function useHistorias() {
  const [historias, setHistorias] = useState<Historia[] | null>(() => enCache<{ historias: Historia[] }>("/api/historias")?.historias ?? null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setHistorias((await api<{ historias: Historia[] }>("/api/historias")).historias);
      setError("");
    } catch (e) {
      // Si aún no existe la tabla, simplemente no aparecen
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 60000);
  useEffect(() => {
    window.addEventListener("historias:actualizar", cargar);
    return () => window.removeEventListener("historias:actualizar", cargar);
  }, [cargar]);

  return { historias, error, setError, cargar };
}

// Por dónde empezar a ver: la primera que no ha visto (las mías, desde la primera)
export function inicioDe(lista: Historia[], persona: Persona, yo: Persona) {
  return persona === yo ? 0 : Math.max(0, lista.findIndex((h) => !h.vista_at));
}

export default function Historias({ yo }: { yo: Persona }) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const { historias, error, cargar } = useHistorias();
  const [abierta, setAbierta] = useState<{ persona: Persona; inicio: number } | null>(null);
  const selector = useRef<HTMLInputElement>(null);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    // Antes de compartir: la vista previa para escribir sobre cada foto
    if (archivos.length) componerHistorias(archivos);
  }

  // Las fotos se bajan desde que se ven los círculos, para que al abrir salgan al instante
  useEffect(() => {
    for (const h of historias ?? []) new Image().src = h.url;
  }, [historias]);

  if (!historias) return null;
  const de = (p: Persona) => historias.filter((h) => h.persona === p);
  const mias = de(yo);
  const suyas = de(tu);
  const sinVer = suyas.filter((h) => !h.vista_at);

  return (
    <div>
      <div className="flex gap-3">
        <Circulo
          persona={yo}
          propia
          hay={mias.length > 0}
          nuevas
          etiqueta="Tu historia"
          acento={acentos[yo]}
          alAbrir={() => (mias.length ? setAbierta({ persona: yo, inicio: 0 }) : selector.current?.click())}
          alAgregar={() => selector.current?.click()}
        />
        <Circulo
          persona={tu}
          hay={suyas.length > 0}
          nuevas={sinVer.length > 0}
          etiqueta={nombres[tu]}
          acento={acentos[tu]}
          // Empieza por la primera que no ha visto
          alAbrir={() => setAbierta({ persona: tu, inicio: inicioDe(suyas, tu, yo) })}
        />
      </div>
      <input ref={selector} type="file" accept="image/*" multiple onChange={subir} className="hidden" />
      {error && historias.length > 0 && <p className="mt-1 text-xs text-acento-texto">{error}</p>}
      {abierta && (
        <Visor
          historias={de(abierta.persona)}
          inicio={abierta.inicio}
          yo={yo}
          alCambiar={cargar}
          alCerrar={() => {
            setAbierta(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
