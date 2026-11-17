"use client";

import { useCallback, useState } from "react";
import { NOMBRES, formatearFecha, hoyCompartido, type Persona } from "@/lib/config";
import { api, comprimirImagen } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, campo, tarjeta } from "@/lib/estilos";
import Imagen from "./Imagen";
import Corazon from "./Corazon";

type Momento = { id: number; fecha: string; titulo: string; descripcion: string | null; foto: string | null; creado_por: Persona };

function Formulario({ alTerminar }: { alTerminar: (guardado: boolean) => void }) {
  const [fecha, setFecha] = useState(hoyCompartido());
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;
    setGuardando(true);
    setError("");
    try {
      const form = new FormData();
      form.set("fecha", fecha);
      form.set("titulo", titulo);
      form.set("descripcion", descripcion);
      if (foto) form.set("foto", await comprimirImagen(foto), "momento.jpg");
      await api("/api/momentos", form);
      alTerminar(true);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className={`${tarjeta} space-y-2`}>
      <p className="font-medium">Nuevo momento</p>
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
      <label className={`${campo} block cursor-pointer truncate text-sm ${foto ? "" : "text-suave"}`}>
        {foto ? foto.name : "Agregar foto (opcional)"}
        <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="hidden" />
      </label>
      {error && <p className="text-sm text-acento-texto">{error}</p>}
      <div className="flex gap-2 pt-1">
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

export default function Momentos() {
  const [momentos, setMomentos] = useState<Momento[] | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setMomentos((await api<{ momentos: Momento[] }>("/api/momentos")).momentos);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar);

  async function borrar(m: Momento) {
    if (!confirm(`¿Borrar "${m.titulo}"?`)) return;
    try {
      await api(`/api/momentos?id=${m.id}`, undefined, "DELETE");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  return (
    <div className="space-y-3">
      {agregando ? (
        <Formulario
         
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
      {momentos === null && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}

      {momentos && momentos.length > 0 && (
        <ol className="relative ml-2 border-l border-borde pt-2">
          {momentos.map((m) => (
            <li key={m.id} className="relative pb-6 pl-6">
              <span className="absolute top-1 -left-[7px] h-3.5 w-3.5 rounded-full border-2 border-fondo bg-acento" />
              <p className="text-xs text-suave">{formatearFecha(m.fecha)}</p>
              <div className={`${tarjeta} mt-1.5 p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{m.titulo}</p>
                  <button onClick={() => borrar(m)} aria-label="Borrar" className="shrink-0 text-suave hover:text-acento-texto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                {m.descripcion && <p className="mt-1 text-sm whitespace-pre-wrap text-suave">{m.descripcion}</p>}
                {m.foto && <Imagen src={m.foto} alt={m.titulo} className="mt-3 max-h-80 w-full rounded-xl bg-relleno" />}
                <p className="mt-2 text-xs text-suave">Agregado por {NOMBRES[m.creado_por]}</p>
              </div>
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
