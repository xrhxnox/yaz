import { db, error, invalido, autenticar, revisar } from "@/lib/servidor";

// Guardar (o quitar, si viene vacío) tu estado o ánimo
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { texto } = await req.json().catch(() => ({}));
  if (texto !== null && typeof texto !== "string") return invalido();

  try {
    if (!texto?.trim()) {
      revisar(await db().from("animos").delete().eq("persona", yo));
    } else {
      revisar(await db().from("animos").upsert({ persona: yo, texto: texto.trim().slice(0, 60), updated_at: new Date().toISOString() }));
    }
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
