import { db, error, autenticar } from "@/lib/servidor";

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { subscription } = await req.json().catch(() => ({}));
  if (typeof subscription?.endpoint !== "string") {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const { error: e } = await db()
      .from("suscripciones")
      .upsert({ endpoint: subscription.endpoint, persona: yo, data: subscription }, { onConflict: "endpoint" });
    if (e) throw new Error(e.message);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
