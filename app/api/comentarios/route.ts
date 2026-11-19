import { db, error, invalido, autenticar, nombresActuales, notificar, revisar } from "@/lib/servidor";
import { otra } from "@/lib/config";

// Comentar una publicación del muro: { publicacion, texto }
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { publicacion, texto } = await req.json().catch(() => ({}));
  if (!Number.isInteger(publicacion) || typeof texto !== "string" || !texto.trim()) return invalido();

  try {
    const existe = revisar(await db().from("publicaciones").select("id").eq("id", publicacion).maybeSingle());
    if (!existe) return invalido("Esa publicación ya no existe");
    const limpio = texto.trim().slice(0, 500);
    revisar(await db().from("comentarios").insert({ publicacion_id: publicacion, persona: yo, texto: limpio }));
    await notificar(otra(yo), `${(await nombresActuales())[yo]} comentó`, limpio, "/#muro");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar un comentario mío
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    revisar(await db().from("comentarios").delete().eq("id", id).eq("persona", yo));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
