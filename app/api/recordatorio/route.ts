import { db, error, nombresActuales, notificar } from "@/lib/servidor";
import { ZONA_COMPARTIDA, hoyCompartido, otra, type Persona } from "@/lib/config";

// Vercel lo llama todos los días (ver vercel.json): 10:00 a.m. y 10:00 p.m. hora de Hermosillo/Culiacán.
// Si ese día (o esa noche) nadie ha mandado ningún mensaje, les recuerda a los dos.

// Momento exacto (UTC) de una hora local en la zona compartida
function horaLocal(fecha: string, hora: number) {
  const desfase = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_COMPARTIDA, timeZoneName: "shortOffset" })
    .formatToParts(new Date(fecha + "T12:00:00Z"))
    .find((p) => p.type === "timeZoneName")?.value; // ej. "GMT-7"
  const [, signo, h, m] = desfase?.match(/GMT([+-])(\d+)(?::(\d+))?/) ?? [, "+", "0", "0"];
  const minutos = (Number(h) * 60 + Number(m ?? 0)) * (signo === "-" ? -1 : 1);
  return new Date(Date.parse(fecha + "T00:00:00Z") + hora * 3600e3 - minutos * 60e3).toISOString();
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
    const { count } = await db().from("pensamientos").select("*", { count: "exact", head: true }).gte("created_at", desde);
    if (count) return Response.json({ ok: true, enviado: false, motivo: "Ya se mandaron mensajes" });

    const nombres = await nombresActuales();
    const enviadas = await Promise.all(
      (["a", "b"] as Persona[]).map((p) =>
        tipo === "manana"
          ? notificar(p, "Buenos días", `¿Ya le diste los buenos días a ${nombres[otra(p)]}?`)
          : notificar(p, "Buenas noches", `¿Ya le diste las buenas noches a ${nombres[otra(p)]}?`),
      ),
    );
    return Response.json({ ok: true, enviado: true, dispositivos: enviadas.reduce((a, b) => a + b, 0) });
  } catch (e) {
    return error(e);
  }
}
