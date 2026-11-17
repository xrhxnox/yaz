import { db, error, invalido, autenticar, revisar } from "@/lib/servidor";
import { esCategoria } from "@/lib/config";

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const pendientes = revisar(
      await db()
        .from("pendientes")
        .select("id, texto, categoria, hecho, creado_por, created_at, hecho_at")
        .order("created_at", { ascending: false }),
    );
    return Response.json({ pendientes });
  } catch (e) {
    return error(e);
  }
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { texto, categoria } = await req.json().catch(() => ({}));
  if (typeof texto !== "string" || !texto.trim() || !esCategoria(categoria)) return invalido();

  try {
    revisar(await db().from("pendientes").insert({ texto: texto.trim().slice(0, 200), categoria, creado_por: yo }));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, hecho } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id) || typeof hecho !== "boolean") return invalido();

  try {
    revisar(
      await db()
        .from("pendientes")
        .update({ hecho, hecho_at: hecho ? new Date().toISOString() : null })
        .eq("id", id),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    revisar(await db().from("pendientes").delete().eq("id", id));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
