"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, comprimirImagen, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import Avatar from "./Avatar";
import Corazon from "./Corazon";

type Respuesta = { persona: Persona; corazon: boolean; texto: string | null; created_at: string };
type Historia = { id: number; persona: Persona; url: string; texto: string | null; vista_at: string | null; created_at: string; respuestas: Respuesta[] };

// Sube fotos como historias (una por llamada); al terminar avisa para que la fila se actualice
export async function subirHistorias(archivos: File[], alAvanzar?: (texto: string) => void) {
  const lista = archivos.slice(0, 10);
  for (const [n, a] of lista.entries()) {
    alAvanzar?.(lista.length > 1 ? `${n + 1}/${lista.length}` : "…");
    const form = new FormData();
    form.set("foto", await comprimirImagen(a), "historia.jpg");
    await api("/api/historias", form);
  }
  window.dispatchEvent(new Event("historias:actualizar"));
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
function Visor({
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
  const [progreso, setProgreso] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [aviso, setAviso] = useState("");
  const presionado = useRef(0);
  const avance = useRef(0);
  const h = historias[i];
  const mia = h?.persona === yo;
  const detenida = pausa || escribiendo;

  const siguiente = useCallback(() => {
    avance.current = 0;
    setProgreso(0);
    setAviso("");
    if (i + 1 < historias.length) setI(i + 1);
    else alCerrar();
  }, [i, historias.length, alCerrar]);
  const siguienteRef = useRef(siguiente);
  useEffect(() => {
    siguienteRef.current = siguiente;
  }, [siguiente]);

  const anterior = () => {
    avance.current = 0;
    setProgreso(0);
    setAviso("");
    setI((x) => Math.max(0, x - 1));
  };

  // Avance automático (se detiene al presionar o al escribir)
  useEffect(() => {
    if (detenida) return;
    let ultimo = performance.now();
    let cuadro = 0;
    const paso = (ahora: number) => {
      avance.current += (ahora - ultimo) / DURACION;
      ultimo = ahora;
      if (avance.current >= 1) return siguienteRef.current();
      setProgreso(avance.current);
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [detenida, i]);

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

  async function responder(datos: { corazon?: boolean; texto?: string }) {
    try {
      await api("/api/historias", { id: h.id, respuesta: datos }, "PATCH");
      setAviso(datos.texto ? "Respuesta enviada" : "Le mandaste un corazón");
      setRespuesta("");
    } catch (e) {
      setAviso((e as Error).message);
    }
  }

  return (
    <div role="dialog" aria-label={`Historia de ${nombres[h.persona]}`} className="fixed inset-0 z-[80] flex flex-col bg-black text-white select-none">
      {/* Barritas de progreso */}
      <div className="flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {historias.map((x, n) => (
          <div key={x.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div className="h-full bg-white" style={{ width: `${n < i ? 100 : n === i ? progreso * 100 : 0}%` }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full p-[2px]" style={{ background: acentos[h.persona] }}>
          <Avatar persona={h.persona} size={30} className="border-2 border-black" />
        </span>
        <p className="text-sm font-medium">{mia ? "Tu historia" : nombres[h.persona]}</p>
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
          if (e.clientX - caja.left < caja.width * 0.3) anterior();
          else siguiente();
        }}
        onPointerCancel={() => setPausa(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={h.url} alt={h.texto ?? `Historia de ${nombres[h.persona]}`} draggable={false} className="pointer-events-none h-full w-full object-contain" />
        {h.texto && <p className="absolute inset-x-6 bottom-6 rounded-xl bg-black/50 px-3 py-2 text-center text-sm">{h.texto}</p>}
        {aviso && <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-xs text-black">{aviso}</p>}
      </div>

      <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {mia ? (
          <div className="space-y-1 text-sm">
            <p className="text-white/70">{h.vista_at ? `Visto por ${nombres[otra(yo)]} ✓` : "Todavía no la ve"}</p>
            {h.respuestas.map((r, n) => (
              <p key={n} className="flex items-center gap-1.5">
                <span style={{ color: acentos[r.persona] }}>{nombres[r.persona]}:</span>
                {r.corazon && <Corazon size={14} className="text-[#ff4d6d]" />}
                {r.texto && <span>{r.texto}</span>}
              </p>
            ))}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (respuesta.trim()) responder({ texto: respuesta });
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
              <button type="button" onClick={() => responder({ corazon: true })} aria-label="Mandar un corazón" className="p-1.5 transition active:scale-90">
                <Corazon size={26} contorno grosor={1.8} />
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
  subiendo,
  acento,
  alAbrir,
  alAgregar,
}: {
  persona: Persona;
  propia?: boolean;
  hay: boolean;
  nuevas: boolean;
  etiqueta: string;
  subiendo?: boolean;
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
            {subiendo ? "·" : "+"}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px] text-suave">{etiqueta}</span>
    </button>
  );
}

// ---------- Fila de historias (en Inicio y en el Muro) ----------
export default function Historias({ yo }: { yo: Persona }) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const [historias, setHistorias] = useState<Historia[] | null>(() => enCache<{ historias: Historia[] }>("/api/historias")?.historias ?? null);
  const [abierta, setAbierta] = useState<{ persona: Persona; inicio: number } | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const selector = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      setHistorias((await api<{ historias: Historia[] }>("/api/historias")).historias);
      setError("");
    } catch (e) {
      // Si aún no existe la tabla, la fila simplemente no aparece
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 60000);
  useEffect(() => {
    window.addEventListener("historias:actualizar", cargar);
    return () => window.removeEventListener("historias:actualizar", cargar);
  }, [cargar]);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!archivos.length) return;
    try {
      await subirHistorias(archivos, setSubiendo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubiendo(null);
    }
  }

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
          etiqueta={subiendo ? `Subiendo ${subiendo}` : "Tu historia"}
          subiendo={!!subiendo}
          acento={acentos[yo]}
          alAbrir={() => (mias.length ? setAbierta({ persona: yo, inicio: 0 }) : selector.current?.click())}
          alAgregar={() => selector.current?.click()}
        />
        <Circulo
          persona={tu}
          hay={suyas.length > 0}
          nuevas={sinVer.length > 0}
          etiqueta={suyas.length ? nombres[tu] : `${nombres[tu]} · sin historias`}
          acento={acentos[tu]}
          // Empieza por la primera que no ha visto
          alAbrir={() => setAbierta({ persona: tu, inicio: Math.max(0, suyas.findIndex((h) => !h.vista_at)) })}
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
