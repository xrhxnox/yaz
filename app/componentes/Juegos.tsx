"use client";

import { useCallback, useState } from "react";
import { otra, type Persona } from "@/lib/config";
import { api } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { usePareja } from "@/lib/pareja";
import { JUEGOS, caidaEnColumna, type Ficha, type Resultado, type TipoJuego } from "@/lib/juegos";
import { botonPrimario, enlace, numero } from "@/lib/estilos";
import Corazon from "./Corazon";

type Partida = {
  id: number;
  tipo: TipoJuego;
  tablero: Ficha[];
  empieza: Persona;
  turno: Persona | null;
  ganador: Resultado | null;
  linea: number[] | null;
  ultima?: number | null;
};
type Datos = {
  actual: Record<TipoJuego, Partida | null>;
  marcador: Record<TipoJuego, { a: number; b: number; empate: number }>;
  hoy?: Record<TipoJuego, number>;
  limite?: number;
};

// Gato: × para Ric (a), corazón para Yaz (b), cada quien en su color
function TableroGato({ p, puedoJugar, alJugar }: { p: Partida; puedoJugar: boolean; alJugar: (posicion: number) => void }) {
  const { acentos } = usePareja();
  return (
    <div className="mx-auto grid aspect-square w-full max-w-xs grid-cols-3 grid-rows-3">
      {p.tablero.map((f, i) => {
        const fila = Math.floor(i / 3);
        const col = i % 3;
        const libre = f === null && puedoJugar;
        const enLinea = p.linea?.includes(i);
        return (
          <button
            key={i}
            onClick={() => libre && alJugar(i)}
            disabled={!libre}
            aria-label={f ? `Casilla ocupada` : `Jugar en la casilla ${i + 1}`}
            className={`flex min-h-0 min-w-0 items-center justify-center overflow-hidden font-serif text-6xl leading-none transition ${fila < 2 ? "border-b border-borde" : ""} ${
              col < 2 ? "border-r border-borde" : ""
            } ${libre ? "hover:bg-relleno" : ""} ${enLinea ? "bg-acento-suave" : ""}`}
            style={{ color: f ? acentos[f] : undefined }}
          >
            {f === "a" ? "×" : f === "b" ? <Corazon size={52} contorno className="h-1/2 w-1/2" /> : ""}
          </button>
        );
      })}
    </div>
  );
}

