import { db, error, nombresActuales, notificar } from "@/lib/servidor";
import { horaLocal, hoyCompartido, mesiversario, otra, type Persona } from "@/lib/config";
import { limpiarHistorias } from "@/lib/historias";

// Vercel lo llama todos los días (ver vercel.json): 10:00 a.m. y 10:00 p.m. hora de Hermosillo/Culiacán.
// - Mañana: si es mesiversario, lo festeja; si nadie ha mandado mensaje, recuerda dar los buenos días.
// - Noche: a quien no anotó nada en el diario, se lo recuerda; si nadie mandó mensaje, las buenas noches.

// Cuenta filas sin romper el recordatorio si la tabla aún no existe
async function contar(consulta: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const r = await consulta;
    return r.error ? null : (r.count ?? 0);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  // Solo Vercel (con el CRON_SECRET) puede llamar a esta ruta
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return Response.json({ error: "Falta configurar CRON_SECRET" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secreto}`) return Response.json({ error: "No autorizado" }, { status: 401 });

  const tipo = new URL(req.url).searchParams.get("tipo");
  if (tipo !== "manana" && tipo !== "noche") return Response.json({ error: "Tipo inválido" }, { status: 400 });

  try {
    // En la noche (10 p.m. local) ya es otro día en UTC, pero hoyCompartido() sigue siendo el día local
    const hoy = hoyCompartido();
    const desde = tipo === "manana" ? horaLocal(hoy, 0) : horaLocal(hoy, 18);
    const nombres = await nombresActuales();
    const personas: Persona[] = ["a", "b"];
    const avisos: string[] = [];
    let dispositivos = 0;
    const mandar = async (p: Persona, titulo: string, texto: string, url?: string) => {
      dispositivos += await notificar(p, titulo, texto, url);
    };

    if (tipo === "manana") {
      const meses = mesiversario(hoy);
      if (meses) {
        const texto = meses % 12 === 0 ? `¡Hoy cumplen ${meses / 12} ${meses === 12 ? "año" : "años"} juntos!` : `¡Hoy cumplen ${meses} meses juntos!`;
        await Promise.all(personas.map((p) => mandar(p, "Feliz mesiversario", texto)));
        avisos.push("mesiversario");
      }
    } else {
      // Historias vencidas: se borran con su imagen para no gastar espacio
      try {
        const borradas = await limpiarHistorias();
        if (borradas) avisos.push(`historias-borradas-${borradas}`);
      } catch {}
      // Diario: a cada quien que no ha anotado nada hoy
      for (const p of personas) {
        const anotadas = await contar(db().from("diario").select("*", { count: "exact", head: true }).eq("persona", p).eq("fecha", hoy));
        if (anotadas === 0) {
          await mandar(p, "Diario", `¿Qué hiciste hoy? Anótalo para ${nombres[otra(p)]}`, "/#nosotros/diario");
          avisos.push(`diario-${p}`);
        }
      }
    }

    const { count } = await db().from("pensamientos").select("*", { count: "exact", head: true }).gte("created_at", desde);
    if (!count) {
      await Promise.all(
        personas.map((p) =>
          tipo === "manana"
            ? mandar(p, "Buenos días", `¿Ya le diste los buenos días a ${nombres[otra(p)]}?`)
            : mandar(p, "Buenas noches", `¿Ya le diste las buenas noches a ${nombres[otra(p)]}?`),
        ),
      );
      avisos.push("saludo");
    }
    return Response.json({ ok: true, avisos, dispositivos });
  } catch (e) {
    return error(e);
  }
}
