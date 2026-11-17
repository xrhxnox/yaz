import { db, error, invalido, autenticar, nombresActuales, notificar, revisar } from "@/lib/servidor";
import type { Persona } from "@/lib/config";
import { esTipoReaccion } from "@/lib/reacciones";

// Reaccionar a una foto o entrada del diario de la otra persona:
// { tipo: "foto" | "diario", id, corazon?: boolean, comentario?: string } (comentario vacío = quitarlo)
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { tipo, id, corazon, comentario } = await req.json().catch(() => ({}));
  if (!esTipoReaccion(tipo) || !Number.isInteger(id)) return invalido();
  if (corazon !== undefined && typeof corazon !== "boolean") return invalido();
  if (comentario !== undefined && typeof comentario !== "string") return invalido();

  try {
    const tabla = tipo === "foto" ? "fotos" : "diario";
    const objeto = revisar(await db().from(tabla).select("persona").eq("id", id).maybeSingle()) as { persona: Persona } | null;
    if (!objeto) return invalido("Ya no existe");
    if (objeto.persona === yo) return invalido("No puedes reaccionar a lo tuyo");

    const antes = revisar(
      await db().from("reacciones").select("corazon, comentario").eq("tipo", tipo).eq("objeto", id).eq("persona", yo).maybeSingle(),
    ) as { corazon: boolean; comentario: string | null } | null;

    const nuevoCorazon = corazon ?? antes?.corazon ?? false;
    const nuevoComentario = comentario === undefined ? (antes?.comentario ?? null) : comentario.trim().slice(0, 200) || null;
    revisar(
      await db()
        .from("reacciones")
        .upsert(
          { tipo, objeto: id, persona: yo, corazon: nuevoCorazon, comentario: nuevoComentario, updated_at: new Date().toISOString() },
          { onConflict: "tipo,objeto,persona" },
        ),
    );

    // Aviso solo cuando hay algo nuevo (no al quitar)
    const que = tipo === "foto" ? "tu foto" : "lo que anotaste";
    const url = tipo === "foto" ? "/#fotos" : "/#fotos/diario";
    const nombre = (await nombresActuales())[yo];
    if (nuevoComentario && nuevoComentario !== antes?.comentario) {
      await notificar(objeto.persona, `${nombre} comentó ${que}`, nuevoComentario, url);
    } else if (nuevoCorazon && !antes?.corazon) {
      await notificar(objeto.persona, "Le gustó", `A ${nombre} le gustó ${que}`, url);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
