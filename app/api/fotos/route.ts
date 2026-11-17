import { borrarImagenes, db, error, firmar, invalido, autenticar, notificar, revisar, subirImagen } from "@/lib/servidor";
import { NOMBRES, hoyCompartido, otra, type Persona } from "@/lib/config";

type Fila = { fecha: string; persona: Persona; path: string; nota: string | null };
type Foto = { url: string; nota: string | null };

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const filas: Fila[] = revisar(
      await db().from("fotos").select("fecha, persona, path, nota").order("fecha", { ascending: false }).limit(120),
    ) ?? [];
    const urls = await firmar(filas.map((f) => f.path));

    const porDia = new Map<string, Partial<Record<Persona, Foto>>>();
    for (const f of filas) {
      if (!urls[f.path]) continue;
      porDia.set(f.fecha, { ...porDia.get(f.fecha), [f.persona]: { url: urls[f.path], nota: f.nota } });
    }

    const hoy = hoyCompartido();
    return Response.json({
      hoy,
      dias: [...porDia.entries()].map(([fecha, fotos]) => ({ fecha, a: fotos.a ?? null, b: fotos.b ?? null })),
    });
  } catch (e) {
    return error(e);
  }
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  const nota = form?.get("nota");
  if (!form) return invalido();
  const persona = yo;
  const hoy = hoyCompartido();

  try {
    const anterior = revisar(await db().from("fotos").select("path").eq("fecha", hoy).eq("persona", persona).maybeSingle());
    const path = await subirImagen(form.get("foto"), `dia/${hoy}`);
    revisar(
      await db()
        .from("fotos")
        .upsert(
          { fecha: hoy, persona, path, nota: typeof nota === "string" && nota.trim() ? nota.trim().slice(0, 200) : null },
          { onConflict: "fecha,persona" },
        ),
    );
    if (anterior) await borrarImagenes([anterior.path]);
    else await notificar(otra(persona), "Foto del día", `${NOMBRES[persona]} subió su foto de hoy`, "/#fotos");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
