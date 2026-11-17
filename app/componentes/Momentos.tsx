"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatearFecha, hoyCompartido, type Persona } from "@/lib/config";
import { useNombres, usePareja } from "@/lib/pareja";
import { api, comprimirImagen } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, caja, campo, enlace, titulo as tituloSeccion } from "@/lib/estilos";
import Imagen from "./Imagen";
import Corazon from "./Corazon";

type Foto = { id: number; url: string };
type Momento = { id: number; fecha: string; titulo: string; descripcion: string | null; fotos: Foto[]; creado_por: Persona };

function Equis({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// Sube las fotos de un momento una por una (así no pasamos el límite de tamaño por petición)
async function subirFotos(id: number, archivos: File[], alAvanzar: (texto: string) => void) {
  for (const [i, archivo] of archivos.entries()) {
    alAvanzar(archivos.length > 1 ? `Subiendo foto ${i + 1} de ${archivos.length}…` : "Subiendo foto…");
    const form = new FormData();
    form.set("id", String(id));
    form.set("foto", await comprimirImagen(archivo), "momento.jpg");
    await api("/api/momentos", form, "PUT");
  }
}

// Cuadrícula de fotos: una sola se ve grande; varias, en mosaico
function Mosaico({ fotos, titulo, alBorrar }: { fotos: Foto[]; titulo: string; alBorrar: (f: Foto) => void }) {
  if (!fotos.length) return null;
  const columnas = fotos.length === 1 ? "grid-cols-1" : fotos.length === 2 || fotos.length === 4 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`mt-3 grid gap-2 ${columnas}`}>
      {fotos.map((f) => (
        <div key={f.id} className="relative">
          <Imagen
            src={f.url}
            alt={titulo}
            className={`${fotos.length === 1 ? "max-h-96" : "aspect-square"} w-full rounded-xl bg-relleno`}
          />
          <button
            onClick={() => alBorrar(f)}
            aria-label="Borrar foto"
            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
          >
            <Equis />
          </button>
        </div>
      ))}
    </div>
  );
}

// Selector de varias fotos con vista previa
function ElegirFotos({ archivos, alCambiar, maximo }: { archivos: File[]; alCambiar: (a: File[]) => void; maximo: number }) {
  // Vistas previas de los archivos elegidos; se liberan al cambiar la selección
  const vistas = useMemo(() => archivos.map((a) => URL.createObjectURL(a)), [archivos]);
  useEffect(() => () => vistas.forEach((u) => URL.revokeObjectURL(u)), [vistas]);

  return (
    <div className="grid grid-cols-4 gap-2">
      {vistas.map((v, i) => (
        <div key={v} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v} alt={`Foto elegida ${i + 1}`} className="aspect-square w-full rounded-lg bg-relleno object-cover" />
          <button
            type="button"
            onClick={() => alCambiar(archivos.filter((_, j) => j !== i))}
            aria-label="Quitar foto"
            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white"
          >
            <Equis size={10} />
          </button>
        </div>
      ))}
      {archivos.length < maximo && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-borde text-center text-[11px] text-suave hover:border-suave hover:text-texto">
          <span className="text-xl leading-none">+</span>
          {archivos.length ? "Más" : "Fotos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const nuevos = [...(e.target.files ?? [])];
              e.target.value = "";
              alCambiar([...archivos, ...nuevos].slice(0, maximo));
            }}
          />
        </label>
      )}
    </div>
  );
}

