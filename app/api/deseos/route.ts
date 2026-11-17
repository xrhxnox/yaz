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

// Editar nombre, link y nota: solo el dueño
export async function PUT(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, titulo, url, nota } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return invalido();
  if (!urlValida(url)) return invalido("Revisa el link");
  const link = url.trim();

  try {
    if ((await dueno(id)) !== yo) return invalido("Solo puedes editar tus propios deseos");
    revisar(
      await db()
        .from("deseos")
        .update({
          url: link,
          titulo: typeof titulo === "string" && titulo.trim() ? titulo.trim().slice(0, 120) : new URL(link).hostname.replace(/^www\./, ""),
          nota: typeof nota === "string" && nota.trim() ? nota.trim().slice(0, 300) : null,
        })
        .eq("id", id),
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

  const cuerpo = await req.json().catch(() => ({}));

  // { orden: [ids] } → guarda el orden de TU wishlist
  if (Array.isArray(cuerpo.orden)) {
    const ids: number[] = cuerpo.orden.filter((x: unknown) => Number.isInteger(x));
    try {
      const mios: { id: number }[] = revisar(await db().from("deseos").select("id").eq("persona", yo)) ?? [];
      const propios = new Set(mios.map((m) => m.id));
      if (ids.some((x) => !propios.has(x))) return invalido("Solo puedes ordenar tu propia wishlist");
      await Promise.all(ids.map((x, i) => db().from("deseos").update({ orden: i }).eq("id", x).then(revisar)));
      return Response.json({ ok: true });
    } catch (e) {
      return error(e);
    }
  }

  const { id, comprado } = cuerpo;
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
