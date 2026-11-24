import { BUCKET_VIDEOS, borrarImagenes, db } from "./servidor";

// Cuánto dura una historia
export const DURACION_HISTORIA_MS = 24 * 3600 * 1000;

// Borra la imagen de una historia, salvo que también esté guardada en el muro (los videos se borran siempre)
export async function borrarImagenHistoria(path: string, tipo?: string | null) {
  if (tipo === "video") return borrarImagenes([path], BUCKET_VIDEOS);
  const { count } = await db().from("publicacion_fotos").select("*", { count: "exact", head: true }).eq("path", path);
  if (!count) await borrarImagenes([path]);
}

// Limpieza (la llama el recordatorio de la noche): historias de hace más de 2 días, con su imagen
export async function limpiarHistorias(): Promise<number> {
  const limite = new Date(Date.now() - 2 * DURACION_HISTORIA_MS).toISOString();
  const consulta = (columnas: string) => db().from("historias").select(columnas).lt("created_at", limite);
  let r = await consulta("id, path, tipo");
  if (r.error && /tipo/.test(r.error.message)) r = await consulta("id, path");
  const viejas = (r.data ?? []) as unknown as { id: number; path: string; tipo?: string | null }[];
  for (const h of viejas) {
    await borrarImagenHistoria(h.path, h.tipo);
    await db().from("historias").delete().eq("id", h.id);
  }
  return viejas.length;
}
