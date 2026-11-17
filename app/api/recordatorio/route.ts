import { db, error, nombresActuales, notificar } from "@/lib/servidor";
import { horaLocal, hoyCompartido, otra, type Persona } from "@/lib/config";

// Vercel lo llama todos los días (ver vercel.json): 10:00 a.m. y 10:00 p.m. hora de Hermosillo/Culiacán.
// Si ese día (o esa noche) nadie ha mandado ningún mensaje, les recuerda a los dos.

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
