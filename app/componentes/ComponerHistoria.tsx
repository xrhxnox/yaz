"use client";

import { useEffect, useRef, useState } from "react";
import type { Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, comprimirImagen } from "@/lib/cliente";
import { vibrar } from "@/lib/vibrar";
import { textoSobreColor } from "./Historias";
import { useCajaImagen } from "./CajaImagen";
import TextoHistoria, { ESTILOS, TAM_DEF, TAM_MAX, TAM_MIN, limitarTam, type EstiloTexto } from "./TextoHistoria";

// Las historias se guardan con forma de pantalla de celular
const ANCHO = 1080;
const ALTO = 1920;
const ASPECTO = ANCHO / ALTO;

type Borrador = {
  blob: Blob;
  vista: string;
  // Tamaño real de la foto y su color promedio (para el fondo si no llena la pantalla)
  nw: number;
  nh: number;
  fondo: string;
  // Zoom (1 = llena la pantalla) y cuánto se movió el centro (fracción del ancho/alto)
  zoom: number;
  dx: number;
  dy: number;
  texto: string;
  x: number;
  y: number;
  estilo: EstiloTexto;
  tam: number;
  // Si es video: el archivo tal cual y cuánto dura (segundos)
  video?: File;
  duracion?: number;
};

// Videos: hasta 60 segundos y 50 MB (lo que aguanta la carpeta de videos)
const VIDEO_MAX_SEG = 60;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const TIPOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

async function prepararVideo(archivo: File): Promise<Borrador> {
  if (!TIPOS_VIDEO.includes(archivo.type)) throw new Error("Ese formato de video no se puede subir");
  if (archivo.size > VIDEO_MAX_BYTES) throw new Error("El video pesa más de 50 MB; prueba con uno más corto");
  const vista = URL.createObjectURL(archivo);
  const datos = await new Promise<{ w: number; h: number; d: number }>((ok, falla) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => ok({ w: v.videoWidth, h: v.videoHeight, d: v.duration });
    v.onerror = () => falla(new Error("No se pudo leer el video"));
    v.src = vista;
  });
  if (datos.d > VIDEO_MAX_SEG + 0.5) {
    URL.revokeObjectURL(vista);
    throw new Error(`El video dura más de ${VIDEO_MAX_SEG} segundos`);
  }
  return {
    blob: archivo,
    vista,
    nw: datos.w || 1080,
    nh: datos.h || 1920,
    fondo: "#000",
    zoom: 1,
    dx: 0,
    dy: 0,
    texto: "",
    x: 0.5,
    y: 0.5,
    estilo: "rect",
    tam: TAM_DEF,
    video: archivo,
    duracion: Number.isFinite(datos.d) && datos.d >= 0.5 ? datos.d : undefined,
  };
}

// Sube el video directo a Supabase (con el permiso temporal) mostrando cuánto lleva
function subirConAvance(url: string, archivo: File, alAvance: (fraccion: number) => void) {
  return new Promise<void>((ok, falla) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = (e) => e.lengthComputable && alAvance(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? ok() : falla(new Error(x.status === 413 ? "El video es muy pesado" : "No se pudo subir el video")));
    x.onerror = () => falla(new Error("Se cortó la conexión al subir el video"));
    const cuerpo = new FormData();
    cuerpo.append("cacheControl", "3600");
    cuerpo.append("", archivo);
    x.send(cuerpo);
  });
}

// Pide abrir la vista previa de historias con estas fotos (desde la fila de historias o desde "Crear")
export function componerHistorias(archivos: File[]) {
  window.dispatchEvent(new CustomEvent("historias:componer", { detail: archivos.slice(0, 10) }));
}

// Zoom con el que la foto se ve completa (sin recortar) dentro de la pantalla
function zoomCompleta(b: { nw: number; nh: number }) {
  const llenar = Math.max(ASPECTO / b.nw, 1 / b.nh);
  const completa = Math.min(ASPECTO / b.nw, 1 / b.nh);
  return completa / llenar;
}
const ZOOM_MAX = 5;
const limitarZoom = (b: Borrador, z: number) => Math.min(ZOOM_MAX, Math.max(zoomCompleta(b) * 0.5, z));
const llenaPantalla = (b: Borrador) => Math.abs(b.zoom - 1) < 0.01 && Math.abs(b.dx) < 0.01 && Math.abs(b.dy) < 0.01;

// Dónde queda la foto dentro de un marco de ancho w y alto h
function colocar(b: Borrador, w: number, h: number) {
  const escala = Math.max(w / b.nw, h / b.nh) * b.zoom;
  const ancho = b.nw * escala;
  const alto = b.nh * escala;
  return { left: w / 2 + b.dx * w - ancho / 2, top: h / 2 + b.dy * h - alto / 2, width: ancho, height: alto };
}

