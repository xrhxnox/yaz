import { db } from "./servidor";
import type { Persona } from "./config";

export type TipoReaccion = "foto" | "diario";
export type Reaccion = { persona: Persona; corazon: boolean; comentario: string | null };

export function esTipoReaccion(x: unknown): x is TipoReaccion {
  return x === "foto" || x === "diario";
}

// Reacciones (corazón y comentario) de varias fotos o entradas del diario.
// Si la tabla aún no existe, regresa vacío para no romper la sección.
export async function reaccionesDe(tipo: TipoReaccion, ids: number[]): Promise<Map<number, Reaccion[]>> {
  const mapa = new Map<number, Reaccion[]>();
  if (!ids.length) return mapa;
  try {
    const r = await db().from("reacciones").select("objeto, persona, corazon, comentario").eq("tipo", tipo).in("objeto", ids);
    if (r.error) return mapa;
    for (const x of (r.data ?? []) as { objeto: number; persona: Persona; corazon: boolean; comentario: string | null }[]) {
      const lista = mapa.get(x.objeto) ?? [];
      lista.push({ persona: x.persona, corazon: x.corazon, comentario: x.comentario });
      mapa.set(x.objeto, lista);
    }
  } catch {}
  return mapa;
}

// Al borrar una foto o entrada, sus reacciones también (sin fallar si la tabla no existe)
export async function borrarReacciones(tipo: TipoReaccion, id: number) {
  try {
    await db().from("reacciones").delete().eq("tipo", tipo).eq("objeto", id);
  } catch {}
}
