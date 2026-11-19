import { borrarImagenes, db, error, firmar, invalido, autenticar, nombresActuales, notificar, revisar, subirImagen } from "@/lib/servidor";
import { hoyCompartido, otra, type Persona } from "@/lib/config";

// Fotos por publicación
const MAX_FOTOS = 10;

type Fila = {
  id: number;
  persona: Persona;
  fecha: string;
  texto: string | null;
  created_at: string;
  publicacion_fotos: { id: number; path: string; orden: number; miniatura?: string | null }[];
  publicacion_likes: { persona: Persona }[];
  comentarios: { id: number; persona: Persona; texto: string; created_at: string }[];
};

// El muro: publicaciones de la más nueva a la más vieja, con fotos, me gusta y comentarios
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const consulta = (fotos: string) =>
      db()
        .from("publicaciones")
        .select(`id, persona, fecha, texto, created_at, publicacion_fotos(${fotos}), publicacion_likes(persona), comentarios(id, persona, texto, created_at)`)
        .order("created_at", { ascending: false })
        .limit(200);
    // Con miniatura; si la columna aún no existe en Supabase, sin ella
    let r = await consulta("id, path, orden, miniatura");
    if (r.error && /miniatura/.test(r.error.message)) r = await consulta("id, path, orden");
    const filas: Fila[] = (revisar(r) as Fila[] | null) ?? [];
    const urls = await firmar(filas.flatMap((p) => p.publicacion_fotos.flatMap((f) => [f.path, f.miniatura])));

    const publicaciones = filas
      .map((p) => ({
        id: p.id,
        persona: p.persona,
        fecha: p.fecha,
        texto: p.texto,
        created_at: p.created_at,
        fotos: [...p.publicacion_fotos]
          .sort((a, b) => a.orden - b.orden)
          .filter((f) => urls[f.path])
          .map((f) => ({ id: f.id, url: urls[f.path], mini: (f.miniatura && urls[f.miniatura]) || null })),
        likes: p.publicacion_likes.map((l) => l.persona),
        comentarios: [...p.comentarios].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
      }))
      // Sin fotos todavía (se están subiendo) no se muestra
      .filter((p) => p.fotos.length > 0);

    return Response.json({ publicaciones, maximo: MAX_FOTOS });
  } catch (e) {
    return error(e);
  }
}

// Nueva publicación: { texto? } → { id }. Las fotos se suben después con PUT, una por una
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { texto } = await req.json().catch(() => ({}));
  if (texto != null && typeof texto !== "string") return invalido();

  try {
    const nueva = revisar(
      await db()
        .from("publicaciones")
        .insert({ persona: yo, fecha: hoyCompartido(), texto: texto?.trim() ? texto.trim().slice(0, 2000) : null })
        .select("id")
        .single(),
    ) as { id: number };
    return Response.json({ id: nueva.id });
  } catch (e) {
    return error(e);
  }
}

// Subir UNA foto a mi publicación (form: id, foto, miniatura?). Con la primera foto se le avisa a la otra persona
export async function PUT(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  const id = Number(form?.get("id"));
  if (!form || !Number.isInteger(id)) return invalido();

  try {
    const pub = revisar(await db().from("publicaciones").select("persona").eq("id", id).maybeSingle()) as { persona: Persona } | null;
    if (!pub || pub.persona !== yo) return invalido("Esa publicación no es tuya");
    const { count } = await db().from("publicacion_fotos").select("*", { count: "exact", head: true }).eq("publicacion_id", id);
    if ((count ?? 0) >= MAX_FOTOS) return invalido(`Máximo ${MAX_FOTOS} fotos por publicación`);

    const path = await subirImagen(form.get("foto"), "muro");
    const mini = form.get("miniatura");
    const miniatura = mini instanceof File && mini.size ? await subirImagen(mini, "muro/mini") : null;
    const fila: Record<string, unknown> = { publicacion_id: id, path, orden: count ?? 0 };
    const r = await db().from("publicacion_fotos").insert(miniatura ? { ...fila, miniatura } : fila);
    if (r.error && miniatura && /miniatura/.test(r.error.message)) {
      // Todavía no existe la columna: se guarda sin miniatura
      revisar(await db().from("publicacion_fotos").insert(fila));
      await borrarImagenes([miniatura]);
    } else revisar(r);
    if (!count) await notificar(otra(yo), "Muro", `${(await nombresActuales())[yo]} publicó en el muro`, "/#muro");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// { id, texto } → corregir el texto de mi publicación; { id, like: true|false } → me gusta
export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, texto, like } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return invalido();

  try {
    if (typeof texto === "string") {
      revisar(
        await db()
          .from("publicaciones")
          .update({ texto: texto.trim() ? texto.trim().slice(0, 2000) : null })
          .eq("id", id)
          .eq("persona", yo),
      );
    }
    if (typeof like === "boolean") {
      if (like) {
        const pub = revisar(await db().from("publicaciones").select("persona").eq("id", id).maybeSingle()) as { persona: Persona } | null;
        if (!pub) return invalido("Esa publicación ya no existe");
        const { data: antes } = await db().from("publicacion_likes").select("persona").eq("publicacion_id", id).eq("persona", yo).maybeSingle();
        revisar(await db().from("publicacion_likes").upsert({ publicacion_id: id, persona: yo }, { onConflict: "publicacion_id,persona" }));
        if (!antes && pub.persona !== yo) {
          await notificar(pub.persona, "Le gustó", `A ${(await nombresActuales())[yo]} le gustó tu publicación`, "/#muro");
        }
      } else {
        revisar(await db().from("publicacion_likes").delete().eq("publicacion_id", id).eq("persona", yo));
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar mi publicación (con sus fotos, me gusta y comentarios)
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    const pub = revisar(await db().from("publicaciones").select("persona, fecha, origen").eq("id", id).maybeSingle()) as {
      persona: Persona;
      fecha: string;
      origen: string | null;
    } | null;
    if (!pub || pub.persona !== yo) return invalido("Solo puedes borrar tus publicaciones");
    let rf: { data: unknown; error: { message: string } | null } = await db().from("publicacion_fotos").select("path, miniatura").eq("publicacion_id", id);
    if (rf.error && /miniatura/.test(rf.error.message)) rf = await db().from("publicacion_fotos").select("path").eq("publicacion_id", id);
    const fotos = ((revisar(rf) ?? []) as { path: string; miniatura?: string | null }[]).flatMap((f) => [f.path, f.miniatura]).filter((p): p is string => !!p);
    revisar(await db().from("publicaciones").delete().eq("id", id));
    // Si venía de las fotos del día, se borran también de ahí para que no vuelva a aparecer
    if (pub.origen?.startsWith("fotos:")) await db().from("fotos").delete().eq("persona", yo).eq("fecha", pub.fecha);
    await borrarImagenes(fotos);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
