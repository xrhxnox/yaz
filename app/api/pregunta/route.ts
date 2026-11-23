import { db, error, invalido, autenticar, notificar, revisar, nombresActuales } from "@/lib/servidor";
import { hoyCompartido, otra, type Persona } from "@/lib/config";
import { preguntaDe, quienResponde } from "@/lib/preguntas";

const MAX_RESPUESTA = 1000;

type Fila = { fecha: string; persona: Persona; respuesta: string };
type Numero = { fecha: string; persona: Persona; numero: number };

// Números elegidos (null si todavía no existe la tabla: entonces se juega como antes, responden los dos)
async function leerNumeros(): Promise<Numero[] | null> {
  const r = await db().from("pregunta_numeros").select("fecha, persona, numero").order("fecha", { ascending: false }).limit(240);
  if (r.error && /pregunta_numeros/.test(r.error.message)) return null;
  return (revisar(r) as Numero[] | null) ?? [];
}

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const tu = otra(yo);
  const hoy = hoyCompartido();

  try {
    const [filas, numeros] = await Promise.all([
      db().from("respuestas").select("fecha, persona, respuesta").order("fecha", { ascending: false }).limit(120).then((r) => (revisar(r) as Fila[] | null) ?? []),
      leerNumeros(),
    ]);

    const respuestasDe = new Map<string, Partial<Record<Persona, string>>>();
    for (const f of filas) respuestasDe.set(f.fecha, { ...respuestasDe.get(f.fecha), [f.persona]: f.respuesta });
    const numerosDe = new Map<string, Partial<Record<Persona, number>>>();
    for (const n of numeros ?? []) numerosDe.set(n.fecha, { ...numerosDe.get(n.fecha), [n.persona]: n.numero });

    const respHoy = respuestasDe.get(hoy) ?? {};
    const numHoy = numerosDe.get(hoy) ?? {};

    // Días pasados con al menos una respuesta (los de antes tenían las dos)
    const historial = [...respuestasDe.entries()]
      .filter(([fecha, r]) => fecha !== hoy && (r.a || r.b))
      .map(([fecha, r]) => {
        const n = numerosDe.get(fecha);
        return {
          fecha,
          pregunta: preguntaDe(fecha),
          a: r.a ?? null,
          b: r.b ?? null,
          numeros: n?.a && n?.b ? { a: n.a, b: n.b } : null,
        };
      });

    // Día que ya se jugó como antes (hay respuestas pero nadie eligió número): ese día sigue igual
    const diaDeAntes = !numHoy.a && !numHoy.b && !!(respHoy.a || respHoy.b);
    if (numeros === null || diaDeAntes) {
      // Como antes: responden los dos y la del otro se ve hasta que contestes
      const mia = respHoy[yo] ?? null;
      const suya = respHoy[tu] ?? null;
      return Response.json({ modo: "clasico", fecha: hoy, pregunta: preguntaDe(hoy), mia, suya: mia ? suya : null, suyaRespondida: suya !== null, historial });
    }

    const miNumero = numHoy[yo] ?? null;
    const suyoNumero = numHoy[tu] ?? null;
    const ambos = miNumero !== null && suyoNumero !== null;
    const responde = ambos ? quienResponde(numHoy.a!, numHoy.b!) : null;

    return Response.json({
      modo: "numeros",
      fecha: hoy,
      // La pregunta (y el número del otro) se revelan cuando los dos ya eligieron
      pregunta: ambos ? preguntaDe(hoy) : null,
      miNumero,
      suyoElegido: suyoNumero !== null,
      suyoNumero: ambos ? suyoNumero : null,
      responde,
      respuesta: responde ? (respHoy[responde] ?? null) : null,
      historial,
    });
  } catch (e) {
    return error(e);
  }
}

// { numero: 1 | 2 } → elegir mi número del día (una vez)
// { respuesta } → responder (en modo números, solo quien le toca)
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { respuesta, numero } = await req.json().catch(() => ({}));
  const tu = otra(yo);
  const hoy = hoyCompartido();

  try {
    const nombres = await nombresActuales();

    if (numero !== undefined) {
      if (numero !== 1 && numero !== 2) return invalido();
      // Si hoy ya respondieron como antes (sin números), los números empiezan mañana
      const yaHay = (revisar(await db().from("respuestas").select("persona").eq("fecha", hoy)) as unknown[] | null) ?? [];
      const algunNumero = (revisar(await db().from("pregunta_numeros").select("persona").eq("fecha", hoy)) as unknown[] | null) ?? [];
      if (yaHay.length && !algunNumero.length) return invalido("Hoy ya respondieron como antes; los números empiezan mañana");
      const r = await db().from("pregunta_numeros").insert({ fecha: hoy, persona: yo, numero });
      if (r.error && /duplicate|unique/i.test(r.error.message)) return invalido("Ya elegiste tu número de hoy");
      revisar(r);
      const suyo = revisar(await db().from("pregunta_numeros").select("numero").eq("fecha", hoy).eq("persona", tu).maybeSingle()) as { numero: number } | null;
      if (!suyo) {
        await notificar(tu, "Pregunta del día", `${nombres[yo]} ya eligió su número. Te toca elegir el tuyo`, "/#juegos/pregunta");
      } else {
        const responde = quienResponde(yo === "a" ? numero : suyo.numero, yo === "b" ? numero : suyo.numero);
        await notificar(
          tu,
          "Pregunta del día",
          responde === tu ? "¡Te toca responder la pregunta de hoy!" : `Hoy responde ${nombres[yo]}`,
          "/#juegos/pregunta",
        );
      }
      return Response.json({ ok: true });
    }

    if (typeof respuesta !== "string" || !respuesta.trim()) return invalido();

    // Si ya existe el juego de números, solo responde a quien le tocó
    const numeros = await leerNumeros();
    if (numeros !== null) {
      const deHoy = numeros.filter((n) => n.fecha === hoy);
      const na = deHoy.find((n) => n.persona === "a")?.numero;
      const nb = deHoy.find((n) => n.persona === "b")?.numero;
      const yaHay = (revisar(await db().from("respuestas").select("persona").eq("fecha", hoy)) as unknown[] | null) ?? [];
      // Día que empezó como antes: los dos pueden responder
      const diaDeAntes = !deHoy.length && yaHay.length > 0;
      if (!diaDeAntes) {
        if (!na || !nb) return invalido("Primero tienen que elegir su número los dos");
        if (quienResponde(na, nb) !== yo) return invalido(`Hoy le toca responder a ${nombres[tu]}`);
      }
    }

    const previa = revisar(await db().from("respuestas").select("fecha").eq("fecha", hoy).eq("persona", yo).maybeSingle());
    revisar(
      await db()
        .from("respuestas")
        .upsert({ fecha: hoy, persona: yo, respuesta: respuesta.trim().slice(0, MAX_RESPUESTA) }, { onConflict: "fecha,persona" }),
    );
    if (!previa) await notificar(tu, "Pregunta del día", `${nombres[yo]} respondió la pregunta de hoy`, "/#juegos/pregunta");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
