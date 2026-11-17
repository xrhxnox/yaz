import { borrarImagenes, db, error, firmar, invalido, autenticar, revisar, subirImagen } from "@/lib/servidor";
import { esFecha } from "@/lib/config";

type Fila = { id: number; fecha: string; titulo: string; descripcion: string | null; foto_path: string | null; creado_por: string };

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const filas: Fila[] = revisar(
      await db()
        .from("momentos")
        .select("id, fecha, titulo, descripcion, foto_path, creado_por")
        .order("fecha", { ascending: false })
        .order("id", { ascending: false }),
    ) ?? [];
    const urls = await firmar(filas.map((f) => f.foto_path));
    return Response.json({
      momentos: filas.map(({ foto_path, ...m }) => ({ ...m, foto: foto_path ? (urls[foto_path] ?? null) : null })),
    });
  } catch (e) {
    return error(e);
  }
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  const fecha = form?.get("fecha");
  const titulo = form?.get("titulo");
  const descripcion = form?.get("descripcion");
  if (!form || !esFecha(fecha) || typeof titulo !== "string" || !titulo.trim()) return invalido();

  try {
    const foto = form.get("foto");
    const foto_path = foto instanceof File && foto.size > 0 ? await subirImagen(foto, "momentos") : null;
    revisar(
      await db()
        .from("momentos")
        .insert({
          fecha,
          titulo: titulo.trim().slice(0, 120),
          descripcion: typeof descripcion === "string" && descripcion.trim() ? descripcion.trim().slice(0, 1000) : null,
          foto_path,
          creado_por: yo,
        }),
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
    const borrado = revisar(await db().from("momentos").delete().eq("id", id).select("foto_path").maybeSingle());
    if (borrado?.foto_path) await borrarImagenes([borrado.foto_path]);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
