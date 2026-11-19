import { db, error, invalido, autenticar, nombresActuales, notificar, revisar } from "@/lib/servidor";
import { esFecha, formatearFecha, hoyCompartido, otra, type Persona } from "@/lib/config";

type Fila = {
  id: number;
  de: Persona;
  para: Persona;
  titulo: string;
  contenido: string;
  abrir_desde: string | null;
  condicion: string | null;
  abierta_at: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;
  const hoy = hoyCompartido();

  try {
    const filas: Fila[] = revisar(await db().from("cartas").select("*").order("created_at", { ascending: false })) ?? [];
    return Response.json({
      // Las que me escribieron: el contenido solo se manda cuando ya la abrí
      recibidas: filas
        .filter((c) => c.para === yo)
        .map(({ contenido, ...c }) => ({
          ...c,
          contenido: c.abierta_at ? contenido : null,
          // Se puede abrir si no tiene fecha o si la fecha ya llegó
          disponible: !c.abrir_desde || c.abrir_desde <= hoy,
        })),
      // Las que yo escribí: las veo completas y sé si ya la abrió
      enviadas: filas.filter((c) => c.de === yo),
    });
  } catch (e) {
    return error(e);
  }
}

// Escribir una carta para la otra persona
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { titulo, contenido, abrir_desde, condicion } = await req.json().catch(() => ({}));
  if (typeof titulo !== "string" || !titulo.trim() || typeof contenido !== "string" || !contenido.trim()) return invalido();
  if (abrir_desde != null && !esFecha(abrir_desde)) return invalido("Fecha inválida");

  try {
    revisar(
      await db()
        .from("cartas")
        .insert({
          de: yo,
          para: otra(yo),
          titulo: titulo.trim().slice(0, 120),
          contenido: contenido.trim().slice(0, 10000),
          abrir_desde: abrir_desde || null,
          condicion: typeof condicion === "string" && condicion.trim() ? condicion.trim().slice(0, 120) : null,
        }),
    );
    const cuando = abrir_desde ? `Se abre el ${formatearFecha(abrir_desde, { day: "numeric", month: "long" })}` : "Ya la puedes abrir";
    await notificar(otra(yo), "Una carta para ti", `${(await nombresActuales())[yo]} te escribió una carta. ${cuando}.`, "/#nosotros/buzon");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Abrir una carta (solo quien la recibe, y solo si ya llegó la fecha)
export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return invalido();

  try {
    const carta = revisar(await db().from("cartas").select("para, abrir_desde, abierta_at").eq("id", id).maybeSingle());
    if (!carta || carta.para !== yo) return invalido("Esta carta no es para ti");
    if (carta.abrir_desde && carta.abrir_desde > hoyCompartido()) return invalido("Todavía no se puede abrir");
    if (!carta.abierta_at) revisar(await db().from("cartas").update({ abierta_at: new Date().toISOString() }).eq("id", id));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar: solo quien la escribió
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    const borrada = revisar(await db().from("cartas").delete().eq("id", id).eq("de", yo).select("id").maybeSingle());
    if (!borrada) return invalido("Solo puedes borrar las cartas que escribiste");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