async function prepararFoto(archivo: File): Promise<Borrador> {
  const blob = await comprimirImagen(archivo, 2200);
  const bitmap = await createImageBitmap(blob);
  const punto = document.createElement("canvas");
  punto.width = punto.height = 12;
  const ctx = punto.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, 12, 12);
  // Promedio de una cuadrícula chiquita de la foto
  const datos = ctx.getImageData(0, 0, 12, 12).data;
  let [r, g, b] = [0, 0, 0];
  for (let k = 0; k < datos.length; k += 4) {
    r += datos[k];
    g += datos[k + 1];
    b += datos[k + 2];
  }
  const total = datos.length / 4;
  [r, g, b] = [r / total, g / total, b / total];
  const fondo = `rgb(${Math.round(r * 0.7)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.7)})`;
  const listo: Borrador = {
    blob,
    vista: URL.createObjectURL(blob),
    nw: bitmap.width,
    nh: bitmap.height,
    fondo,
    zoom: 1,
    dx: 0,
    dy: 0,
    texto: "",
    x: 0.5,
    y: 0.5,
    estilo: "rect",
    tam: TAM_DEF,
  };
  bitmap.close();
  return listo;
}

// La foto tal como quedó en la pantalla (con su zoom y su lugar), lista para subir
async function hornear(b: Borrador): Promise<Blob> {
  const bitmap = await createImageBitmap(b.blob);
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = b.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.imageSmoothingQuality = "high";
  const p = colocar(b, ANCHO, ALTO);
  ctx.drawImage(bitmap, p.left, p.top, p.width, p.height);
  bitmap.close();
  return new Promise((ok, falla) => lienzo.toBlob((x) => (x ? ok(x) : falla(new Error("No se pudo preparar la foto"))), "image/jpeg", 0.86));
}

