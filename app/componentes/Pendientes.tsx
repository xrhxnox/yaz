"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIAS, formatearFecha, hoyCompartido, type Categoria, type Persona } from "@/lib/config";
import { useNombres } from "@/lib/pareja";
import { api, comprimirImagen, enCache } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, caja, campo, tarjeta, titulo } from "@/lib/estilos";
import Imagen from "./Imagen";

type Pendiente = {
  id: number;
  texto: string;
  categoria: Categoria;
  hecho: boolean;
  creado_por: Persona;
  hecho_at: string | null;
  foto: string | null;
  para_reencuentro?: boolean;
};

// Miniatura tipo póster; si no hay imagen, un botón para agregarla
function Miniatura({ p, alElegir }: { p: Pendiente; alElegir: (archivo: File) => void }) {
  if (p.foto) return <Imagen src={p.foto} alt={p.texto} className="h-20 w-14 shrink-0 rounded-md bg-relleno" />;
  return (
    <label
      title="Agregar imagen"
      className="flex h-20 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-borde text-suave transition hover:border-suave hover:text-texto"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M21 16l-5-5-8 8" />
      </svg>
      <span className="sr-only">Agregar imagen a {p.texto}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = "";
          if (archivo) alElegir(archivo);
        }}
      />
    </label>
  );
}

