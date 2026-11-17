import { db, error, invalido, autenticar, revisar } from "@/lib/servidor";

function urlValida(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function dueno(id: number): Promise<string | null> {
  const fila = revisar(await db().from("deseos").select("persona").eq("id", id).maybeSingle());
  return fila?.persona ?? null;
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { titulo, url, nota } = await req.json().catch(() => ({}));
  if (!urlValida(url)) return invalido("Revisa el link");
  const link = url.trim();

  try {
    revisar(
      await db()
        .from("deseos")
        .insert({
          persona: yo,
          url: link,
          titulo: typeof titulo === "string" && titulo.trim() ? titulo.trim().slice(0, 120) : new URL(link).hostname.replace(/^www\./, ""),
          nota: typeof nota === "string" && nota.trim() ? nota.trim().slice(0, 300) : null,
        }),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Marcar como comprado: solo lo puede hacer el otro
export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, comprado } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id) || typeof comprado !== "boolean") return invalido();

  try {
    const de = await dueno(id);
    if (!de) return invalido("No existe");
    if (de === yo) return invalido("No puedes marcar tus propios deseos");
    revisar(await db().from("deseos").update({ comprado }).eq("id", id));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar: solo el dueño
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    if ((await dueno(id)) !== yo) return invalido("Solo puedes borrar tus propios deseos");
    revisar(await db().from("deseos").delete().eq("id", id));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
