"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vibrar } from "@/lib/vibrar";
import { confirmar } from "@/lib/confirmar";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, comprimirImagen, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, caja, campo } from "@/lib/estilos";
import Avatar from "./Avatar";
import Corazon from "./Corazon";
import Historias from "./Historias";
import Vacio, { ICONOS_VACIO } from "./Vacio";
import { perfilDe } from "@/lib/navegar";
import { hay, limpiar } from "@/lib/intencion";
import Esqueleto from "./Esqueleto";
import Pellizcable from "./Pellizcable";

type Comentario = { id: number; persona: Persona; texto: string; created_at: string };
export type Publicacion = {
  id: number;
  persona: Persona;
  fecha: string;
  texto: string | null;
  created_at: string;
  fotos: { id: number; url: string; mini?: string | null }[];
  likes: Persona[];
  comentarios: Comentario[];
};
type Datos = { publicaciones: Publicacion[]; maximo: number };
type Elegida = { blob: Blob; mini: Blob; vista: string };

function hace(iso: string) {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "ayer" : `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: d > 300 ? "numeric" : undefined });
}

// ---------- Publicar ----------
function Componer({ maximo, alListo, alCancelar }: { maximo: number; alListo: () => Promise<void>; alCancelar: () => void }) {
  const [elegidas, setElegidas] = useState<Elegida[]>([]);
  const [texto, setTexto] = useState("");
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState("");
  const selector = useRef<HTMLInputElement>(null);

  // Liberar las vistas previas al cerrar
  const vistas = useRef<Elegida[]>([]);
  useEffect(() => {
    vistas.current = elegidas;
  }, [elegidas]);
  useEffect(() => () => vistas.current.forEach((e) => URL.revokeObjectURL(e.vista)), []);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    const cupo = maximo - elegidas.length;
    if (archivos.length > cupo) setError(`Máximo ${maximo} fotos por publicación.`);
    setProgreso("Preparando…");
    try {
      const nuevas: Elegida[] = [];
      for (const a of archivos.slice(0, Math.max(cupo, 0))) {
        const blob = await comprimirImagen(a);
        // Versión chica para las cuadrículas
        const mini = await comprimirImagen(a, 400);
        nuevas.push({ blob, mini, vista: URL.createObjectURL(mini) });
      }
      setElegidas((x) => [...x, ...nuevas]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgreso(null);
    }
  }

  async function publicar() {
    if (!elegidas.length) return;
    setError("");
    try {
      setProgreso("Publicando…");
      const { id } = await api<{ id: number }>("/api/muro", { texto });
      for (const [i, e] of elegidas.entries()) {
        setProgreso(elegidas.length > 1 ? `Subiendo ${i + 1} de ${elegidas.length}…` : "Subiendo…");
        const form = new FormData();
        form.set("id", String(id));
        form.set("foto", e.blob, "foto.jpg");
        form.set("miniatura", e.mini, "mini.jpg");
        await api("/api/muro", form, "PUT");
      }
      vibrar();
      await alListo();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgreso(null);
    }
  }

  return (
    <div className={`${caja} space-y-3`}>
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-2xl">Nueva publicación</p>
        <button onClick={alCancelar} className="text-sm text-suave hover:text-texto">
          Cancelar
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {elegidas.map((e, i) => (
          <div key={e.vista} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-relleno">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.vista} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            <button
              onClick={() => {
                URL.revokeObjectURL(e.vista);
                setElegidas((x) => x.filter((y) => y !== e));
              }}
              aria-label="Quitar foto"
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
        {elegidas.length < maximo && (
          <button
            onClick={() => selector.current?.click()}
            className="flex h-24 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-borde text-xs text-suave hover:border-suave hover:text-texto"
          >
            <span className="text-2xl leading-none">+</span>
            {elegidas.length ? "Otra" : "Fotos"}
          </button>
        )}
        <input ref={selector} type="file" accept="image/*" multiple onChange={elegir} className="hidden" />
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={2} placeholder="Escribe algo (opcional)…" className={`${campo} resize-none text-sm`} />
      {error && <p className="text-sm text-acento-texto">{error}</p>}
      <button onClick={publicar} disabled={!elegidas.length || !!progreso} className={`${botonPrimario} w-full py-2.5`}>
        {progreso ?? "Publicar"}
      </button>
    </div>
  );
}

// ---------- Carrusel con doble toque para dar me gusta ----------
function Carrusel({ fotos, color, alDobleToque }: { fotos: Publicacion["fotos"]; color: string; alDobleToque: () => void }) {
  const [indice, setIndice] = useState(0);
  const [latido, setLatido] = useState(0);
  const ultimoToque = useRef(0);
  // Si hubo dos dedos (zoom), al soltar no cuenta como doble toque
  const dedos = useRef(0);
  const multitoque = useRef(false);

  return (
    <div className="relative">
      <div
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(e) => {
          const c = e.currentTarget;
          setIndice(Math.round(c.scrollLeft / c.clientWidth));
        }}
        onPointerDown={() => {
          dedos.current++;
          if (dedos.current > 1) multitoque.current = true;
        }}
        onPointerCancel={() => {
          dedos.current = Math.max(0, dedos.current - 1);
          if (!dedos.current) multitoque.current = false;
        }}
        onPointerUp={() => {
          dedos.current = Math.max(0, dedos.current - 1);
          if (multitoque.current) {
            if (!dedos.current) multitoque.current = false;
            ultimoToque.current = 0;
            return;
          }
          const ahora = Date.now();
          if (ahora - ultimoToque.current < 300) {
            alDobleToque();
            vibrar([10, 40, 14]);
            setLatido((x) => x + 1);
            ultimoToque.current = 0;
          } else ultimoToque.current = ahora;
        }}
      >
        {fotos.map((f, i) => (
          <Pellizcable key={f.id} className="aspect-[4/5] w-full shrink-0 snap-center bg-relleno">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={`Foto ${i + 1} de ${fotos.length}`} loading="lazy" draggable={false} className="h-full w-full object-cover select-none" />
          </Pellizcable>
        ))}
      </div>
      {latido > 0 && (
        <span key={latido} className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ color }}>
          {/* El corazón grande en el color de quien lo da, y unos chiquitos que salen volando */}
          <span className="corazon-doble inline-block drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <Corazon size={110} />
          </span>
          {[-46, -22, 0, 24, 48].map((x, n) => (
            <span key={n} className="corazon-chispa absolute" style={{ "--x": `${x}px`, animationDelay: `${80 + n * 40}ms` } as React.CSSProperties}>
              <Corazon size={14 + (n % 3) * 4} />
            </span>
          ))}
        </span>
      )}
      {fotos.length > 1 && (
        <>
          <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">
            {indice + 1}/{fotos.length}
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {fotos.map((f, i) => (
              <span key={f.id} className={`h-1.5 w-1.5 rounded-full ${i === indice ? "bg-white" : "bg-white/45"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Las publicaciones de alguien a pantalla completa, empezando en la que tocaste (como en Instagram) ----------
export function VerPublicaciones({
  lista,
  inicio,
  titulo,
  yo,
  alCerrar,
  alCambiar,
  alLike,
}: {
  lista: Publicacion[];
  inicio: number;
  titulo: string;
  yo: Persona;
  alCerrar: () => void;
  alCambiar: () => Promise<void>;
  alLike: (id: number, valor: boolean) => void;
}) {
  const caja = useRef<HTMLDivElement>(null);

  // Abre justo en la publicación que tocaste
  useEffect(() => {
    const el = caja.current?.querySelector<HTMLElement>(`#ver-${inicio}`);
    if (el && caja.current) caja.current.scrollTop = el.offsetTop - 60;
  }, [inicio]);

  // Sin scroll de la página de atrás mientras está abierta; Escape cierra
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [alCerrar]);

  return (
    <div ref={caja} role="dialog" aria-label="Publicaciones" className="fixed inset-0 z-[75] overflow-y-auto bg-fondo">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-borde bg-fondo/90 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur">
        <button onClick={alCerrar} aria-label="Regresar" className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-relleno">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="leading-tight">
          <p className="text-[11px] text-suave">{titulo}</p>
          <p className="font-serif text-lg">Publicaciones</p>
        </div>
      </header>
      <div className="mx-auto max-w-md space-y-5 px-3 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {lista.map((p) => (
          <div key={p.id} id={`ver-${p.id}`}>
            <Tarjeta p={p} yo={yo} alLike={(v) => alLike(p.id, v)} alCambiar={alCambiar} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Una publicación ----------
function Tarjeta({ p, yo, alCambiar, alLike }: { p: Publicacion; yo: Persona; alCambiar: () => Promise<void>; alLike: (valor: boolean) => void }) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const mio = p.persona === yo;
  const meGusta = p.likes.includes(yo);
  const [verTodos, setVerTodos] = useState(false);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(p.texto ?? "");
  const campoComentario = useRef<HTMLInputElement>(null);
  const comentarios = verTodos || p.comentarios.length <= 2 ? p.comentarios : p.comentarios.slice(-2);

  async function comentar(e: React.FormEvent) {
    e.preventDefault();
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      await api("/api/comentarios", { publicacion: p.id, texto: comentario });
      setComentario("");
      await alCambiar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article id={`pub-${p.id}`} className="scroll-mt-4 overflow-hidden rounded-2xl border border-borde bg-tarjeta">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <a href={`#${perfilDe(p.persona, yo)}`} aria-label={`Perfil de ${nombres[p.persona]}`} className="rounded-full p-[2px]" style={{ background: acentos[p.persona] }}>
          <Avatar persona={p.persona} size={30} className="border-2 border-tarjeta" />
        </a>
        <div className="min-w-0 flex-1 leading-tight">
          <a href={`#${perfilDe(p.persona, yo)}`} className="text-sm font-medium hover:underline" style={{ color: acentos[p.persona] }}>
            {mio ? "Tú" : nombres[p.persona]}
          </a>
          <p className="text-[11px] text-suave">{hace(p.created_at)}</p>
        </div>
        {mio && (
          <div className="relative">
            <button onClick={() => setMenu((x) => !x)} aria-label="Opciones" className="rounded-full px-2 py-1 text-lg leading-none text-suave hover:bg-relleno">
              ⋯
            </button>
            {menu && (
              <div className="absolute top-full right-0 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-borde bg-tarjeta text-sm shadow-lg">
                <button
                  onClick={() => {
                    setEditando(true);
                    setMenu(false);
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-relleno"
                >
                  Editar texto
                </button>
                <button
                  onClick={async () => {
                    setMenu(false);
                    if (!(await confirmar({ titulo: "¿Borrar esta publicación?", detalle: "Se borran sus fotos y comentarios.", accion: "Borrar", peligro: true }))) return;
                    await api(`/api/muro?id=${p.id}`, undefined, "DELETE");
                    await alCambiar();
                  }}
                  className="block w-full px-3 py-2 text-left text-acento-texto hover:bg-relleno"
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <Carrusel fotos={p.fotos} color={acentos[yo]} alDobleToque={() => !meGusta && alLike(true)} />

      <div className="space-y-1.5 px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-4">
          <button onClick={() => alLike(!meGusta)} aria-pressed={meGusta} aria-label={meGusta ? "Quitar me gusta" : "Me gusta"} className="transition active:scale-90">
            <span style={{ color: meGusta ? acentos[yo] : undefined }}>
              <Corazon size={24} contorno={!meGusta} grosor={1.8} />
            </span>
          </button>
          <button onClick={() => campoComentario.current?.focus()} aria-label="Comentar" className="text-texto">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
              <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.45L3.5 20.5l1.55-4.4A8.5 8.5 0 1 1 20.5 11.5z" />
            </svg>
          </button>
        </div>
        {p.likes.length > 0 && (
          <p className="text-sm">
            {p.likes.length === 2 ? (
              "Les gusta a los dos"
            ) : (
              <>
                Le gusta a <span style={{ color: acentos[p.likes[0]] }}>{p.likes[0] === yo ? "ti" : nombres[p.likes[0]]}</span>
              </>
            )}
          </p>
        )}

        {editando ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api("/api/muro", { id: p.id, texto }, "PATCH");
              await alCambiar();
              setEditando(false);
            }}
            className="space-y-2"
          >
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={2} className={`${campo} resize-none text-sm`} autoFocus />
            <div className="flex gap-2">
              <button className={botonPrimario}>Guardar</button>
              <button type="button" onClick={() => setEditando(false)} className={botonSecundario}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          p.texto && (
            <p className="text-sm leading-snug break-words whitespace-pre-line">
              <a href={`#${perfilDe(p.persona, yo)}`} className="mr-1.5 font-medium hover:underline" style={{ color: acentos[p.persona] }}>
                {nombres[p.persona]}
              </a>
              {p.texto}
            </p>
          )
        )}

        {p.comentarios.length > 2 && !verTodos && (
          <button onClick={() => setVerTodos(true)} className="text-sm text-suave">
            Ver los {p.comentarios.length} comentarios
          </button>
        )}
        {comentarios.map((c) => (
          <p key={c.id} className="group text-sm leading-snug break-words">
            <a href={`#${perfilDe(c.persona, yo)}`} className="mr-1.5 font-medium hover:underline" style={{ color: acentos[c.persona] }}>
              {nombres[c.persona]}
            </a>
            {c.texto}
            {c.persona === yo && (
              <button
                onClick={async () => {
                  if (!(await confirmar({ titulo: "¿Borrar tu comentario?", accion: "Borrar", peligro: true }))) return;
                  await api(`/api/comentarios?id=${c.id}`, undefined, "DELETE");
                  await alCambiar();
                }}
                aria-label="Borrar comentario"
                className="ml-2 text-xs text-suave hover:text-acento-texto"
              >
                ×
              </button>
            )}
          </p>
        ))}

        <form onSubmit={comentar} className="flex items-center gap-2 pt-1">
          <input
            ref={campoComentario}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
            placeholder={`Comenta algo para ${mio ? nombres[tu] : nombres[p.persona]}…`}
            className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-suave"
          />
          {comentario.trim() && (
            <button disabled={enviando} className="text-sm font-medium text-acento-texto disabled:opacity-50">
              Publicar
            </button>
          )}
        </form>
      </div>
    </article>
  );
}

// ---------- El muro ----------
export default function Muro({
  yo,
  racha,
  animos,
  alCambiarAnimo,
}: {
  yo: Persona;
  racha?: number;
  animos?: Record<Persona, { texto: string; updated_at: string } | null>;
  alCambiarAnimo?: () => Promise<void>;
}) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const [datos, setDatos] = useState<Datos | null>(() => enCache("/api/muro"));
  const [error, setError] = useState("");
  const [vista, setVista] = useState<"lista" | "cuadricula">("lista");
  const [filtro, setFiltro] = useState<"todos" | Persona>("todos");
  const [componiendo, setComponiendo] = useState(() => hay("publicar"));
  useEffect(() => limpiar("publicar"), []);
  // Publicación abierta desde la cuadrícula (se ven todas a pantalla completa, empezando en esa)
  const [abierta, setAbierta] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/api/muro"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 60000);

  function like(p: Publicacion, valor: boolean) {
    if (valor) vibrar();
    setDatos((d) => d && { ...d, publicaciones: d.publicaciones.map((x) => (x.id === p.id ? { ...x, likes: valor ? [...x.likes.filter((l) => l !== yo), yo] : x.likes.filter((l) => l !== yo) } : x)) });
    api("/api/muro", { id: p.id, like: valor }, "PATCH").catch((e) => setError((e as Error).message));
  }

  const visibles = (datos?.publicaciones ?? []).filter((p) => filtro === "todos" || p.persona === filtro);

  return (
    <div className="space-y-4">
      {/* Junto a las historias: el título, la racha y el botón para publicar */}
      <Historias yo={yo} animos={animos} alCambiarAnimo={alCambiarAnimo}>
        <p className="font-serif text-3xl leading-none tracking-tight">Muro</p>
        {!!racha && (
          <p className="mt-1 text-[11px] leading-tight text-suave">
            Racha: {racha} {racha === 1 ? "día" : "días"} con fotos
          </p>
        )}
        {!componiendo && (
          <button onClick={() => setComponiendo(true)} className={`${botonPrimario} mt-2 py-1.5`}>
            + Publicar
          </button>
        )}
      </Historias>
      <div className="flex items-center justify-between gap-3">
        {/* Filtro por persona */}
        <div className="flex gap-1 rounded-full bg-relleno p-1 text-sm">
          {(["todos", yo, tu] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1 transition ${filtro === f ? "bg-tarjeta font-medium shadow-sm" : "text-suave hover:text-texto"}`}
              style={filtro === f && f !== "todos" ? { color: acentos[f] } : undefined}
            >
              {f === "todos" ? "Todos" : f === yo ? "Tú" : nombres[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {/* Lista o cuadrícula */}
          {(
            [
              ["lista", "Ver en lista", "M4 5h16v6H4zM4 15h16v4H4z"],
              ["cuadricula", "Ver en cuadrícula", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"],
            ] as const
          ).map(([id, etiqueta, d]) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              aria-label={etiqueta}
              aria-pressed={vista === id}
              className={`rounded-full p-2 transition ${vista === id ? "bg-relleno text-texto" : "text-suave hover:text-texto"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
                <path d={d} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {componiendo && (
        <Componer
          maximo={datos?.maximo ?? 10}
          alCancelar={() => setComponiendo(false)}
          alListo={async () => {
            setComponiendo(false);
            setVista("lista");
            await cargar();
          }}
        />
      )}

      {error && <p className="text-sm text-acento-texto">{error}</p>}
      {!datos && !error && <Esqueleto tipo="publicaciones" />}
      {datos && visibles.length === 0 && !componiendo && (
        <Vacio
          icono={ICONOS_VACIO.foto}
          texto={filtro === "todos" ? "Todavía no hay publicaciones." : "Nada por aquí todavía."}
          accion={filtro === "todos" || filtro === yo ? "Publicar fotos" : undefined}
          alAccion={() => setComponiendo(true)}
        />
      )}

      {vista === "lista" ? (
        <div className="space-y-5">
          {visibles.map((p) => (
            <Tarjeta key={p.id} p={p} yo={yo} alCambiar={cargar} alLike={(v) => like(p, v)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl">
          {visibles.map((p) => (
            <button
              key={p.id}
              onClick={() => setAbierta(p.id)}
              aria-label={`Ver publicación de ${nombres[p.persona]}`}
              className="relative aspect-square bg-relleno"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.fotos[0].mini ?? p.fotos[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
              {p.fotos.length > 1 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="absolute top-1.5 right-1.5 drop-shadow" aria-hidden>
                  <path d="M8 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 7v12a2 2 0 0 0 2 2h12v-2H5V7z" />
                </svg>
              )}
              <span className="absolute bottom-1 left-1 h-2 w-2 rounded-full ring-2 ring-white/70" style={{ background: acentos[p.persona] }} />
            </button>
          ))}
        </div>
      )}

      {abierta !== null && visibles.some((p) => p.id === abierta) && (
        <VerPublicaciones
          lista={visibles}
          inicio={abierta}
          titulo={filtro === "todos" ? "Muro" : filtro === yo ? "Tú" : nombres[filtro]}
          yo={yo}
          alCerrar={() => setAbierta(null)}
          alCambiar={cargar}
          alLike={(id, valor) => {
            const p = visibles.find((x) => x.id === id);
            if (p) like(p, valor);
          }}
        />
      )}
    </div>
  );
}
