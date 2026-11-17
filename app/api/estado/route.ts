import { db, error, autenticar, firmar } from "@/lib/servidor";
import { NOMBRES, type Persona } from "@/lib/config";

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

    // Si todavía no existe la columna estilo, se lee el perfil sin ella
    const leerPerfiles = async () => {
      const r = await db().from("perfiles").select("persona, tema, apodo, cumple, avatar_path, estilo");
      return r.error && /estilo/.test(r.error.message) ? await db().from("perfiles").select("persona, tema, apodo, cumple, avatar_path") : r;
    };

    const [ajustes, recientes, hoyA, hoyB, totalA, totalB, lugares, perfiles] = await Promise.all([
      db().from("ajustes").select("proximo_encuentro").eq("id", 1).maybeSingle(),
      db().from("pensamientos").select("id, de, mensaje, created_at").order("created_at", { ascending: false }).limit(15),
      contar("a", desde),
      contar("b", desde),
      contar("a"),
      contar("b"),
      db().from("ubicaciones").select("persona, ciudad, lat, lon, zona"),
      leerPerfiles(),
    ]);

    const fallo = [ajustes, recientes, hoyA, hoyB, totalA, totalB, lugares, perfiles].find((r) => r.error)?.error;
    if (fallo) throw new Error(fallo.message);

    const ubicaciones: Record<Persona, unknown> = { a: null, b: null };
    for (const { persona, ...u } of lugares.data ?? []) ubicaciones[persona as Persona] = u;

    // Colores personalizados (null = tema original), apodos, cumpleaños y fotos de perfil
    const temas: Record<Persona, unknown> = { a: null, b: null };
    const nombres: Record<Persona, string> = { ...NOMBRES };
    const cumples: Record<Persona, string | null> = { a: null, b: null };
    const avatarPath: Record<Persona, string | null> = { a: null, b: null };
    const estilos: Record<Persona, { minusculas?: boolean }> = { a: {}, b: {} };
    for (const p of perfiles.data ?? []) {
      const persona = p.persona as Persona;
      temas[persona] = p.tema;
      if (p.apodo) nombres[persona] = p.apodo;
      cumples[persona] = p.cumple;
      avatarPath[persona] = p.avatar_path;
      if ("estilo" in p && p.estilo) estilos[persona] = p.estilo as { minusculas?: boolean };
    }
    const urls = await firmar([avatarPath.a, avatarPath.b]);
    const avatares: Record<Persona, string | null> = {
      a: avatarPath.a ? (urls[avatarPath.a] ?? null) : null,
      b: avatarPath.b ? (urls[avatarPath.b] ?? null) : null,
    };

    return Response.json({
      temas,
      nombres,
      cumples,
      avatares,
      estilos,
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
