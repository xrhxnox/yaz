"use client";

import { useCallback, useState } from "react";
import { CATEGORIAS, otra, type Persona } from "@/lib/config";
import { api } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { usePareja } from "@/lib/pareja";
import { botonPrimario, botonSecundario, caja, campo, enlace, etiqueta, tarjeta, titulo as tituloSeccion } from "@/lib/estilos";

type Opcion = { id: number; texto: string; mio: boolean | null };
type Ronda = {
  id: number;
  titulo: string;
  creado_por: Persona;
  opciones: Opcion[];
  votadasPorMi: number;
  votadasPorOtro: number;
  coincidencias: string[];
};

function Crear({ alTerminar }: { alTerminar: (creada: boolean) => void }) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const opciones = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Llenar con lo que tienen pendiente de una categoría
  async function desdePendientes(categoria: string) {
    try {
      const { pendientes } = await api<{ pendientes: { texto: string; categoria: string; hecho: boolean }[] }>("/api/pendientes");
      const lista = pendientes.filter((p) => p.categoria === categoria && !p.hecho).map((p) => p.texto);
      if (!lista.length) return setError("No hay pendientes en esa categoría");
      setTexto(lista.join("\n"));
      if (!titulo) setTitulo(CATEGORIAS.find((c) => c.id === categoria)?.nombre ?? "");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (opciones.length < 2) return setError("Escribe al menos 2 opciones");
    setGuardando(true);
    setError("");
    try {
      await api("/api/rondas", { titulo, opciones });
      alTerminar(true);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={crear} className={`${caja} space-y-3`}>
      <p className={tituloSeccion}>Nueva ronda</p>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} placeholder="¿Qué deciden? (ej. Peli para hoy)" className={campo} />
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        placeholder={"Una opción por línea\nDune 3\nThe Bear\nHer"}
        className={`${campo} resize-y`}
      />
      <div>
        <p className={etiqueta}>O usar sus pendientes</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => desdePendientes(c.id)}
              className="rounded-full border border-borde px-3 py-1 text-xs transition hover:bg-relleno"
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-acento-texto">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => alTerminar(false)} className={botonSecundario}>
          Cancelar
        </button>
        <button disabled={!titulo.trim() || opciones.length < 2 || guardando} className={`${botonPrimario} flex-1`}>
          {guardando ? "Creando…" : `Crear con ${opciones.length} opciones`}
        </button>
      </div>
    </form>
  );
}

// Votar una por una: sí o no
function Votar({ r, alVotar }: { r: Ronda; alVotar: (opcion: number, si: boolean) => Promise<void> }) {
  const [enviando, setEnviando] = useState(false);
  const siguiente = r.opciones.find((o) => o.mio === null);
  if (!siguiente) return null;
  const n = r.opciones.indexOf(siguiente) + 1;

  async function votar(si: boolean) {
    setEnviando(true);
    try {
      await alVotar(siguiente!.id, si);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-relleno p-5 text-center">
      <p className="text-xs text-suave">
        {n} de {r.opciones.length}
      </p>
      <p className="mt-2 font-serif text-3xl leading-tight">{siguiente.texto}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => votar(false)} disabled={enviando} className={`${botonSecundario} py-3 text-base`}>
          No
        </button>
        <button onClick={() => votar(true)} disabled={enviando} className={`${botonPrimario} py-3 text-base`}>
          Sí
        </button>
      </div>
    </div>
  );
}

// Esto o aquello: los dos votan y solo se muestran las coincidencias
export default function Rondas({ yo }: { yo: Persona }) {
  const { nombres, acentos } = usePareja();
  const [rondas, setRondas] = useState<Ronda[] | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const tu = otra(yo);

  const cargar = useCallback(async () => {
    try {
      setRondas((await api<{ rondas: Ronda[] }>("/api/rondas")).rondas);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 20000);

  async function borrar(r: Ronda) {
    if (!confirm(`¿Borrar la ronda "${r.titulo}"?`)) return;
    try {
      await api(`/api/rondas?id=${r.id}`, undefined, "DELETE");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  return (
    <div className="space-y-6 lg:mx-auto lg:max-w-2xl">
      <p className="font-serif text-lg italic text-suave">
        Escriban opciones, voten cada quien por su lado y vean en qué coincidieron.
      </p>

      {creando ? (
        <Crear
          alTerminar={(creada) => {
            setCreando(false);
            if (creada) cargar();
          }}
        />
      ) : (
        <button onClick={() => setCreando(true)} className={`${botonPrimario} w-full py-2.5`}>
          Nueva ronda
        </button>
      )}

      {error && <p className="text-sm text-acento-texto">{error}</p>}
      {!rondas && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}
      {rondas && rondas.length === 0 && !creando && <p className="font-serif italic text-suave">Todavía no hay rondas.</p>}

      {rondas?.map((r) => {
        const total = r.opciones.length;
        const yoTermine = r.votadasPorMi === total;
        const otroTermino = r.votadasPorOtro === total;
        return (
          <section key={r.id} className={tarjeta}>
            <div className="flex items-start justify-between gap-3">
              <p className={tituloSeccion}>{r.titulo}</p>
              <button onClick={() => borrar(r)} className={`${enlace} shrink-0 pt-1 text-xs`}>
                Borrar
              </button>
            </div>
            <p className="mt-1 text-xs text-suave">
              <span style={{ color: acentos[yo] }}>Tú</span> {r.votadasPorMi}/{total} ·{" "}
              <span style={{ color: acentos[tu] }}>{nombres[tu]}</span> {r.votadasPorOtro}/{total}
            </p>

            {!yoTermine && (
              <Votar
                r={r}
                alVotar={async (opcion, si) => {
                  await api("/api/rondas", { opcion, si }, "PATCH");
                  await cargar();
                }}
              />
            )}

            {yoTermine && !otroTermino && (
              <p className="mt-3 font-serif italic text-suave">Ya votaste. Falta que {nombres[tu]} termine para ver en qué coincidieron.</p>
            )}

            {(yoTermine && otroTermino) || r.coincidencias.length > 0 ? (
              <div className="mt-4">
                <p className={etiqueta}>{yoTermine && otroTermino ? "Coincidieron en" : "Coincidencias hasta ahora"}</p>
                {r.coincidencias.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {r.coincidencias.map((c) => (
                      <li key={c} className="font-serif text-2xl leading-tight text-acento-texto">
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 font-serif italic text-suave">No coincidieron en ninguna. ¿Otra ronda?</p>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
