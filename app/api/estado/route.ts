import { db, error, autenticar } from "@/lib/servidor";
import type { Persona } from "@/lib/config";

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  // "desde" = medianoche local de quien consulta, para contar los de hoy
  const param = new URL(req.url).searchParams.get("desde");
  const desde = param && !isNaN(Date.parse(param)) ? new Date(param).toISOString() : new Date(Date.now() - 864e5).toISOString();

  try {
    const contar = (de: Persona, despuesDe?: string) => {
      let q = db().from("pensamientos").select("*", { count: "exact", head: true }).eq("de", de);
      if (despuesDe) q = q.gte("created_at", despuesDe);
      return q;
    };

    const [ajustes, recientes, hoyA, hoyB, totalA, totalB, lugares, perfiles] = await Promise.all([
      db().from("ajustes").select("proximo_encuentro").eq("id", 1).maybeSingle(),
      db().from("pensamientos").select("id, de, mensaje, created_at").order("created_at", { ascending: false }).limit(15),
      contar("a", desde),
      contar("b", desde),
      contar("a"),
      contar("b"),
      db().from("ubicaciones").select("persona, ciudad, lat, lon, zona"),
      db().from("perfiles").select("persona, tema"),
    ]);

    const fallo = [ajustes, recientes, hoyA, hoyB, totalA, totalB, lugares, perfiles].find((r) => r.error)?.error;
    if (fallo) throw new Error(fallo.message);

    const ubicaciones: Record<Persona, unknown> = { a: null, b: null };
    for (const { persona, ...u } of lugares.data ?? []) ubicaciones[persona as Persona] = u;

    // Colores personalizados de cada quien (null = tema original)
    const temas: Record<Persona, unknown> = { a: null, b: null };
    for (const p of perfiles.data ?? []) temas[p.persona as Persona] = p.tema;

    return Response.json({
      temas,
      ubicaciones,
      proximoEncuentro: ajustes.data?.proximo_encuentro ?? null,
      recientes: recientes.data ?? [],
      hoy: { a: hoyA.count ?? 0, b: hoyB.count ?? 0 },
      total: { a: totalA.count ?? 0, b: totalB.count ?? 0 },
    });
  } catch (e) {
    return error(e);
  }
}
