"use client";

import { useEffect, useRef, useState } from "react";
import type { Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api, comprimirImagen } from "@/lib/cliente";
import { textoSobreColor } from "./Historias";

type Borrador = { blob: Blob; vista: string; texto: string };

// Pide abrir la vista previa de historias con estas fotos (desde la fila de historias o desde "Crear")
export function componerHistorias(archivos: File[]) {
  window.dispatchEvent(new CustomEvent("historias:componer", { detail: archivos.slice(0, 10) }));
}

// Vista previa antes de compartir: cada foto con su texto encima, en tu color
export default function ComponerHistoria({ yo }: { yo: Persona }) {
  const { acentos } = usePareja();
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [i, setI] = useState(0);
  const [preparando, setPreparando] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const vistas = useRef<Borrador[]>([]);

  useEffect(() => {
    vistas.current = borradores;
  }, [borradores]);

  // Llegan fotos: se comprimen y se abre la vista previa
  useEffect(() => {
    const alComponer = async (e: Event) => {
      const archivos = (e as CustomEvent<File[]>).detail;
      if (!archivos?.length) return;
      setError("");
      setPreparando(true);
      try {
        const nuevos: Borrador[] = [];
        for (const a of archivos) {
          const blob = await comprimirImagen(a);
          nuevos.push({ blob, vista: URL.createObjectURL(blob), texto: "" });
        }
        setBorradores(nuevos);
        setI(0);
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

  const abierta = borradores.length > 0 || preparando;
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
        setSubiendo(borradores.length > 1 ? `${n + 1} de ${borradores.length}` : "…");
        const form = new FormData();
        form.set("foto", b.blob, "historia.jpg");
        if (b.texto.trim()) form.set("texto", b.texto.trim());
        await api("/api/historias", form);
      }
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

  return (
    <div role="dialog" aria-label="Nueva historia" className="fixed inset-0 z-[85] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button onClick={cerrar} disabled={!!subiendo} className="rounded-full px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50">
          Cancelar
        </button>
        <p className="text-sm font-medium">Nueva historia{borradores.length > 1 ? ` · ${i + 1}/${borradores.length}` : ""}</p>
        <button
          onClick={compartir}
          disabled={!!subiendo || !borradores.length}
          className="rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: color, color: textoSobreColor(color) }}
        >
          {subiendo ? `Subiendo ${subiendo}` : "Compartir"}
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {b ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.vista} alt="" className="h-full w-full object-contain" />
            {b.texto.trim() && (
              <p
                className="absolute top-1/2 left-1/2 max-w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-4 py-2.5 text-center text-lg leading-snug font-semibold break-words shadow-lg"
                style={{ background: color, color: textoSobreColor(color) }}
              >
                {b.texto}
              </p>
            )}
          </>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-white/70">Preparando fotos…</p>
        )}
        {error && <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-xs text-black">{error}</p>}
      </div>

      {b && (
        <div className="space-y-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input
            value={b.texto}
            onChange={(e) => setBorradores((x) => x.map((y, n) => (n === i ? { ...y, texto: e.target.value } : y)))}
            maxLength={200}
            placeholder="Escribe algo sobre la foto (opcional)…"
            className="w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-base text-white outline-none placeholder:text-white/60 focus:border-white"
          />
          {borradores.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {borradores.map((x, n) => (
                <button
                  key={x.vista}
                  onClick={() => setI(n)}
                  aria-label={`Foto ${n + 1}`}
                  className={`h-14 w-10 shrink-0 overflow-hidden rounded-md border-2 ${n === i ? "border-white" : "border-transparent opacity-60"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.vista} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
