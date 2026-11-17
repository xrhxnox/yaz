import { db, error, invalido, autenticar, notificar, revisar } from "@/lib/servidor";
import { NOMBRES, hoyCompartido, otra } from "@/lib/config";
import { preguntaDe } from "@/lib/preguntas";

const MAX_RESPUESTA = 1000;

type Fila = { fecha: string; persona: "a" | "b"; respuesta: string };

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const persona = yo;
  const hoy = hoyCompartido();

  try {
    const filas: Fila[] = revisar(
      await db().from("respuestas").select("fecha, persona, respuesta").order("fecha", { ascending: false }).limit(120),
    ) ?? [];

    const porDia = new Map<string, Partial<Record<"a" | "b", string>>>();
    for (const f of filas) porDia.set(f.fecha, { ...porDia.get(f.fecha), [f.persona]: f.respuesta });

    const deHoy = porDia.get(hoy) ?? {};
    const mia = deHoy[persona] ?? null;
    const suya = deHoy[otra(persona)] ?? null;

    // Solo se muestran los días pasados donde los dos respondieron
    const historial = [...porDia.entries()]
      .filter(([fecha, r]) => fecha !== hoy && r.a && r.b)
      .map(([fecha, r]) => ({ fecha, pregunta: preguntaDe(fecha), a: r.a!, b: r.b! }));

    return Response.json({
      fecha: hoy,
      pregunta: preguntaDe(hoy),
      mia,
      // La respuesta del otro se revela hasta que contestes la tuya
      suya: mia ? suya : null,
      suyaRespondida: suya !== null,
      historial,
    });
  } catch (e) {
    return error(e);
  }
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { respuesta } = await req.json().catch(() => ({}));
  const persona = yo;
  if (typeof respuesta !== "string" || !respuesta.trim()) return invalido();
  const hoy = hoyCompartido();

  try {
    const previa = revisar(await db().from("respuestas").select("fecha").eq("fecha", hoy).eq("persona", persona).maybeSingle());
    revisar(
      await db()
        .from("respuestas")
        .upsert({ fecha: hoy, persona, respuesta: respuesta.trim().slice(0, MAX_RESPUESTA) }, { onConflict: "fecha,persona" }),
    );
    if (!previa) await notificar(otra(persona), "Pregunta del día", `${NOMBRES[persona]} ya respondió`, "/#pregunta");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
