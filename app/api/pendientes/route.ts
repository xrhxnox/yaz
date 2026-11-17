import { borrarImagenes, db, error, firmar, invalido, autenticar, revisar, subirImagen } from "@/lib/servidor";
import { esCategoria, esFecha } from "@/lib/config";

type Fila = {
  id: number;
  texto: string;
  categoria: string;
  hecho: boolean;
  creado_por: string;
  created_at: string;
  hecho_at: string | null;
  foto_path: string | null;
};

function hayFoto(v: FormDataEntryValue | null): v is File {
  return v instanceof File && v.size > 0;
}

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const filas: Fila[] =
      revisar(
        await db()
          .from("pendientes")
          .select("id, texto, categoria, hecho, creado_por, created_at, hecho_at, foto_path")
          .order("created_at", { ascending: false }),
      ) ?? [];
    const urls = await firmar(filas.map((f) => f.foto_path));
    return Response.json({
      pendientes: filas.map(({ foto_path, ...p }) => ({ ...p, foto: foto_path ? (urls[foto_path] ?? null) : null })),
    });
  } catch (e) {
    return error(e);
  }
}

// Agregar: texto, categoría y (opcional) una imagen
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  const texto = form?.get("texto");
  const categoria = form?.get("categoria");
  if (!form || typeof texto !== "string" || !texto.trim() || !esCategoria(categoria)) return invalido();

  try {
    const foto = form.get("foto");
    const foto_path = hayFoto(foto) ? await subirImagen(foto, "lista") : null;
    revisar(await db().from("pendientes").insert({ texto: texto.trim().slice(0, 200), categoria, creado_por: yo, foto_path }));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Poner o cambiar la imagen de algo que ya está en la lista
export async function PUT(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  const id = Number(form?.get("id"));
  const foto = form?.get("foto") ?? null;
  if (!Number.isInteger(id) || !hayFoto(foto)) return invalido();

  try {
    const anterior = revisar(await db().from("pendientes").select("foto_path").eq("id", id).maybeSingle());
    if (!anterior) return invalido("No existe");
    const foto_path = await subirImagen(foto, "lista");
    revisar(await db().from("pendientes").update({ foto_path }).eq("id", id));
    if (anterior.foto_path) await borrarImagenes([anterior.foto_path]);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, hecho, fecha } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id) || typeof hecho !== "boolean") return invalido();
  if (fecha !== undefined && !esFecha(fecha)) return invalido("Fecha inválida");
  // Se guarda a mediodía UTC para que la fecha no cambie por zona horaria
  const hecho_at = hecho ? (fecha ? `${fecha}T12:00:00Z` : new Date().toISOString()) : null;

  try {
    revisar(
      await db()
        .from("pendientes")
        .update({ hecho, hecho_at })
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
    const borrado = revisar(await db().from("pendientes").delete().eq("id", id).select("foto_path").maybeSingle());
    if (borrado?.foto_path) await borrarImagenes([borrado.foto_path]);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
