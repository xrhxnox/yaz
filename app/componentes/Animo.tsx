"use client";

import { useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { api } from "@/lib/cliente";
import { usePareja } from "@/lib/pareja";
import { botonPrimario, botonSecundario, campo, enlace } from "@/lib/estilos";
import Avatar from "./Avatar";

const OPCIONES = ["Libre para llamada", "En el trabajo", "Ocupado", "Cansado", "De buenas", "Te extraño", "Durmiendo"];

function hace(iso: string) {
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// Cómo está cada quien ahorita; cada quien cambia el suyo
export default function Animo({
  yo,
  animos,
  alCambiar,
}: {
  yo: Persona;
  animos: Record<Persona, { texto: string; updated_at: string } | null> | undefined;
  alCambiar: () => Promise<void>;
}) {
  const { nombres, acentos } = usePareja();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(valor: string | null) {
    setGuardando(true);
    setError("");
    try {
      await api("/api/animo", { texto: valor });
      await alCambiar();
      setEditando(false);
      setTexto("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (!animos) return null;

  return (
    <section className="space-y-2">
      {([otra(yo), yo] as Persona[]).map((p) => {
        const a = animos[p];
        return (
          <div key={p} className="flex items-center gap-2.5">
            <Avatar persona={p} size={26} />
            <p className="min-w-0 flex-1 text-sm">
              <span style={{ color: acentos[p] }}>{p === yo ? "Tú" : nombres[p]}</span>
              {a ? (
                <>
                  <span className="text-suave"> · </span>
                  <span className="font-serif text-base italic">{a.texto}</span>
                  <span className="text-xs text-suave"> · {hace(a.updated_at)}</span>
                </>
              ) : (
                <span className="text-suave"> · {p === yo ? "¿cómo estás?" : "sin estado"}</span>
              )}
            </p>
            {p === yo && !editando && (
              <button onClick={() => setEditando(true)} className={`${enlace} shrink-0 text-xs`}>
                {a ? "Cambiar" : "Poner"}
              </button>
            )}
          </div>
        );
      })}

      {editando && (
        <div className="rounded-xl bg-relleno p-3">
          <div className="flex flex-wrap gap-1.5">
            {OPCIONES.map((o) => (
              <button
                key={o}
                disabled={guardando}
                onClick={() => guardar(o)}
                className="rounded-full border border-borde bg-tarjeta px-3 py-1 text-sm transition hover:border-suave"
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
          <div className="mt-2 flex items-center justify-between">
            <button onClick={() => setEditando(false)} className={`${botonSecundario} py-1.5`}>
              Cerrar
            </button>
            {animos[yo] && (
              <button onClick={() => guardar(null)} disabled={guardando} className={`${enlace} text-xs`}>
                Quitar mi estado
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
        </div>
      )}
    </section>
  );
}
