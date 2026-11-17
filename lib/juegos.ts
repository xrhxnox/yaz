import type { Persona } from "./config";

// Lógica compartida por el servidor (que valida) y la app (que dibuja)

export type TipoJuego = "gato" | "conecta4";
export type Ficha = Persona | null;
export type Resultado = Persona | "empate";

export const JUEGOS: Record<TipoJuego, { nombre: string; filas: number; columnas: number; enLinea: number }> = {
  gato: { nombre: "Gato", filas: 3, columnas: 3, enLinea: 3 },
  conecta4: { nombre: "Conecta 4", filas: 6, columnas: 7, enLinea: 4 },
};

// Partidas que se pueden empezar al día, por juego
export const PARTIDAS_POR_DIA = 3;

export function esTipoJuego(v: unknown): v is TipoJuego {
  return v === "gato" || v === "conecta4";
}

export function tableroVacio(tipo: TipoJuego): Ficha[] {
  const { filas, columnas } = JUEGOS[tipo];
  return Array(filas * columnas).fill(null);
}

// Conecta 4: la ficha cae a la fila libre más baja de la columna (-1 si está llena)
export function caidaEnColumna(tablero: Ficha[], columna: number): number {
  const { filas, columnas } = JUEGOS.conecta4;
  for (let fila = filas - 1; fila >= 0; fila--) {
    const i = fila * columnas + columna;
    if (tablero[i] === null) return i;
  }
  return -1;
}

// ¿Alguien hizo línea? Devuelve el ganador y las casillas de la línea, o empate si ya no hay lugar
export function buscarGanador(tablero: Ficha[], tipo: TipoJuego): { ganador: Resultado | null; linea: number[] | null } {
  const { filas, columnas, enLinea } = JUEGOS[tipo];
  const direcciones = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const ficha = tablero[f * columnas + c];
      if (!ficha) continue;
      for (const [df, dc] of direcciones) {
        const linea = [f * columnas + c];
        for (let k = 1; k < enLinea; k++) {
          const ff = f + df * k;
          const cc = c + dc * k;
          if (ff < 0 || ff >= filas || cc < 0 || cc >= columnas || tablero[ff * columnas + cc] !== ficha) break;
          linea.push(ff * columnas + cc);
        }
        if (linea.length === enLinea) return { ganador: ficha, linea };
      }
    }
  }
  return { ganador: tablero.every((x) => x !== null) ? "empate" : null, linea: null };
}
