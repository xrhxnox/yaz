import { db, error, invalido, autenticar, firmar } from "@/lib/servidor";
import { hoyCompartido, mesDe, periodoMes, type Persona } from "@/lib/config";
import { preguntaDe } from "@/lib/preguntas";
import { fotosDelMuro } from "@/lib/muro";

async function opcional<T>(consulta: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const r = await consulta;
    return r.error ? [] : (r.data ?? []);
  } catch {
    return [];
  }
}

// Sin ?mes: lista de meses. Con ?mes=n: el resumen de ese mes de la relación
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const hoy = hoyCompartido();
  const actual = mesDe(hoy);
  const param = new URL(req.url).searchParams.get("mes");

  if (!param) {
    return Response.json({
      actual,
      // Del mes actual al 0 (antes de ser novios)
      meses: Array.from({ length: actual + 1 }, (_, i) => ({ n: actual - i, ...periodoMes(actual - i), terminado: actual - i < actual })),
    });
  }

  const n = Number(param);
  if (!Number.isInteger(n) || n < 0 || n > actual) return invalido("Ese mes no existe todavía");
  const { inicio, fin } = periodoMes(n);
  // Para comparar fechas con hora (created_at, hecho_at) usamos el día siguiente al fin
  const finExclusivo = new Date(Date.parse(fin + "T00:00:00Z") + 864e5).toISOString().slice(0, 10);

  try {
    const [mensajes, fotos, momentos, respuestas, pendientes, visitas, cartas, diario, canciones] = await Promise.all([
      opcional<{ de: Persona }>(db().from("pensamientos").select("de").gte("created_at", inicio).lt("created_at", finExclusivo)),
      fotosDelMuro({ desde: inicio, hasta: fin }).then((f) => f.reverse()),
      opcional<{ titulo: string; fecha: string; creado_por: Persona }>(
        db().from("momentos").select("titulo, fecha, creado_por").gte("fecha", inicio).lte("fecha", fin).order("fecha"),
      ),
      opcional<{ fecha: string; persona: Persona; respuesta: string }>(
        db().from("respuestas").select("fecha, persona, respuesta").gte("fecha", inicio).lte("fecha", fin).lt("fecha", hoy),
      ),
      opcional<{ texto: string; hecho_at: string }>(
        db().from("pendientes").select("texto, hecho_at").eq("hecho", true).gte("hecho_at", inicio).lt("hecho_at", finExclusivo).order("hecho_at"),
      ),
      opcional<{ inicio: string; fin: string; ciudad: string | null }>(
        db().from("visitas").select("inicio, fin, ciudad").lte("inicio", fin).gte("fin", inicio).order("inicio"),
      ),
      opcional<{ id: number }>(db().from("cartas").select("id").gte("created_at", inicio).lt("created_at", finExclusivo)),
      opcional<{ persona: Persona }>(db().from("diario").select("persona").gte("fecha", inicio).lte("fecha", fin)),
      opcional<{ titulo: string; artista: string | null; url: string; persona: Persona; corazon_a: boolean; corazon_b: boolean; created_at: string }>(
        db()
          .from("canciones")
          .select("titulo, artista, url, persona, corazon_a, corazon_b, created_at")
          .gte("created_at", inicio)
          .lt("created_at", finExclusivo)
          .order("created_at"),
      ),
    ]);

    // La canción del mes: la que tiene más corazones (si empatan, la primera que agregaron)
    const corazones = (c: (typeof canciones)[number]) => Number(c.corazon_a) + Number(c.corazon_b);
    const favorita = canciones.reduce<(typeof canciones)[number] | null>((mejor, c) => (!mejor || corazones(c) > corazones(mejor) ? c : mejor), null);
    const sinCorazones = (c: (typeof canciones)[number]) => ({ titulo: c.titulo, artista: c.artista, url: c.url, persona: c.persona });

    // Preguntas que respondieron los dos
    const porDia = new Map<string, Partial<Record<Persona, string>>>();
    for (const r of respuestas) porDia.set(r.fecha, { ...porDia.get(r.fecha), [r.persona]: r.respuesta });
    const ambas = [...porDia.entries()].filter(([, r]) => r.a && r.b).sort(([x], [y]) => x.localeCompare(y));

    // Hasta 9 fotos repartidas a lo largo del mes
    const paso = Math.max(1, Math.floor(fotos.length / 9));
    const elegidas = fotos.filter((_, i) => i % paso === 0).slice(0, 9);
    // En la cuadrícula basta la miniatura (si la hay)
    const vista = (f: (typeof elegidas)[number]) => f.miniatura ?? f.path;
    const urls = await firmar(elegidas.map(vista));

    return Response.json({
      n,
      inicio,
      fin,
      terminado: n < mesDe(hoy),
      mensajes: { a: mensajes.filter((m) => m.de === "a").length, b: mensajes.filter((m) => m.de === "b").length },
      fotos: {
        total: fotos.length,
        dias: new Set(fotos.map((f) => f.fecha)).size,
        muestra: elegidas.filter((f) => urls[vista(f)]).map((f) => ({ url: urls[vista(f)], persona: f.persona, nota: f.nota })),
      },
      momentos,
      preguntas: {
        total: ambas.length,
        // Una pregunta del mes con las dos respuestas, para el resumen
        destacada: ambas.length
          ? (() => {
              const [fecha, r] = ambas[Math.floor(ambas.length / 2)];
              return { fecha, pregunta: preguntaDe(fecha), a: r.a, b: r.b };
            })()
          : null,
      },
      pendientes: pendientes.map((p) => p.texto),
      visitas,
      cartas: cartas.length,
      diario: { a: diario.filter((d) => d.persona === "a").length, b: diario.filter((d) => d.persona === "b").length },
      canciones: {
        lista: canciones.map(sinCorazones),
        favorita: favorita && corazones(favorita) > 0 ? { ...sinCorazones(favorita), corazones: corazones(favorita) } : null,
      },
    });
  } catch (e) {
    return error(e);
  }
}