// Conecta 4: tocas una columna y la ficha cae hasta abajo
function TableroConecta4({ p, puedoJugar, alJugar }: { p: Partida; puedoJugar: boolean; alJugar: (columna: number) => void }) {
  const { acentos } = usePareja();
  const { filas, columnas } = JUEGOS.conecta4;
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-relleno p-2">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
        {Array.from({ length: columnas }, (_, col) => {
          const libre = puedoJugar && caidaEnColumna(p.tablero, col) >= 0;
          return (
            // Cada columna es un botón; el sombreado de "aquí caería" solo aparece con mouse
            <button
              key={col}
              onClick={() => libre && alJugar(col)}
              disabled={!libre}
              aria-label={`Columna ${col + 1}`}
              className="group flex flex-col gap-1.5 rounded-full"
            >
              {Array.from({ length: filas }, (_, fila) => {
                const i = fila * columnas + col;
                const f = p.tablero[i];
                const enLinea = p.linea?.includes(i);
                // La última jugada: cae con animación y lleva un punto al centro
                const ultima = !!f && p.ultima === i;
                return (
                  <span
                    key={fila}
                    className={`relative flex aspect-square w-full items-center justify-center rounded-full ${
                      f ? "" : libre ? "bg-fondo group-hover:bg-borde" : "bg-fondo"
                    } ${enLinea ? "ring-2 ring-texto ring-offset-2 ring-offset-relleno" : ""} ${ultima ? "ficha-cae" : ""}`}
                    style={f ? { backgroundColor: acentos[f], ...(ultima ? ({ "--filas": fila + 1 } as React.CSSProperties) : {}) } : undefined}
                  >
                    {ultima && (
                      <span className="flex h-1/2 w-1/2 items-center justify-center text-fondo/85" aria-label="Última jugada">
                        <Corazon size={16} className="h-full w-full" />
                      </span>
                    )}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function JuegoActual({ tipo, p, yo, hoy, limite, alJugar, alNueva, alAbandonar }: {
  tipo: TipoJuego;
  p: Partida | null;
  yo: Persona;
  hoy: number;
  limite: number;
  alJugar: (posicion: number) => void;
  alNueva: () => void;
  alAbandonar: (p: Partida) => void;
}) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);

  const quedan = limite - hoy;
  const sinPartidas = <p className="font-serif italic text-suave">Ya jugaron {limite} partidas hoy. Mañana hay más.</p>;

  if (!p) {
    return (
      <div className="py-6 text-center">
        <p className="font-serif text-xl italic text-suave">Todavía no han jugado {JUEGOS[tipo].nombre.toLowerCase()}.</p>
        {quedan > 0 ? (
          <button onClick={alNueva} className={`${botonPrimario} mt-4 px-6 py-2.5`}>
            Empezar partida
          </button>
        ) : (
          <div className="mt-4">{sinPartidas}</div>
        )}
      </div>
    );
  }

  const miTurno = p.turno === yo;
  const estado = p.ganador ? (
    p.ganador === "empate" ? (
      "Empate"
    ) : p.ganador === yo ? (
      "Ganaste"
    ) : (
      <>
        Ganó <span style={{ color: acentos[tu] }}>{nombres[tu]}</span>
      </>
    )
  ) : miTurno ? (
    <span className="text-acento-texto">Tu turno</span>
  ) : (
    <>
      Turno de <span style={{ color: acentos[tu] }}>{nombres[tu]}</span>…
    </>
  );

  return (
    <div className="space-y-5">
      <p className="text-center font-serif text-3xl leading-tight">{estado}</p>
      {tipo === "gato" ? (
        <TableroGato p={p} puedoJugar={miTurno && !p.ganador} alJugar={alJugar} />
      ) : (
        <TableroConecta4 p={p} puedoJugar={miTurno && !p.ganador} alJugar={alJugar} />
      )}
      <p className="text-center text-xs text-suave">
        {tipo === "gato" ? (
          <>
            <span style={{ color: acentos.a }}>× {nombres.a}</span> · <span style={{ color: acentos.b }}>
              <Corazon size={10} contorno className="inline align-[-1px]" /> {nombres.b}
            </span>
          </>
        ) : (
          <>
            <span style={{ color: acentos.a }}>● {nombres.a}</span> · <span style={{ color: acentos.b }}>● {nombres.b}</span>
          </>
        )}
        {" · "}Empezó {p.empieza === yo ? "tú" : nombres[p.empieza]}
      </p>
      <p className="text-center text-xs text-suave">
        Partida {Math.max(hoy, 1)} de {limite} de hoy
      </p>
      <div className="flex justify-center">
        {p.ganador ? (
          quedan > 0 ? (
            <button onClick={alNueva} className={`${botonPrimario} px-6 py-2.5`}>
              Revancha
            </button>
          ) : (
            sinPartidas
          )
        ) : (
          <button onClick={() => alAbandonar(p)} className={`${enlace} text-xs`}>
            Abandonar partida
          </button>
        )}
      </div>
    </div>
  );
}

// Juegos por turnos: cada quien juega cuando puede
export default function Juegos({ yo, tipo }: { yo: Persona; tipo: TipoJuego }) {
  const { nombres, acentos } = usePareja();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const tu = otra(yo);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/api/juegos"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Revisa seguido para ver cuando el otro ya jugó
  useCarga(cargar, 4000);

  async function hacer(accion: Promise<unknown>) {
    try {
      await accion;
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
    await cargar();
  }

  function jugar(p: Partida, posicion: number) {
    // Se ve la jugada al momento; el servidor la confirma
    setDatos((d) => {
      if (!d) return d;
      const tablero = [...p.tablero];
      const casilla = p.tipo === "conecta4" ? caidaEnColumna(tablero, posicion) : posicion;
      if (casilla >= 0) tablero[casilla] = yo;
      return { ...d, actual: { ...d.actual, [p.tipo]: { ...p, tablero, turno: tu, ultima: casilla } } };
    });
    hacer(api("/api/juegos", { id: p.id, posicion }, "PATCH"));
  }

  const p = datos?.actual[tipo] ?? null;
  const m = datos?.marcador[tipo];

  return (
    <div className="space-y-6 lg:mx-auto lg:max-w-xl">

      {m && (
        <section className="grid grid-cols-3 divide-x divide-borde border-b border-borde pb-4 text-center">
          <div>
            <p className={`${numero} text-4xl`} style={{ color: acentos[yo] }}>
              {m[yo]}
            </p>
            <p className="text-xs text-suave">Tú</p>
          </div>
          <div>
            <p className={`${numero} text-4xl text-suave`}>{m.empate}</p>
            <p className="text-xs text-suave">Empates</p>
          </div>
          <div>
            <p className={`${numero} text-4xl`} style={{ color: acentos[tu] }}>
              {m[tu]}
            </p>
            <p className="text-xs text-suave">{nombres[tu]}</p>
          </div>
        </section>
      )}

      {error && <p className="text-center text-sm text-acento-texto">{error}</p>}
      {!datos && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}
      {datos && (
        <JuegoActual
          key={`${tipo}-${p?.id ?? "nueva"}`}
          tipo={tipo}
          p={p}
          yo={yo}
          hoy={datos.hoy?.[tipo] ?? 0}
          limite={datos.limite ?? 3}
          alJugar={(posicion) => p && jugar(p, posicion)}
          alNueva={() => hacer(api("/api/juegos", { tipo }))}
          alAbandonar={(x) => {
            if (confirm("¿Abandonar esta partida? No cuenta en el marcador.")) hacer(api(`/api/juegos?id=${x.id}`, undefined, "DELETE"));
          }}
        />
      )}
    </div>
  );
}
