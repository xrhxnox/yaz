import { CLAVE_SESION, type Persona } from "./config";
import { tokenActual } from "./cuenta";
import { contarCarga } from "./cargas";

// Quién eres en este dispositivo (la sesión real la guarda Supabase Auth)
export type Sesion = { persona: Persona };

export type Pensamiento = { id: number; de: Persona; mensaje: string; created_at: string };

export type Ubicacion = { ciudad: string; lat: number; lon: number; zona: string };

export type Estado = {
  animos?: Record<Persona, { texto: string; updated_at: string } | null>;
  rachas?: { preguntas: number; fotos: number };
  visitas?: { veces: number; dias: number } | null;
  planes?: { id: number; texto: string }[];
  turnos?: string[];
  nombres: Record<Persona, string>;
  cumples: Record<Persona, string | null>;
  avatares: Record<Persona, string | null>;
  estilos?: Record<Persona, { minusculas?: boolean; fuente?: string }>;
  temas: Record<Persona, { fondo: string; acento: string } | null>;
  ubicaciones: Record<Persona, Ubicacion | null>;
  proximoEncuentro: string | null;
  recientes: Pensamiento[];
  hoy: Record<Persona, number>;
  total: Record<Persona, number>;
};

const CLAVE = CLAVE_SESION;

// Sesión guardada en el navegador, leída con useSyncExternalStore
let crudoCache: string | null | undefined;
let sesionCache: Sesion | null = null;
const oyentes = new Set<() => void>();

function leerCrudo(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function leerSesion(): Sesion | null {
  const crudo = leerCrudo();
  if (crudo !== crudoCache) {
    crudoCache = crudo;
    try {
      const s = JSON.parse(crudo || "null");
      sesionCache = s?.persona === "a" || s?.persona === "b" ? { persona: s.persona } : null;
    } catch {
      sesionCache = null;
    }
  }
  return sesionCache;
}

export function suscribirSesion(oyente: () => void) {
  oyentes.add(oyente);
  window.addEventListener("storage", oyente);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", oyente);
  };
}

export function guardarSesion(s: Sesion | null) {
  try {
    if (s) localStorage.setItem(CLAVE, JSON.stringify(s));
    else localStorage.removeItem(CLAVE);
  } catch {}
  oyentes.forEach((o) => o());
}

// Todas las llamadas cuentan para el cargador
export function api<T>(ruta: string, cuerpo?: unknown, metodo?: "PUT" | "PATCH" | "DELETE"): Promise<T> {
  return contarCarga(llamar<T>(ruta, cuerpo, metodo));
}

async function llamar<T>(ruta: string, cuerpo?: unknown, metodo?: "PUT" | "PATCH" | "DELETE"): Promise<T> {
  const token = await tokenActual();
  if (!token) throw Object.assign(new Error("Inicia sesión"), { status: 401 });
  const esForm = cuerpo instanceof FormData;
  const auth = { authorization: `Bearer ${token}` };
  const res = await fetch(ruta, {
    method: metodo ?? (cuerpo === undefined ? "GET" : "POST"),
    headers: esForm ? auth : { ...auth, "content-type": "application/json" },
    body: cuerpo === undefined ? undefined : esForm ? cuerpo : JSON.stringify(cuerpo),
    cache: "no-store",
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(datos.error || "Algo salió mal"), { status: res.status });
  return datos as T;
}

// Reduce la foto antes de subirla (las del celular pesan varios MB)
export async function comprimirImagen(archivo: File, maximo = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext("2d")!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  return new Promise((ok, falla) =>
    lienzo.toBlob((b) => (b ? ok(b) : falla(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.82),
  );
}

export function medianocheLocal(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