function Fila({
  p,
  alCompletar,
  alReabrir,
  alBorrar,
  alFoto,
  alReencuentro,
}: {
  p: Pendiente;
  alCompletar: (fecha: string) => void;
  alReabrir: () => void;
  alBorrar: () => void;
  alFoto: (archivo: File) => void;
  alReencuentro: () => void;
}) {
  const NOMBRES = useNombres();
  // Antes de marcarlo como hecho, pedimos confirmar y la fecha en que lo hicieron
  const [confirmando, setConfirmando] = useState(false);
  const [fecha, setFecha] = useState(() => hoyCompartido());

  return (
    <li className="py-3">
      <div className="group flex items-center gap-3">
        <button
          onClick={() => setConfirmando((c) => !c)}
          aria-label={p.hecho ? "Regresar a pendientes" : "Marcar como hecho"}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            p.hecho !== confirmando ? "border-acento bg-acento text-sobre-acento" : "border-suave hover:border-texto"
          }`}
        >
          {/* Mientras se confirma, el círculo ya muestra cómo quedaría */}
          {p.hecho !== confirmando && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d="M5 12l5 5 9-10" />
            </svg>
          )}
        </button>
        <Miniatura p={p} alElegir={alFoto} />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-snug break-words">{p.texto}</p>
          <p className="text-xs text-suave">
            {CATEGORIAS.find((c) => c.id === p.categoria)?.nombre} · {NOMBRES[p.creado_por]}
            {p.para_reencuentro && !p.hecho && <span className="text-acento-texto"> · Para el reencuentro</span>}
          </p>
          {p.hecho && p.hecho_at && (
            <p className="mt-0.5 font-serif text-sm italic text-acento-texto">
              Completado el {formatearFecha(p.hecho_at.slice(0, 10), { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        {!p.hecho && (
          <button
            onClick={alReencuentro}
            aria-pressed={!!p.para_reencuentro}
            aria-label={p.para_reencuentro ? "Quitar del próximo reencuentro" : "Hacerlo en el próximo reencuentro"}
            title={p.para_reencuentro ? "Quitar del próximo reencuentro" : "Hacerlo en el próximo reencuentro"}
            className={`shrink-0 p-1 transition ${p.para_reencuentro ? "text-acento-texto" : "text-suave opacity-60 hover:opacity-100"}`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill={p.para_reencuentro ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
            </svg>
          </button>
        )}
        <button
          onClick={alBorrar}
          aria-label="Borrar"
          className="shrink-0 p-1 text-suave opacity-60 transition hover:text-acento-texto hover:opacity-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {confirmando && p.hecho && (
        <div className="mt-3 ml-9 rounded-xl bg-relleno p-3">
          <p className="font-serif">¿Regresar a pendientes?</p>
          <p className="mt-1 text-sm text-suave">Se quitará la fecha en que lo completaron.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setConfirmando(false)} className={botonSecundario}>
              Cancelar
            </button>
            <button
              onClick={() => {
                setConfirmando(false);
                alReabrir();
              }}
              className={`${botonPrimario} flex-1`}
            >
              Sí, regresar
            </button>
          </div>
        </div>
      )}

      {confirmando && !p.hecho && (
        <div className="mt-3 ml-9 rounded-xl bg-relleno p-3">
          <p className="font-serif">¿Ya lo hicieron?</p>
          <label className="mt-2 flex items-center gap-2 text-sm text-suave">
            Fecha
            <input
              type="date"
              value={fecha}
              max={hoyCompartido()}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-borde bg-tarjeta px-3 py-1.5 text-texto outline-none focus:border-suave"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setConfirmando(false)} className={botonSecundario}>
              Cancelar
            </button>
            <button
              disabled={!fecha}
              onClick={() => {
                setConfirmando(false);
                alCompletar(fecha);
              }}
              className={`${botonPrimario} flex-1`}
            >
              Sí, completado
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Pendientes() {
  const [lista, setLista] = useState<Pendiente[] | null>(() => enCache<{ pendientes: Pendiente[] }>("/api/pendientes")?.pendientes ?? null);
  const [filtro, setFiltro] = useState<Categoria | "todo">("todo");
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("pelis");
  const [foto, setFoto] = useState<{ archivo: File; vista: string } | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setLista((await api<{ pendientes: Pendiente[] }>("/api/pendientes")).pendientes);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 30000);

  async function hacer(accion: Promise<unknown>) {
    try {
      await accion;
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  // Liberar la vista previa al cambiarla o salir
  useEffect(() => () => void (foto && URL.revokeObjectURL(foto.vista)), [foto]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const form = new FormData();
    form.set("texto", texto);
    form.set("categoria", categoria);
    const elegida = foto;
    setTexto("");
    setFoto(null);
    await hacer(
      (async () => {
        if (elegida) form.set("foto", await comprimirImagen(elegida.archivo, 1000), "imagen.jpg");
        await api("/api/pendientes", form);
      })(),
    );
  }

  function ponerFoto(p: Pendiente, archivo: File) {
    hacer(
      (async () => {
        const form = new FormData();
        form.set("id", String(p.id));
        form.set("foto", await comprimirImagen(archivo, 1000), "imagen.jpg");
        await api("/api/pendientes", form, "PUT");
      })(),
    );
  }

  function completar(p: Pendiente, fecha: string) {
    setLista((l) => l?.map((x) => (x.id === p.id ? { ...x, hecho: true, hecho_at: `${fecha}T12:00:00Z` } : x)) ?? null);
    hacer(api("/api/pendientes", { id: p.id, hecho: true, fecha }, "PATCH"));
  }

  // Marcar o desmarcar para hacerlo en el próximo reencuentro
  function paraReencuentro(p: Pendiente) {
    setLista((l) => l?.map((x) => (x.id === p.id ? { ...x, para_reencuentro: !p.para_reencuentro } : x)) ?? null);
    hacer(api("/api/pendientes", { id: p.id, para_reencuentro: !p.para_reencuentro }, "PATCH"));
  }

  function reabrir(p: Pendiente) {
    setLista((l) => l?.map((x) => (x.id === p.id ? { ...x, hecho: false, hecho_at: null } : x)) ?? null);
    hacer(api("/api/pendientes", { id: p.id, hecho: false }, "PATCH"));
  }

  function borrar(p: Pendiente) {
    if (!confirm(`¿Borrar "${p.texto}"?`)) return;
    setLista((l) => l?.filter((x) => x.id !== p.id) ?? null);
    hacer(api(`/api/pendientes?id=${p.id}`, undefined, "DELETE"));
  }

  const visibles = (lista ?? []).filter((p) => filtro === "todo" || p.categoria === filtro);
  const porHacer = visibles.filter((p) => !p.hecho);
  // Lo más reciente primero
  const hechos = visibles.filter((p) => p.hecho).sort((x, y) => (y.hecho_at ?? "").localeCompare(x.hecho_at ?? ""));
  const fila = (p: Pendiente) => (
    <Fila
      key={p.id}
      p={p}
      alCompletar={(fecha) => completar(p, fecha)}
      alReabrir={() => reabrir(p)}
      alBorrar={() => borrar(p)}
      alFoto={(a) => ponerFoto(p, a)}
      alReencuentro={() => paraReencuentro(p)}
    />
  );

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0">
      {/* En escritorio, el formulario y los filtros quedan fijos a la izquierda */}
      <div className="space-y-5 lg:sticky lg:top-8 lg:col-span-4">
      <form onSubmit={agregar} className={`${caja} space-y-2`}>
        <div className="flex gap-2">
          <label
            title="Agregar imagen"
            className="flex h-[4.5rem] w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-borde text-suave transition hover:border-suave hover:text-texto"
          >
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto.vista} alt="Imagen elegida" className="h-full w-full object-cover" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="10" r="1.5" />
                <path d="M21 16l-5-5-8 8" />
              </svg>
            )}
            <span className="sr-only">Agregar imagen (opcional)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                if (archivo) setFoto({ archivo, vista: URL.createObjectURL(archivo) });
              }}
            />
          </label>
          <div className="min-w-0 flex-1 space-y-1">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Agregar a la lista" className={campo} />
            {foto ? (
              <button type="button" onClick={() => setFoto(null)} className="text-xs text-suave underline underline-offset-4 hover:text-texto">
                Quitar imagen
              </button>
            ) : (
              <p className="text-xs text-suave">Imagen opcional: póster, foto del lugar…</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Categoria)}
            className={`${campo} flex-1 bg-tarjeta`}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button disabled={!texto.trim()} className={botonPrimario}>
            Agregar
          </button>
        </div>
      </form>

      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
        {[{ id: "todo" as const, nombre: "Todo" }, ...CATEGORIAS].map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${
              filtro === c.id ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:bg-relleno"
            }`}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      </div>

      <div className="space-y-8 lg:col-span-8">
        <section className={tarjeta}>
          <p className={titulo}>
            Por hacer {porHacer.length > 0 && <span className="text-acento-texto">· {porHacer.length}</span>}
          </p>
          {lista === null ? (
            <p className="mt-2 text-sm text-suave">{error || "Cargando…"}</p>
          ) : porHacer.length === 0 ? (
            <p className="mt-2 font-serif italic text-suave">Nada pendiente aquí.</p>
          ) : (
            <ul className="mt-1 divide-y divide-borde">{porHacer.map(fila)}</ul>
          )}
          {error && lista && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
        </section>

        {hechos.length > 0 && (
          <section className={tarjeta}>
            <p className={titulo}>
              Ya lo hicimos <span className="text-acento-texto">· {hechos.length}</span>
            </p>
            <ul className="mt-1 divide-y divide-borde">{hechos.map(fila)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
