import { db, error, invalido, autenticar, firmar } from "@/lib/servidor";
import { hoyCompartido, mesDe, periodoMes, type Persona } from "@/lib/config";
import { preguntaDe } from "@/lib/preguntas";

async function opcional<T>(consulta: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const r = await consulta;
    return r.error ? [] : (r.data ?? []);
  } catch {
    return [];
  }
}

// Sin ?mes: lista de meses. Con ?mes=n: el "número especial" de ese mes de la relación
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const hoy = hoyCompartido();
  const actual = mesDe(hoy);
  const param = new URL(req.url).searchParams.get("mes");

  if (!param) {
    return Response.json({
      actual,
      meses: Array.from({ length: actual }, (_, i) => ({ n: actual - i, ...periodoMes(actual - i), terminado: actual - i < actual })),
    });
  }

  const n = Number(param);
  if (!Number.isInteger(n) || n < 1 || n > actual) return invalido("Ese mes no existe todavía");
  const { inicio, fin } = periodoMes(n);
  // Para comparar fechas con hora (created_at, hecho_at) usamos el día siguiente al fin
  const finExclusivo = new Date(Date.parse(fin + "T00:00:00Z") + 864e5).toISOString().slice(0, 10);

  try {
    const [mensajes, fotos, momentos, respuestas, pendientes, visitas, cartas] = await Promise.all([
      opcional<{ de: Persona }>(db().from("pensamientos").select("de").gte("created_at", inicio).lt("created_at", finExclusivo)),
      opcional<{ persona: Persona; path: string; nota: string | null; fecha: string }>(
        db().from("fotos").select("persona, path, nota, fecha").gte("fecha", inicio).lte("fecha", fin).order("fecha"),
      ),
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
    ]);

    // Preguntas que respondieron los dos
    const porDia = new Map<string, Partial<Record<Persona, string>>>();
    for (const r of respuestas) porDia.set(r.fecha, { ...porDia.get(r.fecha), [r.persona]: r.respuesta });
    const ambas = [...porDia.entries()].filter(([, r]) => r.a && r.b).sort(([x], [y]) => x.localeCompare(y));

    // Hasta 9 fotos repartidas a lo largo del mes
    const paso = Math.max(1, Math.floor(fotos.length / 9));
    const elegidas = fotos.filter((_, i) => i % paso === 0).slice(0, 9);
    const urls = await firmar(elegidas.map((f) => f.path));

    return Response.json({
      n,
      inicio,
      fin,
      terminado: n < mesDe(hoy),
      mensajes: { a: mensajes.filter((m) => m.de === "a").length, b: mensajes.filter((m) => m.de === "b").length },
      fotos: {
        total: fotos.length,
        dias: new Set(fotos.map((f) => f.fecha)).size,
        muestra: elegidas.filter((f) => urls[f.path]).map((f) => ({ url: urls[f.path], persona: f.persona, nota: f.nota })),
      },
      momentos,
      preguntas: {
        total: ambas.length,
        // Una pregunta del mes con las dos respuestas, para el "número especial"
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
    });
  } catch (e) {
    return error(e);
  }
}
