import { borrarImagenes, db, error, firmar, invalido, autenticar, revisar, subirImagen } from "@/lib/servidor";
import { esFecha } from "@/lib/config";

type Fila = {
  id: number;
  fecha: string;
  titulo: string;
  descripcion: string | null;
  creado_por: string;
  momento_fotos: { id: number; path: string; created_at: string }[];
};

// Máximo de fotos por momento
const MAX_FOTOS = 20;

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const filas: Fila[] =
      revisar(
        await db()
          .from("momentos")
          .select("id, fecha, titulo, descripcion, creado_por, momento_fotos (id, path, created_at)")
          .order("fecha", { ascending: false })
          .order("id", { ascending: false }),
      ) ?? [];
    const urls = await firmar(filas.flatMap((f) => f.momento_fotos.map((x) => x.path)));
    return Response.json({
      maximo: MAX_FOTOS,
      momentos: filas.map(({ momento_fotos, ...m }) => ({
        ...m,
        fotos: momento_fotos
          .sort((x, y) => x.created_at.localeCompare(y.created_at))
          .filter((x) => urls[x.path])
          .map((x) => ({ id: x.id, url: urls[x.path] })),
      })),
    });
  } catch (e) {
    return error(e);
  }
}

// Crear el momento (las fotos se suben después, una por una, con PUT)
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { fecha, titulo, descripcion } = await req.json().catch(() => ({}));
  if (!esFecha(fecha) || typeof titulo !== "string" || !titulo.trim()) return invalido();

  try {
    const nuevo = revisar(
      await db()
        .from("momentos")
        .insert({
          fecha,
          titulo: titulo.trim().slice(0, 120),
          descripcion: typeof descripcion === "string" && descripcion.trim() ? descripcion.trim().slice(0, 1000) : null,
          creado_por: yo,
        })
        .select("id")
        .single(),
    );
    if (!nuevo) throw new Error("No se pudo guardar el momento");
    return Response.json({ ok: true, id: nuevo.id });
  } catch (e) {
    return error(e);
  }
}

// Agregar UNA foto a un momento
export async function PUT(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  const id = Number(form?.get("id"));
  if (!form || !Number.isInteger(id)) return invalido();

  try {
    const existe = revisar(await db().from("momentos").select("id").eq("id", id).maybeSingle());
    if (!existe) return invalido("Ese momento ya no existe");
    const { count } = await db().from("momento_fotos").select("*", { count: "exact", head: true }).eq("momento_id", id);
    if ((count ?? 0) >= MAX_FOTOS) return invalido(`Máximo ${MAX_FOTOS} fotos por momento`);

    const path = await subirImagen(form.get("foto"), "momentos");
    revisar(await db().from("momento_fotos").insert({ momento_id: id, path }));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// ?id= borra el momento completo; ?foto= borra solo esa foto
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const params = new URL(req.url).searchParams;
  const id = Number(params.get("id"));
  const foto = Number(params.get("foto"));

  try {
    if (params.has("foto")) {
      if (!Number.isInteger(foto)) return invalido();
      const borrada = revisar(await db().from("momento_fotos").delete().eq("id", foto).select("path").maybeSingle());
      if (borrada) await borrarImagenes([borrada.path]);
      return Response.json({ ok: true });
    }

    if (!Number.isInteger(id)) return invalido();
    const fotos: { path: string }[] = revisar(await db().from("momento_fotos").select("path").eq("momento_id", id)) ?? [];
    revisar(await db().from("momentos").delete().eq("id", id));
    await borrarImagenes(fotos.map((f) => f.path));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
