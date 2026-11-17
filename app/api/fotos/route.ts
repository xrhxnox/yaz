import { borrarImagenes, db, error, firmar, invalido, autenticar, notificar, revisar, subirImagen } from "@/lib/servidor";
import { NOMBRES, hoyCompartido, otra, type Persona } from "@/lib/config";

type Fila = { id: number; fecha: string; persona: Persona; path: string; nota: string | null };
type Foto = { id: number; url: string; nota: string | null };

// Máximo de fotos por persona por día
const MAX_POR_DIA = 12;

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const filas: Fila[] =
      revisar(
        await db()
          .from("fotos")
          .select("id, fecha, persona, path, nota")
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(400),
      ) ?? [];
    const urls = await firmar(filas.map((f) => f.path));

    const porDia = new Map<string, Record<Persona, Foto[]>>();
    for (const f of filas) {
      if (!urls[f.path]) continue;
      const dia = porDia.get(f.fecha) ?? { a: [], b: [] };
      dia[f.persona].push({ id: f.id, url: urls[f.path], nota: f.nota });
      porDia.set(f.fecha, dia);
    }

    return Response.json({
      hoy: hoyCompartido(),
      maximo: MAX_POR_DIA,
      dias: [...porDia.entries()].map(([fecha, fotos]) => ({ fecha, ...fotos })),
    });
  } catch (e) {
    return error(e);
  }
}

// Sube UNA foto (la app manda varias una por una)
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  const nota = form?.get("nota");
  if (!form) return invalido();
  const hoy = hoyCompartido();

  try {
    const { count } = await db().from("fotos").select("*", { count: "exact", head: true }).eq("fecha", hoy).eq("persona", yo);
    if ((count ?? 0) >= MAX_POR_DIA) return invalido(`Máximo ${MAX_POR_DIA} fotos por día`);

    const path = await subirImagen(form.get("foto"), `dia/${hoy}`);
    revisar(
      await db()
        .from("fotos")
        .insert({ fecha: hoy, persona: yo, path, nota: typeof nota === "string" && nota.trim() ? nota.trim().slice(0, 200) : null }),
    );
    // Solo avisamos con la primera foto del día, para no llenar de notificaciones
    if (!count) await notificar(otra(yo), "Fotos del día", `${NOMBRES[yo]} subió fotos de hoy`, "/#fotos");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar: solo tus propias fotos
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    const borrada = revisar(await db().from("fotos").delete().eq("id", id).eq("persona", yo).select("path").maybeSingle());
    if (!borrada) return invalido("Solo puedes borrar tus propias fotos");
    await borrarImagenes([borrada.path]);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
