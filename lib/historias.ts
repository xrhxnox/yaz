import { borrarImagenes, db } from "./servidor";

// Cuánto dura una historia
export const DURACION_HISTORIA_MS = 24 * 3600 * 1000;

// Borra la imagen de una historia, salvo que también esté guardada en el muro
export async function borrarImagenHistoria(path: string) {
  const { count } = await db().from("publicacion_fotos").select("*", { count: "exact", head: true }).eq("path", path);
  if (!count) await borrarImagenes([path]);
}

// Limpieza (la llama el recordatorio de la noche): historias de hace más de 2 días, con su imagen
export async function limpiarHistorias(): Promise<number> {
  const limite = new Date(Date.now() - 2 * DURACION_HISTORIA_MS).toISOString();
  const viejas = ((await db().from("historias").select("id, path").lt("created_at", limite)).data ?? []) as { id: number; path: string }[];
  for (const h of viejas) {
    await borrarImagenHistoria(h.path);
    await db().from("historias").delete().eq("id", h.id);
  }
  return viejas.length;
}