// Vista previa antes de compartir: la foto llena la pantalla (se puede mover y hacer zoom) y el texto encima
export default function ComponerHistoria({ yo }: { yo: Persona }) {
  const { acentos } = usePareja();
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [i, setI] = useState(0);
  const [preparando, setPreparando] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const vistas = useRef<Borrador[]>([]);
  const { contenedor: cajaRef, elemento: cajaEl, rect: marco } = useCajaImagen(ASPECTO);
  const arrastrando = useRef(false);
  // Dedos sobre la pantalla: con uno se mueve la foto, con dos se hace zoom (o se cambia el tamaño del texto)
  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<{ d: number; valor: number; de: "texto" | "foto" } | null>(null);
  const moviendoFoto = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);

  function cambiar(cambios: Partial<Borrador>) {
    setBorradores((lista) => lista.map((b, n) => (n === i ? { ...b, ...cambios } : b)));
  }
  const distancia = () => {
    const [a, b] = [...dedos.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  // Mover el texto con el dedo, sin salirse de la foto
  function moverTexto(e: React.PointerEvent) {
    const el = cajaEl;
    if (!arrastrando.current || !el || dedos.current.size > 1) return;
    const c = el.getBoundingClientRect();
    const x = Math.min(0.95, Math.max(0.05, (e.clientX - c.left - marco.left) / marco.width));
    const y = Math.min(0.95, Math.max(0.05, (e.clientY - c.top - marco.top) / marco.height));
    cambiar({ x, y });
  }

  useEffect(() => {
    vistas.current = borradores;
  }, [borradores]);

  // Llegan fotos: se preparan y se abre la vista previa
  useEffect(() => {
    const alComponer = async (e: Event) => {
      const archivos = (e as CustomEvent<File[]>).detail;
      if (!archivos?.length) return;
      setError("");
      setPreparando(true);
      try {
        const nuevos: Borrador[] = [];
        const fallas: string[] = [];
        for (const a of archivos) {
          try {
            nuevos.push(await (a.type.startsWith("video/") ? prepararVideo(a) : prepararFoto(a)));
          } catch (err) {
            fallas.push((err as Error).message);
          }
        }
        setBorradores(nuevos);
        setI(0);
        if (fallas.length) setError(fallas[0]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setPreparando(false);
      }
    };
    window.addEventListener("historias:componer", alComponer);
    return () => window.removeEventListener("historias:componer", alComponer);
  }, []);

  // Liberar las vistas previas al salir
  useEffect(() => () => vistas.current.forEach((b) => URL.revokeObjectURL(b.vista)), []);

  // También se queda abierta si no se pudo preparar ninguno, para mostrar por qué
  const abierta = borradores.length > 0 || preparando || !!error;
  useEffect(() => {
    if (!abierta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [abierta]);

  function cerrar() {
    borradores.forEach((b) => URL.revokeObjectURL(b.vista));
    setBorradores([]);
    setError("");
  }

  async function compartir() {
    setError("");
    try {
      for (const [n, b] of borradores.entries()) {
        const cual = borradores.length > 1 ? `${n + 1} de ${borradores.length}` : "";
        setSubiendo(cual || "…");
        const texto = b.texto.trim()
          ? { texto: b.texto.trim(), texto_x: b.x.toFixed(3), texto_y: b.y.toFixed(3), texto_estilo: b.estilo, texto_tam: b.tam.toFixed(4) }
          : {};
        if (b.video) {
          // 1) permiso, 2) subir directo, 3) registrar la historia
          const { path, url } = await api<{ path: string; url: string }>("/api/historias", { subirVideo: { tipo: b.video.type } });
          await subirConAvance(url, b.video, (p) => setSubiendo(`${cual ? cual + " · " : ""}${Math.round(p * 100)}%`));
          await api("/api/historias", { video: path, duracion: b.duracion, ...texto });
        } else {
          const form = new FormData();
          form.set("foto", await hornear(b), "historia.jpg");
          for (const [k, v] of Object.entries(texto)) form.set(k, v);
          await api("/api/historias", form);
        }
      }
      vibrar();
      window.dispatchEvent(new Event("historias:actualizar"));
      cerrar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubiendo(null);
    }
  }

  if (!abierta) return null;
  const b = borradores[i];
  const color = acentos[yo];
  const foto = b && marco.width ? colocar(b, marco.width, marco.height) : null;

  function soltar(e: React.PointerEvent) {
    dedos.current.delete(e.pointerId);
    if (dedos.current.size < 2) pellizco.current = null;
    if (dedos.current.size === 0) moviendoFoto.current = null;
  }

  return (
    <div role="dialog" aria-label="Nueva historia" className="fixed inset-0 z-[85] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button onClick={cerrar} disabled={!!subiendo} className="rounded-full px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50">
          Cancelar
        </button>
        <p className="text-sm font-medium">Nueva historia{borradores.length > 1 ? ` · ${i + 1}/${borradores.length}` : ""}</p>
        <div className="flex items-center gap-2">
          {b?.texto.trim() && (
            <button
              onClick={() => cambiar({ estilo: b.estilo === "rect" ? "libre" : "rect" })}
              aria-label={`Estilo del texto: ${ESTILOS.find((e) => e.id === b.estilo)?.nombre}`}
              className={`flex h-8 w-8 items-center justify-center rounded-md border-[1.5px] text-sm font-bold ${b.estilo === "rect" ? "border-white bg-white text-black" : "border-dashed border-white text-white"}`}
            >
              A
            </button>
          )}
          <button
            onClick={compartir}
            disabled={!!subiendo || !borradores.length}
            className="rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 disabled:opacity-60"
            style={{ background: color, color: textoSobreColor(color) }}
          >
            {subiendo ? `Subiendo ${subiendo}` : "Compartir"}
          </button>
        </div>
      </div>

      <div
        ref={cajaRef}
        className="relative min-h-0 flex-1 touch-none select-none"
        onPointerDown={(e) => {
          if (!b) return;
          dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (dedos.current.size === 1 && !arrastrando.current && !b.video) moviendoFoto.current = { x: e.clientX, y: e.clientY, dx: b.dx, dy: b.dy };
          if (dedos.current.size === 2) {
            moviendoFoto.current = null;
            pellizco.current =
              arrastrando.current && b.texto.trim() ? { d: distancia(), valor: b.tam, de: "texto" } : b.video ? null : { d: distancia(), valor: b.zoom, de: "foto" };
          }
        }}
        onPointerMove={(e) => {
          if (!b || !dedos.current.has(e.pointerId)) return;
          dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const p = pellizco.current;
          if (p && dedos.current.size >= 2 && p.d > 0) {
            const factor = distancia() / p.d;
            if (p.de === "texto") cambiar({ tam: limitarTam(p.valor * factor) });
            else cambiar({ zoom: limitarZoom(b, p.valor * factor) });
            return;
          }
          const m = moviendoFoto.current;
          if (m && marco.width) cambiar({ dx: m.dx + (e.clientX - m.x) / marco.width, dy: m.dy + (e.clientY - m.y) / marco.height });
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onWheel={(e) => b && !b.video && cambiar({ zoom: limitarZoom(b, b.zoom * Math.exp(-e.deltaY * 0.0015)) })}
      >
        {b ? (
          <>
            {/* El marco con forma de pantalla: lo que quede fuera no se guarda */}
            <div className="absolute overflow-hidden rounded-xl" style={{ ...marco, background: b.fondo }}>
              {b.video ? (
                <video key={b.vista} src={b.vista} autoPlay muted loop playsInline className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
              ) : (
                foto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.vista} alt="" draggable={false} className="pointer-events-none absolute" style={{ ...foto, maxWidth: "none" }} />
                )
              )}
            </div>
            {b.texto.trim() && (
              <TextoHistoria
                texto={b.texto}
                estilo={b.estilo}
                tam={b.tam}
                color={color}
                rect={marco}
                x={b.x}
                y={b.y}
                onPointerDown={(e) => {
                  arrastrando.current = true;
                  try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
                }}
                onPointerMove={moverTexto}
                onPointerUp={() => (arrastrando.current = false)}
                onPointerCancel={() => (arrastrando.current = false)}
                className="cursor-grab touch-none select-none active:cursor-grabbing"
              />
            )}
            {b.texto.trim() && (
              <div className="absolute top-1/2 left-2 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full bg-black/35 px-1 py-2">
                <span className="text-base leading-none font-bold" aria-hidden>
                  A
                </span>
                <input
                  type="range"
                  min={TAM_MIN}
                  max={TAM_MAX}
                  step={0.001}
                  value={b.tam}
                  onChange={(e) => cambiar({ tam: Number(e.target.value) })}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Tamaño del texto"
                  className="h-44 w-5 accent-white"
                  style={{ writingMode: "vertical-lr", direction: "rtl" }}
                />
                <span className="text-[10px] leading-none font-bold" aria-hidden>
                  A
                </span>
              </div>
            )}
            {/* Ver la foto completa o volver a llenar la pantalla (los videos se ven completos) */}
            {!b.video && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => (llenaPantalla(b) ? cambiar({ zoom: zoomCompleta(b), dx: 0, dy: 0 }) : cambiar({ zoom: 1, dx: 0, dy: 0 }))}
              className="absolute flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium backdrop-blur"
              style={{ left: marco.left + 10, top: marco.top + marco.height - 42 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {llenaPantalla(b) ? <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5M9 9l-5-5M15 9l5-5M9 15l-5 5M15 15l5 5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
              </svg>
              {llenaPantalla(b) ? "Ver completa" : "Llenar pantalla"}
            </button>
            )}
            {b.video && !!b.duracion && b.duracion >= 1 && (
              <span className="pointer-events-none absolute rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium" style={{ left: marco.left + 10, top: marco.top + marco.height - 38 }}>
                ▶ {Math.round(b.duracion)} s
              </span>
            )}
          </>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-white/70">{preparando ? "Preparando…" : "No se pudo abrir"}</p>
        )}
        {error && <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-xs text-black">{error}</p>}
      </div>

      {b && (
        <div className="space-y-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input
            value={b.texto}
            onChange={(e) => cambiar({ texto: e.target.value })}
            maxLength={200}
            placeholder={`Escribe algo sobre ${b.video ? "el video" : "la foto"} (opcional)…`}
            aria-describedby="ayuda-historia"
            className="w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-base text-white outline-none placeholder:text-white/60 focus:border-white"
          />
          {b.texto.trim() && (
            <div className="flex justify-center gap-2" role="group" aria-label="Estilo del texto">
              {ESTILOS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => cambiar({ estilo: e.id })}
                  aria-pressed={b.estilo === e.id}
                  className={`rounded-full border px-3 py-1 text-xs ${b.estilo === e.id ? "border-white bg-white text-black" : "border-white/40 text-white"}`}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          )}
          <p id="ayuda-historia" className="text-center text-[11px] text-white/60">
            {b.video
              ? b.texto.trim()
                ? "Arrastra el texto para moverlo · pellizca para hacerlo más grande"
                : "Así se verá tu video"
              : b.texto.trim()
                ? "Arrastra para mover la foto o el texto · pellizca para hacerlos más grandes"
                : "Arrastra para mover la foto · pellizca para hacer zoom"}
          </p>
          {borradores.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {borradores.map((x, n) => (
                <button
                  key={x.vista}
                  onClick={() => setI(n)}
                  aria-label={`${x.video ? "Video" : "Foto"} ${n + 1}`}
                  className={`h-14 w-10 shrink-0 overflow-hidden rounded-md border-2 ${n === i ? "border-white" : "border-transparent opacity-60"}`}
                >
                  {x.video ? (
                    <video src={x.vista} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.vista} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
