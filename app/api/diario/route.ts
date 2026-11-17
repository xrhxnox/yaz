import { db, error, invalido, autenticar, revisar } from "@/lib/servidor";
import { esFecha, esTipoDiario, hoyCompartido } from "@/lib/config";

// Lo que anotaron los dos en un día (?fecha=AAAA-MM-DD, por defecto hoy)
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const fecha = new URL(req.url).searchParams.get("fecha") || hoyCompartido();
  if (!esFecha(fecha)) return invalido("Fecha inválida");

  try {
    const entradas =
      revisar(await db().from("diario").select("id, persona, fecha, tipo, texto, link, created_at").eq("fecha", fecha).order("created_at")) ?? [];
    return Response.json({ fecha, hoy: hoyCompartido(), entradas });
  } catch (e) {
    return error(e);
  }
}

// Anotar algo: { tipo, texto, link?, fecha? } (no se puede anotar en días que no han llegado)
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { tipo, texto, link, fecha } = await req.json().catch(() => ({}));
  if (!esTipoDiario(tipo) || typeof texto !== "string" || !texto.trim()) return invalido();
  const hoy = hoyCompartido();
  const dia = fecha ?? hoy;
  if (!esFecha(dia) || dia > hoy) return invalido("Fecha inválida");
  const enlace = typeof link === "string" ? link.trim() : "";
  if (enlace && !/^https?:\/\/\S+$/i.test(enlace)) return invalido("El link debe empezar con https://");

  try {
    revisar(
      await db()
        .from("diario")
        .insert({ persona: yo, fecha: dia, tipo, texto: texto.trim().slice(0, 300), link: enlace ? enlace.slice(0, 500) : null }),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar algo que anoté yo
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    revisar(await db().from("diario").delete().eq("id", id).eq("persona", yo));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
