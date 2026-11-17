"use client";

import { useState } from "react";
import { formatearFecha, type Persona } from "@/lib/config";
import { api } from "@/lib/cliente";
import { usePareja } from "@/lib/pareja";
import { botonPrimario, campo, tarjeta } from "@/lib/estilos";

type Resultado = { tipo: string; texto: string; detalle: string | null; fecha: string | null; seccion: string };

// Buscar en mensajes, respuestas, momentos, pendientes, wishlist, visitas y cartas
export default function Buscar() {
  const { nombres, acentos } = usePareja();
  const [q, setQ] = useState("");
  const [buscado, setBuscado] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setError("Escribe al menos 2 letras");
    setCargando(true);
    setError("");
    try {
      const d = await api<{ resultados: Resultado[] }>(`/api/buscar?q=${encodeURIComponent(q.trim())}`);
      setResultados(d.resultados);
      setBuscado(q.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  // Agrupar por tipo
  const grupos = new Map<string, Resultado[]>();
  for (const r of resultados ?? []) grupos.set(r.tipo, [...(grupos.get(r.tipo) ?? []), r]);

  return (
    <div className="space-y-6 lg:mx-auto lg:max-w-2xl">
      <form onSubmit={buscar} className="flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en todo…"
          className={`${campo} font-serif text-lg`}
          autoFocus
        />
        <button disabled={cargando} className={botonPrimario}>
          {cargando ? "…" : "Buscar"}
        </button>
      </form>
      {error && <p className="text-sm text-acento-texto">{error}</p>}

      {resultados && resultados.length === 0 && <p className="font-serif italic text-suave">Nada con “{buscado}”.</p>}

      {[...grupos.entries()].map(([tipo, lista]) => (
        <section key={tipo} className={tarjeta}>
          <p className="font-serif text-2xl">
            {tipo} <span className="font-sans text-xs text-acento-texto">{lista.length}</span>
          </p>
          <ul className="mt-2 divide-y divide-borde">
            {lista.map((r, i) => {
              const persona = r.detalle === "a" || r.detalle === "b" ? (r.detalle as Persona) : null;
              return (
                <li key={i}>
                  <a href={`#${r.seccion}`} className="block py-2.5 hover:opacity-80">
                    <p className="font-serif text-lg leading-snug break-words">{r.texto}</p>
                    <p className="text-xs text-suave">
                      {persona && <span style={{ color: acentos[persona] }}>{nombres[persona]}</span>}
                      {persona && r.fecha && " · "}
                      {r.fecha && formatearFecha(r.fecha, { day: "numeric", month: "short", year: "numeric" })}
                      {!persona && r.detalle && <span className="block truncate">{r.detalle}</span>}
                    </p>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
