import { db, error, firmar, invalido, autenticar, nombresActuales, notificar, revisar, subirImagen } from "@/lib/servidor";
import { hoyCompartido, otra, type Persona } from "@/lib/config";
import { DURACION_HISTORIA_MS, borrarImagenHistoria } from "@/lib/historias";

type Fila = {
  id: number;
  persona: Persona;
  path: string;
  texto: string | null;
  texto_x?: number | null;
  texto_y?: number | null;
  vista_at: string | null;
  created_at: string;
  historia_respuestas: { persona: Persona; corazon: boolean; texto: string | null; created_at: string }[];
};

// Historias de las últimas 24 horas de los dos, de la más vieja a la más nueva
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const desde = new Date(Date.now() - DURACION_HISTORIA_MS).toISOString();
    const consulta = (extra: string) =>
      db()
        .from("historias")
        .select(`id, persona, path, texto${extra}, vista_at, created_at, historia_respuestas(persona, corazon, texto, created_at)`)
        .gte("created_at", desde)
        .order("created_at");
    let r = await consulta(", texto_x, texto_y");
    if (r.error && /texto_/.test(r.error.message)) r = await consulta("");
    const filas: Fila[] = (revisar(r) as Fila[] | null) ?? [];
    const urls = await firmar(filas.map((h) => h.path));
    return Response.json({
      historias: filas
        .filter((h) => urls[h.path])
        .map(({ path, historia_respuestas, ...h }) => ({
          ...h,
          url: urls[path],
          // Las respuestas solo las ve quien subió la historia; la otra persona solo sabe si ya le dio corazón
          respuestas: h.persona === yo ? [...historia_respuestas].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)) : [],
          me_gusta: h.persona !== yo && historia_respuestas.some((r) => r.persona === yo && r.corazon),
        })),
    });
  } catch (e) {
    return error(e);
  }
}

// Subir UNA historia (form: foto). Se avisa a la otra persona si no había subido otra hace poco
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  if (!form) return invalido();
  const texto = form.get("texto");

  try {
    const hacePoco = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await db().from("historias").select("*", { count: "exact", head: true }).eq("persona", yo).gte("created_at", hacePoco);
    const path = await subirImagen(form.get("foto"), "historias");
    // Posición del texto (0 a 1); si no viene, al centro
    const lugar = (v: FormDataEntryValue | null) => {
      const n = Number(v);
      return v !== null && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
    };
    const fila: Record<string, unknown> = { persona: yo, path, texto: typeof texto === "string" && texto.trim() ? texto.trim().slice(0, 200) : null };
    const x = lugar(form.get("texto_x"));
    const y = lugar(form.get("texto_y"));
    const r = await db().from("historias").insert(x !== null && y !== null ? { ...fila, texto_x: x, texto_y: y } : fila);
    if (r.error && /texto_/.test(r.error.message)) revisar(await db().from("historias").insert(fila));
    else revisar(r);
    if (!count) await notificar(otra(yo), "Historia nueva", `${(await nombresActuales())[yo]} subió una historia`, "/#inicio");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// { id, vista: true } → ya la vi (solo la de la otra persona)
// { id, respuesta: { corazon?, texto? } } → responder a la historia de la otra persona
// { id, alMuro: true } → guardar mi historia como publicación del muro
export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, vista, respuesta, alMuro } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return invalido();

  try {
    const h = revisar(await db().from("historias").select("persona, path, texto").eq("id", id).maybeSingle()) as {
      persona: Persona;
      path: string;
      texto: string | null;
    } | null;
    if (!h) return invalido("Esa historia ya no existe");

    if (vista === true) {
      if (h.persona !== yo) revisar(await db().from("historias").update({ vista_at: new Date().toISOString() }).eq("id", id).is("vista_at", null));
    }

    if (respuesta && typeof respuesta === "object") {
      if (h.persona === yo) return invalido("No puedes responder a tu propia historia");
      const texto = typeof respuesta.texto === "string" ? respuesta.texto.trim().slice(0, 300) : "";
      const nombre = (await nombresActuales())[yo];
      if (texto) {
        revisar(await db().from("historia_respuestas").insert({ historia_id: id, persona: yo, corazon: false, texto }));
        await notificar(h.persona, `${nombre} respondió a tu historia`, texto, "/#inicio");
      } else if (respuesta.corazon === false) {
        // Quitar el corazón
        revisar(await db().from("historia_respuestas").delete().eq("historia_id", id).eq("persona", yo).eq("corazon", true).is("texto", null));
      } else if (respuesta.corazon === true) {
        // Un solo corazón por historia (y un solo aviso)
        const { count } = await db().from("historia_respuestas").select("*", { count: "exact", head: true }).eq("historia_id", id).eq("persona", yo).eq("corazon", true);
        if (!count) {
          revisar(await db().from("historia_respuestas").insert({ historia_id: id, persona: yo, corazon: true, texto: null }));
          await notificar(h.persona, "Le encantó", `A ${nombre} le encantó tu historia`, "/#inicio");
        }
      } else return invalido();
    }

    if (alMuro === true) {
      if (h.persona !== yo) return invalido("Solo puedes guardar tus historias");
      const { count } = await db().from("publicacion_fotos").select("*", { count: "exact", head: true }).eq("path", h.path);
      if (count) return invalido("Esa historia ya está en el muro");
      const pub = revisar(await db().from("publicaciones").insert({ persona: yo, fecha: hoyCompartido(), texto: h.texto }).select("id").single()) as { id: number };
      revisar(await db().from("publicacion_fotos").insert({ publicacion_id: pub.id, path: h.path, orden: 0 }));
    }

    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar una historia mía (la imagen se queda si también está en el muro)
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    const h = revisar(await db().from("historias").delete().eq("id", id).eq("persona", yo).select("path").maybeSingle()) as { path: string } | null;
    if (!h) return invalido("Solo puedes borrar tus historias");
    await borrarImagenHistoria(h.path);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
