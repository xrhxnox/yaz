"use client";

import { useState } from "react";
import { api } from "@/lib/cliente";
import { botonPrimario, campo, enlace } from "@/lib/estilos";

const OPCIONES = ["Libre para llamada", "En el trabajo", "Ocupado", "Cansado", "De buenas", "Te extraño", "Durmiendo"];

export function hace(iso: string) {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// Cambiar cómo estoy ahorita (se abre al tocar mi columna en "Ustedes ahora")
export default function EditarAnimo({ tengo, alCambiar }: { tengo: boolean; alCambiar: () => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(valor: string | null) {
    setGuardando(true);
    setError("");
    try {
      await api("/api/animo", { texto: valor });
      await alCambiar();
      setTexto("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs text-suave">¿Cómo estás?</p>
      <div className="flex flex-wrap gap-1.5">
        {OPCIONES.map((o) => (
          <button
            key={o}
            disabled={guardando}
            onClick={() => guardar(o)}
            className="rounded-full border border-borde bg-tarjeta px-3 py-1 text-sm transition hover:border-suave active:scale-95"
          >
            {o}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) guardar(texto);
        }}
        className="mt-2 flex gap-2"
      >
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={60} placeholder="O escribe el tuyo" className={`${campo} text-sm`} />
        <button disabled={!texto.trim() || guardando} className={botonPrimario}>
          Listo
        </button>
      </form>
      {tengo && (
        <button onClick={() => guardar(null)} disabled={guardando} className={`${enlace} mt-2 text-xs`}>
          Quitar mi estado
        </button>
      )}
      {error && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
    </div>
  );
}
