"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vibrar } from "@/lib/vibrar";
import { confirmar } from "@/lib/confirmar";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import Avatar from "./Avatar";
import Corazon from "./Corazon";
import { componerHistorias } from "./ComponerHistoria";
import { useCajaImagen } from "./CajaImagen";
import TextoHistoria, { type EstiloTexto } from "./TextoHistoria";
import Pellizcable from "./Pellizcable";
import EditarAnimo, { hace as haceAnimo } from "./Animo";
import { irA, perfilDe } from "@/lib/navegar";
import Esqueleto from "./Esqueleto";

type Respuesta = { persona: Persona; corazon: boolean; texto: string | null; created_at: string };
export type Historia = { id: number; persona: Persona; url: string; texto: string | null; texto_x?: number | null; texto_y?: number | null; texto_estilo?: EstiloTexto | null; texto_tam?: number | null; vista_at: string | null; created_at: string; respuestas: Respuesta[]; me_gusta?: boolean };

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
  alOtra,
}: {
  historias: Historia[];
  inicio: number;
  yo: Persona;
  alCerrar: () => void;
  alCambiar: () => Promise<void>;
  // Deslizar de lado: pasar a las historias de la otra persona (si tiene)
  alOtra?: () => void;
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
  // Lo que respondí en esta visita (se ve al instante, sin esperar a que recargue)
  const [enviadas, setEnviadas] = useState<Record<number, string[]>>({});
  // La parte de la pantalla que se ve (sin el teclado): el visor se ajusta a ella para que la barra quede justo encima
  const [visible, setVisible] = useState<{ alto: number; arriba: number } | null>(null);
  // Dónde estaba la página detrás (iPhone la recorre al abrir el teclado; se regresa al salir)
  const scrollAntes = useRef(0);
  const campoRespuesta = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState("");
  // Corazones que ya di (se ven al instante, aunque el servidor tarde)
  const [corazones, setCorazones] = useState<Record<number, boolean>>(() => Object.fromEntries(historias.map((x) => [x.id, !!x.me_gusta])));
  const [latido, setLatido] = useState(0);
  const presionado = useRef(0);
  // Deslizar: hacia abajo cierra, de lado cambia de persona
  const gesto = useRef<{ x: number; y: number; modo: "abajo" | "lado" | null } | null>(null);
  const [arrastre, setArrastre] = useState({ x: 0, y: 0 });
  const [tocando, setTocando] = useState(false);
  // Cuántos dedos hay en la foto (con dos se está haciendo zoom)
  const dedos = useRef(0);
  const multitoque = useRef(false);
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

  // Al abrirse el teclado (sobre todo en iPhone) la parte visible se achica y se recorre:
  // el visor toma exactamente ese tamaño y lugar, así lo que escribes nunca queda tapado
  useEffect(() => {
    const vv = window.visualViewport;
    scrollAntes.current = window.scrollY;
    if (!vv) return;
    const medir = () => setVisible({ alto: Math.round(vv.height), arriba: Math.round(vv.offsetTop) });
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
      window.scrollTo(0, scrollAntes.current);
    };
  }, []);

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
      setEnviadas((e) => ({ ...e, [h.id]: [...(e[h.id] ?? []), texto.trim()] }));
      setAviso("Respuesta enviada");
      setRespuesta("");
      campoRespuesta.current?.blur();
    } catch (e) {
      setAviso((e as Error).message);
    }
  }

  async function alternarCorazon() {
    const valor = !meGusta;
    setCorazones((c) => ({ ...c, [h.id]: valor }));
    if (valor) {
      setLatido((x) => x + 1);
      vibrar();
    }
    try {
      await api("/api/historias", { id: h.id, respuesta: { corazon: valor } }, "PATCH");
    } catch (e) {
      setCorazones((c) => ({ ...c, [h.id]: !valor }));
      setAviso((e as Error).message);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={`Historia de ${nombres[h.persona]}`}
      className="visor-abrir fixed inset-0 z-[80] text-white select-none"
      style={{
        background: `rgba(0, 0, 0, ${Math.max(0.15, 1 - arrastre.y / 450)})`,
        ...(visible ? { top: visible.arriba, height: visible.alto, bottom: "auto" } : {}),
      }}
    >
      <div
        className={`flex h-full flex-col overflow-hidden bg-black ${tocando ? "" : "transition-transform duration-200"}`}
        style={{
          transform: `translate(${arrastre.x}px, ${arrastre.y}px) scale(${1 - Math.min(arrastre.y, 400) / 1600})`,
          borderRadius: arrastre.y > 0 ? 24 : 0,
        }}
      >
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
                  if (!(await confirmar({ titulo: "¿Borrar esta historia?", detalle: "Se quita para los dos.", accion: "Borrar", peligro: true }))) return setPausa(false);
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
        onPointerDown={(e) => {
          // Con dos dedos es zoom: ni se pasa de historia ni se desliza
          dedos.current++;
          if (dedos.current > 1) {
            multitoque.current = true;
            gesto.current = null;
            setArrastre({ x: 0, y: 0 });
            setTocando(false);
            return;
          }
          multitoque.current = false;
          presionado.current = Date.now();
          gesto.current = { x: e.clientX, y: e.clientY, modo: null };
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          setPausa(true);
        }}
        onPointerMove={(e) => {
          const g = gesto.current;
          if (!g) return;
          const dx = e.clientX - g.x;
          const dy = e.clientY - g.y;
          if (!g.modo && Math.hypot(dx, dy) > 12) {
            g.modo = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? "abajo" : null) : "lado";
            if (g.modo) setTocando(true);
          }
          if (g.modo === "abajo") setArrastre({ x: 0, y: Math.max(0, dy) });
          else if (g.modo === "lado") setArrastre({ x: dx, y: 0 });
        }}
        onPointerUp={(e) => {
          dedos.current = Math.max(0, dedos.current - 1);
          if (multitoque.current) {
            if (dedos.current === 0) {
              multitoque.current = false;
              setPausa(false);
            }
            return;
          }
          const g = gesto.current;
          gesto.current = null;
          setPausa(false);
          // Sin gesto empezado aquí (ej. el toque cerró el teclado): no hace nada más
          if (!g) return;
          const dx = g ? e.clientX - g.x : 0;
          const dy = g ? e.clientY - g.y : 0;
          setArrastre({ x: 0, y: 0 });
          setTocando(false);
          if (g?.modo === "abajo") return dy > 110 ? alCerrar() : undefined;
          if (g?.modo === "lado") {
            if (Math.abs(dx) < 70) return;
            if (alOtra) return alOtra();
            return dx < 0 ? ir(i + 1) : ir(i - 1);
          }
          // Se movió poquito o lo dejó presionado: solo era pausa
          const largo = Date.now() - presionado.current > 250;
          if (largo || escribiendo || Math.hypot(dx, dy) > 12) return;
          const caja = e.currentTarget.getBoundingClientRect();
          if (e.clientX - caja.left < caja.width * 0.3) ir(i - 1);
          else ir(i + 1);
        }}
        onPointerCancel={() => {
          dedos.current = Math.max(0, dedos.current - 1);
          if (dedos.current === 0) multitoque.current = false;
          gesto.current = null;
          setArrastre({ x: 0, y: 0 });
          setTocando(false);
          setPausa(false);
        }}
      >
        {/* La foto y su texto: se pueden agrandar pellizcando */}
        <Pellizcable key={h.id} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
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
        {h.texto && lista && (
          <TextoHistoria
            texto={h.texto}
            estilo={h.texto_estilo}
            tam={h.texto_tam}
            color={acentos[h.persona]}
            rect={rectFoto}
            x={h.texto_x ?? 0.5}
            y={h.texto_y ?? 0.5}
            className="pointer-events-none"
          />
        )}
        </Pellizcable>
        {!lista && (
          <span className="absolute inset-0 flex items-center justify-center" aria-label="Cargando">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          </span>
        )}
        {escribiendo && (
          <button
            type="button"
            aria-label="Dejar de escribir"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              campoRespuesta.current?.blur();
            }}
            className="fondo-aparecer absolute inset-0 z-10 bg-black/55"
          />
        )}
        {aviso && <p className="absolute inset-x-0 top-3 z-20 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-xs text-black">{aviso}</p>}
      </div>

      <div
        className={`relative z-20 bg-black px-3 pt-2 ${escribiendo ? "pb-2" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}
      >
        {mia ? (
          <div className="space-y-1 text-sm">
            <p className="text-white/70">{h.vista_at ? `Visto por ${nombres[otra(yo)]} ✓` : "Todavía no la ve"}</p>
            {h.respuestas.map((r, n) => (
              <p key={n} className="flex items-center gap-1.5">
                <span style={{ color: acentos[r.persona] }}>{nombres[r.persona]}:</span>
                {r.corazon && (
                  <span style={{ color: acentos[r.persona] }}>
                    <Corazon size={14} />
                  </span>
                )}
                {r.texto && <span>{r.texto}</span>}
              </p>
            ))}
          </div>
        ) : (
          <>
          {/* Lo que yo le respondí a esta historia */}
          {(() => {
            const mias = [...h.respuestas.filter((r) => r.persona === yo && r.texto).map((r) => r.texto!), ...(enviadas[h.id] ?? [])];
            return mias.length > 0 && !escribiendo ? (
              <div className="mb-2 space-y-1 text-sm">
                {mias.slice(-3).map((t, n) => (
                  <p key={n} className="flex items-baseline gap-1.5">
                    <span className="shrink-0 text-white/60">Respondiste:</span>
                    <span className="min-w-0 break-words">{t}</span>
                  </p>
                ))}
              </div>
            ) : null;
          })()}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (respuesta.trim()) responder(respuesta);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={campoRespuesta}
              enterKeyHint="send"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              onFocus={() => setEscribiendo(true)}
              onBlur={() => {
                setEscribiendo(false);
                requestAnimationFrame(() => window.scrollTo(0, scrollAntes.current));
              }}
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
                <span key={meGusta ? `si-${latido}` : "no"} className={meGusta ? "corazon-latido" : "text-white"} style={meGusta ? { color: acentos[yo] } : undefined}>
                  <Corazon size={28} contorno={!meGusta} grosor={1.8} />
                </span>
              </button>
            )}
          </form>
          </>
        )}
      </div>
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
  nota,
}: {
  persona: Persona;
  propia?: boolean;
  hay: boolean;
  nuevas: boolean;
  etiqueta: string;
  acento: string;
  alAbrir: () => void;
  alAgregar?: () => void;
  // Burbuja de estado encima del círculo (como las notas de Instagram); undefined = sin burbujas
  nota?: React.ReactNode;
}) {
  const anillo = hay ? (nuevas ? acento : "var(--borde)") : "transparent";
  return (
    <div className={`relative flex w-[72px] shrink-0 flex-col items-center ${nota !== undefined ? "pt-9" : ""}`}>
      {/* La burbuja se apoya sobre el círculo: crece hacia arriba si ocupa dos líneas */}
      {nota !== undefined && <div className="absolute inset-x-0 top-0 flex h-9 items-end justify-center">{nota}</div>}
    <button onClick={alAbrir} disabled={!hay && !propia} className="flex w-full flex-col items-center gap-1 disabled:opacity-50">
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
    </div>
  );
}

type Animos = Record<Persona, { texto: string; updated_at: string } | null>;

// La burbujita de estado sobre el círculo. La mía abre el editor; la de la otra persona se abre completa
function Nota({
  texto,
  mia,
  abierta,
  cuando,
  color,
  alTocar,
}: {
  texto: string | null;
  mia: boolean;
  abierta: boolean;
  cuando?: string;
  // Acento de quien la escribe
  color: string;
  alTocar: () => void;
}) {
  if (!texto && !mia) return null;
  // Con estado: rellena con el acento; sin estado (la mía): solo el borde punteado del acento
  const estilo: React.CSSProperties = texto ? { background: color, color: textoSobreColor(color), borderColor: color } : { borderColor: color, color };
  return (
    <button
      onClick={alTocar}
      aria-expanded={mia ? undefined : abierta}
      aria-label={mia ? (texto ? `Tu estado: ${texto}. Cambiar` : "Poner tu estado") : `Estado: ${texto}`}
      className={`z-10 rounded-2xl border px-2 py-1 text-[11px] leading-tight font-medium shadow-sm transition active:scale-95 ${
        abierta ? "absolute top-0 left-0 w-max max-w-[180px] text-left" : "relative w-max max-w-[84px] text-center"
      } ${texto ? "" : "border-dashed bg-tarjeta"}`}
      style={estilo}
    >
      <span className={abierta ? "block whitespace-normal" : "line-clamp-2 break-words"}>{texto ?? "+ Tu estado"}</span>
      {abierta && cuando && <span className="mt-0.5 block text-[10px] font-normal opacity-75">{cuando}</span>}
      {/* Colita de "pensamiento" */}
      {!abierta && (
        <span
          className={`absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border ${texto ? "" : "bg-tarjeta"}`}
          style={texto ? { background: color, borderColor: color } : { borderColor: color }}
          aria-hidden
        />
      )}
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

// children: lo que va a la derecha de los círculos (con dos personas sobra espacio ahí)
// animos: el estado de cada quien, como burbuja sobre su círculo (si no se pasa, no hay burbujas)
export default function Historias({
  yo,
  children,
  animos,
  alCambiarAnimo,
}: {
  yo: Persona;
  children?: React.ReactNode;
  animos?: Animos;
  alCambiarAnimo?: () => Promise<void>;
}) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const { historias, error, cargar } = useHistorias();
  const [abierta, setAbierta] = useState<{ persona: Persona; inicio: number } | null>(null);
  const [notaAbierta, setNotaAbierta] = useState(false);
  const [editandoAnimo, setEditandoAnimo] = useState(false);
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

  if (!historias)
    return error ? (
      <>{children}</>
    ) : (
      <div className="flex items-center gap-3">
        <Esqueleto tipo="historias" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  const de = (p: Persona) => historias.filter((h) => h.persona === p);
  const mias = de(yo);
  const suyas = de(tu);
  const sinVer = suyas.filter((h) => !h.vista_at);

  return (
    <div>
      <div className={`flex items-center ${animos ? "gap-5" : "gap-3"}`}>
        <Circulo
          persona={yo}
          propia
          hay={mias.length > 0}
          nuevas
          etiqueta="Tu historia"
          acento={acentos[yo]}
          alAbrir={() => (mias.length ? setAbierta({ persona: yo, inicio: 0 }) : selector.current?.click())}
          alAgregar={() => selector.current?.click()}
          nota={animos && <Nota texto={animos[yo]?.texto ?? null} mia abierta={false} color={acentos[yo]} alTocar={() => setEditandoAnimo(true)} />}
        />
        <Circulo
          persona={tu}
          hay={suyas.length > 0}
          nuevas={sinVer.length > 0}
          etiqueta={nombres[tu]}
          acento={acentos[tu]}
          // Empieza por la primera que no ha visto
          alAbrir={() => setAbierta({ persona: tu, inicio: inicioDe(suyas, tu, yo) })}
          nota={
            animos && (
              <Nota
                texto={animos[tu]?.texto ?? null}
                mia={false}
                color={acentos[tu]}
                abierta={notaAbierta}
                cuando={animos[tu] ? haceAnimo(animos[tu]!.updated_at) : undefined}
                alTocar={() => setNotaAbierta((x) => !x)}
              />
            )
          }
        />
        {children && <div className={`min-w-0 flex-1 self-center pl-1 ${animos ? "pt-8" : ""}`}>{children}</div>}
      </div>
      <input ref={selector} type="file" accept="image/*" multiple onChange={subir} className="hidden" />
      {/* Cambiar mi estado: hoja desde abajo */}
      {editandoAnimo && alCambiarAnimo && (
        <div className="fondo-aparecer fixed inset-0 z-[70] flex items-end justify-center bg-black/45 lg:items-center" onClick={() => setEditandoAnimo(false)} role="presentation">
          <div
            role="dialog"
            aria-label="Tu estado"
            onClick={(e) => e.stopPropagation()}
            className="hoja-subir w-full max-w-md rounded-t-3xl border border-borde bg-tarjeta px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:rounded-3xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-borde lg:hidden" />
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-serif text-2xl">Tu estado</p>
              <button onClick={() => setEditandoAnimo(false)} className="text-sm text-suave hover:text-texto">
                Cerrar
              </button>
            </div>
            <EditarAnimo
              tengo={!!animos?.[yo]}
              alCambiar={async () => {
                await alCambiarAnimo();
                setEditandoAnimo(false);
              }}
            />
          </div>
        </div>
      )}
      {error && historias.length > 0 && <p className="mt-1 text-xs text-acento-texto">{error}</p>}
      {abierta && (
        <Visor
          key={abierta.persona}
          historias={de(abierta.persona)}
          inicio={abierta.inicio}
          yo={yo}
          alCambiar={cargar}
          alCerrar={() => {
            setAbierta(null);
            cargar();
          }}
          // De lado: a las historias de la otra persona, si tiene
          alOtra={() => {
            const otraP = otra(abierta.persona);
            const lista = de(otraP);
            if (lista.length) setAbierta({ persona: otraP, inicio: inicioDe(lista, otraP, yo) });
          }}
        />
      )}
    </div>
  );
}
