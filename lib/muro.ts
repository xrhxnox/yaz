import { db } from "./servidor";
import type { Persona } from "./config";

export type FotoMuro = { persona: Persona; fecha: string; path: string; nota: string | null };

type Filtro = { desde?: string; hasta?: string; fechas?: string[] };

// Fotos del muro con su fecha y de quién son (para la racha, el resumen del mes y "un día como hoy").
// Si todavía no existen las tablas del muro, usa las fotos del día de antes.
export async function fotosDelMuro({ desde, hasta, fechas }: Filtro, limite = 2000): Promise<FotoMuro[]> {
  try {
    let q = db().from("publicaciones").select("persona, fecha, texto, created_at, publicacion_fotos(path, orden)");
    if (desde) q = q.gte("fecha", desde);
    if (hasta) q = q.lte("fecha", hasta);
    if (fechas) q = q.in("fecha", fechas);
    const r = await q.order("fecha", { ascending: false }).order("created_at").limit(limite);
    if (!r.error) {
      type Fila = { persona: Persona; fecha: string; texto: string | null; publicacion_fotos: { path: string; orden: number }[] };
      return ((r.data ?? []) as Fila[]).flatMap((p) =>
        [...p.publicacion_fotos].sort((a, b) => a.orden - b.orden).map((f) => ({ persona: p.persona, fecha: p.fecha, path: f.path, nota: p.texto })),
      );
    }
  } catch {}

  // Respaldo: fotos del día
  try {
    let q = db().from("fotos").select("persona, fecha, path, nota");
    if (desde) q = q.gte("fecha", desde);
    if (hasta) q = q.lte("fecha", hasta);
    if (fechas) q = q.in("fecha", fechas);
    const r = await q.order("fecha", { ascending: false }).order("created_at").limit(limite);
    return r.error ? [] : ((r.data ?? []) as FotoMuro[]);
  } catch {
    return [];
  }
}