// Editar fecha, título y detalles (las fotos se agregan o quitan aparte)
function EditarMomento({ m, alTerminar }: { m: Momento; alTerminar: (guardado: boolean) => void }) {
  const [fecha, setFecha] = useState(m.fecha);
  const [titulo, setTitulo] = useState(m.titulo);
  const [descripcion, setDescripcion] = useState(m.descripcion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;
    setGuardando(true);
    setError("");
    try {
      await api("/api/momentos", { id: m.id, fecha, titulo, descripcion }, "PATCH");
      alTerminar(true);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="mt-1 space-y-2">
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="¿Qué pasó?" className={campo} autoFocus />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Detalles (opcional)"
        className={`${campo} resize-none`}
      />
      {error && <p className="text-sm text-acento-texto">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => alTerminar(false)} className={botonSecundario}>
          Cancelar
        </button>
        <button disabled={!titulo.trim() || !fecha || guardando} className={`${botonPrimario} flex-1`}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function Formulario({ maximo, alTerminar }: { maximo: number; alTerminar: (guardado: boolean) => void }) {
  const [fecha, setFecha] = useState(hoyCompartido());
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;
    setProgreso("Guardando…");
    setError("");
    try {
      const { id } = await api<{ id: number }>("/api/momentos", { fecha, titulo, descripcion });
      await subirFotos(id, fotos, setProgreso);
      alTerminar(true);
    } catch (err) {
      setError((err as Error).message);
      setProgreso(null);
    }
  }

  return (
    <form onSubmit={guardar} className={`${caja} space-y-2`}>
      <p className={tituloSeccion}>Nuevo momento</p>
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="¿Qué pasó?" className={campo} />
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Detalles (opcional)"
        className={`${campo} resize-none`}
      />
      <ElegirFotos archivos={fotos} alCambiar={setFotos} maximo={maximo} />
      {error && <p className="text-sm text-acento-texto">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => alTerminar(false)} disabled={!!progreso} className={botonSecundario}>
          Cancelar
        </button>
        <button disabled={!titulo.trim() || !fecha || !!progreso} className={`${botonPrimario} flex-1`}>
          {progreso ?? (fotos.length ? `Guardar con ${fotos.length} foto${fotos.length > 1 ? "s" : ""}` : "Guardar")}
        </button>
      </div>
    </form>
  );
}

export default function Momentos() {
  const NOMBRES = useNombres();
  const { acentos } = usePareja();
  const [editando, setEditando] = useState<number | null>(null);
  const [datos, setDatos] = useState<{ maximo: number; momentos: Momento[] } | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [subiendo, setSubiendo] = useState<{ id: number; texto: string } | null>(null);
  const [error, setError] = useState("");
  const selector = useRef<HTMLInputElement>(null);
  const destino = useRef<Momento | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/api/momentos"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar);

  async function borrar(m: Momento) {
    if (!confirm(`¿Borrar "${m.titulo}"${m.fotos.length ? " y sus fotos" : ""}?`)) return;
    try {
      await api(`/api/momentos?id=${m.id}`, undefined, "DELETE");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  async function borrarFoto(f: Foto) {
    if (!confirm("¿Borrar esta foto?")) return;
    try {
      await api(`/api/momentos?foto=${f.id}`, undefined, "DELETE");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  // Agregar fotos a un momento que ya existe
  async function agregarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const m = destino.current;
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!m || !archivos.length || !datos) return;
    const cupo = datos.maximo - m.fotos.length;
    try {
      await subirFotos(m.id, archivos.slice(0, Math.max(cupo, 0)), (texto) => setSubiendo({ id: m.id, texto }));
      if (archivos.length > cupo) setError(`Cada momento puede tener hasta ${datos.maximo} fotos.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubiendo(null);
      await cargar();
    }
  }

  const momentos = datos?.momentos;

  return (
    <div className="space-y-5 lg:mx-auto lg:max-w-2xl">
      {agregando && datos ? (
        <Formulario
          maximo={datos.maximo}
          alTerminar={(guardado) => {
            setAgregando(false);
            if (guardado) cargar();
          }}
        />
      ) : (
        <button onClick={() => setAgregando(true)} className={`${botonPrimario} w-full py-2.5`}>
          Agregar momento
        </button>
      )}

      {error && <p className="text-sm text-acento-texto">{error}</p>}
      {!datos && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}
      <input ref={selector} type="file" accept="image/*" multiple onChange={agregarFotos} className="hidden" />

      {momentos && momentos.length > 0 && (
        <ol className="relative ml-2 border-l border-borde pt-2">
          {momentos.map((m) => (
            <li key={m.id} className="relative pb-8 pl-6">
              {/* Cada momento lleva el color de acento de quien lo publicó */}
              <span
                className="absolute top-1 -left-[7px] h-3.5 w-3.5 rounded-full border-2 border-fondo"
                style={{ backgroundColor: acentos[m.creado_por] }}
              />
              <p className="text-xs tracking-wide" style={{ color: acentos[m.creado_por] }}>
                {formatearFecha(m.fecha)}
              </p>
              {editando === m.id ? (
                <EditarMomento
                  m={m}
                  alTerminar={(guardado) => {
                    setEditando(null);
                    if (guardado) cargar();
                  }}
                />
              ) : (
              <div className="mt-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-serif text-2xl leading-tight tracking-tight">{m.titulo}</p>
                  <div className="flex shrink-0 items-center gap-2 pt-1">
                    <button onClick={() => setEditando(m.id)} className={`${enlace} text-xs`}>
                      Editar
                    </button>
                    <button onClick={() => borrar(m)} aria-label="Borrar momento" className="text-suave hover:text-acento-texto">
                      <Equis size={16} />
                    </button>
                  </div>
                </div>
                {m.descripcion && <p className="mt-1 text-sm whitespace-pre-wrap text-suave">{m.descripcion}</p>}
                <Mosaico fotos={m.fotos} titulo={m.titulo} alBorrar={borrarFoto} />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-suave">
                    Agregado por <span style={{ color: acentos[m.creado_por] }}>{NOMBRES[m.creado_por]}</span>
                    {m.fotos.length > 1 && ` · ${m.fotos.length} fotos`}
                  </p>
                  {subiendo?.id === m.id ? (
                    <p className="text-xs text-suave">{subiendo.texto}</p>
                  ) : (
                    datos &&
                    m.fotos.length < datos.maximo && (
                      <button
                        onClick={() => {
                          destino.current = m;
                          selector.current?.click();
                        }}
                        disabled={!!subiendo}
                        className={`${enlace} text-xs`}
                      >
                        Agregar fotos
                      </button>
                    )
                  )}
                </div>
              </div>
              )}
            </li>
          ))}
          <li className="relative pl-6">
            <Corazon size={14} className="absolute top-0.5 -left-[7px] text-acento-texto" />
            <p className="text-xs text-suave">El inicio</p>
          </li>
        </ol>
      )}
    </div>
  );
}
