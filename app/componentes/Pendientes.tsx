"use client";

import { useCallback, useState } from "react";
import { CATEGORIAS, NOMBRES, type Categoria, type Persona } from "@/lib/config";
import { api } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, caja, campo, tarjeta } from "@/lib/estilos";

type Pendiente = { id: number; texto: string; categoria: Categoria; hecho: boolean; creado_por: Persona; hecho_at: string | null };

function Fila({ p, alMarcar, alBorrar }: { p: Pendiente; alMarcar: () => void; alBorrar: () => void }) {
  return (
    <li className="group flex items-center gap-3 py-2.5">
      <button
        onClick={alMarcar}
        aria-label={p.hecho ? "Marcar como pendiente" : "Marcar como hecho"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          p.hecho ? "border-acento bg-acento text-sobre-acento" : "border-suave hover:border-texto"
        }`}
      >
        {p.hecho && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`font-serif text-lg leading-snug break-words ${p.hecho ? "text-suave line-through" : ""}`}>{p.texto}</p>
        <p className="text-xs text-suave">
          {CATEGORIAS.find((c) => c.id === p.categoria)?.nombre} · {NOMBRES[p.creado_por]}
        </p>
      </div>
      <button
        onClick={alBorrar}
        aria-label="Borrar"
        className="shrink-0 p-1 text-suave opacity-60 transition hover:text-acento-texto hover:opacity-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </li>
  );
}

export default function Pendientes() {
  const [lista, setLista] = useState<Pendiente[] | null>(null);
  const [filtro, setFiltro] = useState<Categoria | "todo">("todo");
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("pelis");
  const [verHechos, setVerHechos] = useState(false);
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

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const t = texto;
    setTexto("");
    await hacer(api("/api/pendientes", { texto: t, categoria }));
  }

  function marcar(p: Pendiente) {
    setLista((l) => l?.map((x) => (x.id === p.id ? { ...x, hecho: !p.hecho } : x)) ?? null);
    hacer(api("/api/pendientes", { id: p.id, hecho: !p.hecho }, "PATCH"));
  }

  function borrar(p: Pendiente) {
    if (!confirm(`¿Borrar "${p.texto}"?`)) return;
    setLista((l) => l?.filter((x) => x.id !== p.id) ?? null);
    hacer(api(`/api/pendientes?id=${p.id}`, undefined, "DELETE"));
  }

  const visibles = (lista ?? []).filter((p) => filtro === "todo" || p.categoria === filtro);
  const porHacer = visibles.filter((p) => !p.hecho);
  const hechos = visibles.filter((p) => p.hecho);

  return (
    <div className="space-y-5">
      <form onSubmit={agregar} className={`${caja} space-y-2`}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Agregar a la lista" className={campo} />
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

      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
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

      <section className={tarjeta}>
        {lista === null ? (
          <p className="text-sm text-suave">{error || "Cargando…"}</p>
        ) : porHacer.length === 0 ? (
          <p className="font-serif italic text-suave">Nada pendiente aquí.</p>
        ) : (
          <ul className="-my-2.5 divide-y divide-borde">
            {porHacer.map((p) => (
              <Fila key={p.id} p={p} alMarcar={() => marcar(p)} alBorrar={() => borrar(p)} />
            ))}
          </ul>
        )}
        {hechos.length > 0 && (
          <div className="mt-4 border-t border-borde pt-3">
            <button onClick={() => setVerHechos((v) => !v)} className="text-sm text-suave hover:text-texto">
              {verHechos ? "Ocultar" : "Ver"} completados ({hechos.length})
            </button>
            {verHechos && (
              <ul className="mt-1 divide-y divide-borde">
                {hechos.map((p) => (
                  <Fila key={p.id} p={p} alMarcar={() => marcar(p)} alBorrar={() => borrar(p)} />
                ))}
              </ul>
            )}
          </div>
        )}
        {error && lista && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
      </section>
    </div>
  );
}
