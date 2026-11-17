import { db, error, autenticar, firmar } from "@/lib/servidor";
import { NOMBRES, hoyCompartido, type Persona, type Estilo } from "@/lib/config";

// Lee algo opcional: si la tabla o columna aún no existe en Supabase, devuelve null en vez de fallar
async function opcional<T>(consulta: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const r = await consulta;
    return r.error ? null : r.data;
  } catch {
    return null;
  }
}

function diaAnterior(fecha: string) {
  return new Date(Date.parse(fecha + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
}

// Días seguidos (hasta hoy, o hasta ayer si hoy aún no se completa) en que los DOS hicieron algo
function racha(filas: { fecha: string; persona: string }[] | null, hoy: string) {
  const porDia = new Map<string, Set<string>>();
  for (const f of filas ?? []) porDia.set(f.fecha, (porDia.get(f.fecha) ?? new Set()).add(f.persona));
  const completo = (d: string) => (porDia.get(d)?.size ?? 0) >= 2;
  let dia = completo(hoy) ? hoy : diaAnterior(hoy);
  let n = 0;
  while (completo(dia)) {
    n++;
    dia = diaAnterior(dia);
  }
  return n;
}

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
    const estilos: Record<Persona, Estilo> = { a: {}, b: {} };
    for (const p of perfiles.data ?? []) {
      const persona = p.persona as Persona;
      temas[persona] = p.tema;
      if (p.apodo) nombres[persona] = p.apodo;
      cumples[persona] = p.cumple;
      avatarPath[persona] = p.avatar_path;
      if ("estilo" in p && p.estilo) estilos[persona] = p.estilo as Estilo;
    }
    const urls = await firmar([avatarPath.a, avatarPath.b]);
    const avatares: Record<Persona, string | null> = {
      a: avatarPath.a ? (urls[avatarPath.a] ?? null) : null,
      b: avatarPath.b ? (urls[avatarPath.b] ?? null) : null,
    };

    // Extras opcionales: ánimo, rachas, visitas y planes del reencuentro
    const hoy = hoyCompartido();
    const [animosFilas, respuestasFilas, fotosFilas, visitasFilas, planes, misTurnos] = await Promise.all([
      opcional<{ persona: Persona; texto: string; updated_at: string }[]>(db().from("animos").select("persona, texto, updated_at")),
      opcional<{ fecha: string; persona: string }[]>(db().from("respuestas").select("fecha, persona").order("fecha", { ascending: false }).limit(800)),
      opcional<{ fecha: string; persona: string }[]>(db().from("fotos").select("fecha, persona").order("fecha", { ascending: false }).limit(2000)),
      opcional<{ inicio: string; fin: string }[]>(db().from("visitas").select("inicio, fin")),
      opcional<{ id: number; texto: string }[]>(
        db().from("pendientes").select("id, texto").eq("para_reencuentro", true).eq("hecho", false).order("created_at", { ascending: true }),
      ),
      // Juegos en los que me toca jugar
      opcional<{ tipo: string }[]>(db().from("partidas").select("tipo").eq("turno", yo).is("ganador", null)),
    ]);
    const animos: Record<Persona, { texto: string; updated_at: string } | null> = { a: null, b: null };
    for (const a of animosFilas ?? []) animos[a.persona] = { texto: a.texto, updated_at: a.updated_at };
    const visitas = visitasFilas
      ? {
          veces: visitasFilas.length,
          dias: visitasFilas.reduce((t, v) => t + Math.round((Date.parse(v.fin) - Date.parse(v.inicio)) / 864e5) + 1, 0),
        }
      : null;

    return Response.json({
      animos,
      rachas: { preguntas: racha(respuestasFilas, hoy), fotos: racha(fotosFilas, hoy) },
      visitas,
      planes: planes ?? [],
      turnos: (misTurnos ?? []).map((t) => t.tipo),
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
