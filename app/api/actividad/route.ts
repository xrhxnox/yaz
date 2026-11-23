import { db, error, autenticar } from "@/lib/servidor";
import { JUEGOS, type TipoJuego } from "@/lib/juegos";
import { hoyCompartido, mesDe, otra, periodoMes, type Persona } from "@/lib/config";

export type Actividad = { id: string; texto: string; detalle: string | null; fecha: string; url: string };

// Si una tabla aún no existe, esa parte sale vacía
async function opcional<T>(consulta: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const r = await consulta;
    return r.error ? [] : ((r.data ?? []) as T[]);
  } catch {
    return [];
  }
}

const recorta = (t: string | null | undefined, n = 80) => (t && t.length > n ? t.slice(0, n - 1) + "…" : (t ?? null));

// Lo que hizo la otra persona en las últimas 3 semanas, de lo más nuevo a lo más viejo
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;
  const tu = otra(yo);

  const desde = new Date(Date.now() - 21 * 864e5).toISOString();
  const desdeFecha = desde.slice(0, 10);
  const hoy = hoyCompartido();

  try {
    const [likes, comentarios, respuestasHistoria, historias, publicaciones, canciones, cartas, diario, mensajes, preguntas, turnos, numeros] = await Promise.all([
      opcional<{ created_at: string; publicacion_id: number; publicaciones: { persona: Persona; texto: string | null } }>(
        db()
          .from("publicacion_likes")
          .select("created_at, publicacion_id, publicaciones!inner(persona, texto)")
          .eq("persona", tu)
          .eq("publicaciones.persona", yo)
          .gte("created_at", desde),
      ),
      opcional<{ id: number; texto: string; created_at: string }>(
        db().from("comentarios").select("id, texto, created_at").eq("persona", tu).gte("created_at", desde),
      ),
      opcional<{ id: number; texto: string | null; corazon: boolean; created_at: string }>(
        db()
          .from("historia_respuestas")
          .select("id, texto, corazon, created_at, historias!inner(persona)")
          .eq("persona", tu)
          .eq("historias.persona", yo)
          .gte("created_at", desde),
      ),
      opcional<{ created_at: string }>(
        db()
          .from("historias")
          .select("created_at")
          .eq("persona", tu)
          .gte("created_at", new Date(Date.now() - 864e5).toISOString())
          .order("created_at", { ascending: false }),
      ),
      opcional<{ id: number; texto: string | null; created_at: string }>(
        db().from("publicaciones").select("id, texto, created_at").eq("persona", tu).gte("created_at", desde),
      ),
      opcional<{ id: number; titulo: string; created_at: string }>(db().from("canciones").select("id, titulo, created_at").eq("persona", tu).gte("created_at", desde)),
      opcional<{ id: number; titulo: string; created_at: string }>(db().from("cartas").select("id, titulo, created_at").eq("para", yo).gte("created_at", desde)),
      opcional<{ fecha: string; created_at: string }>(
        db().from("diario").select("fecha, created_at").eq("persona", tu).gte("fecha", desdeFecha).order("created_at", { ascending: false }),
      ),
      opcional<{ id: number; mensaje: string; created_at: string }>(
        db().from("pensamientos").select("id, mensaje, created_at").eq("de", tu).gte("created_at", desde).order("created_at", { ascending: false }).limit(5),
      ),
      opcional<{ fecha: string; created_at: string }>(db().from("respuestas").select("fecha, created_at").eq("persona", tu).eq("fecha", hoy)),
      opcional<{ id: number; tipo: TipoJuego; updated_at: string }>(db().from("partidas").select("id, tipo, updated_at").eq("turno", yo).is("ganador", null)),
      opcional<{ fecha: string; created_at: string }>(db().from("pregunta_numeros").select("fecha, created_at").eq("persona", tu).eq("fecha", hoy)),
    ]);

    const items: Actividad[] = [
      ...likes.map((l) => ({
        id: `like-${l.publicacion_id}`,
        texto: "le dio me gusta a tu publicación",
        detalle: recorta(l.publicaciones.texto),
        fecha: l.created_at,
        url: "muro",
      })),
      ...comentarios.map((c) => ({ id: `comentario-${c.id}`, texto: "comentó en el muro", detalle: recorta(c.texto), fecha: c.created_at, url: "muro" })),
      ...respuestasHistoria.map((r) => ({
        id: `historia-respuesta-${r.id}`,
        texto: r.texto ? "respondió a tu historia" : "le encantó tu historia",
        detalle: recorta(r.texto),
        fecha: r.created_at,
        url: "inicio",
      })),
      // Las historias de hoy, juntas en un solo aviso
      ...(historias.length
        ? [
            {
              id: `historias-${historias[0].created_at}`,
              texto: historias.length === 1 ? "subió una historia" : `subió ${historias.length} historias`,
              detalle: null,
              fecha: historias[0].created_at,
              url: "inicio",
            },
          ]
        : []),
      ...publicaciones.map((p) => ({ id: `publicacion-${p.id}`, texto: "publicó en el muro", detalle: recorta(p.texto), fecha: p.created_at, url: "muro" })),
      ...canciones.map((c) => ({ id: `cancion-${c.id}`, texto: "agregó una canción", detalle: recorta(c.titulo), fecha: c.created_at, url: "nosotros/playlist" })),
      ...cartas.map((c) => ({ id: `carta-${c.id}`, texto: "te escribió una carta", detalle: recorta(c.titulo), fecha: c.created_at, url: "nosotros/buzon" })),
      // El diario, un aviso por día
      ...[...new Map(diario.map((d) => [d.fecha, d])).values()].map((d) => {
        const cuantas = diario.filter((x) => x.fecha === d.fecha).length;
        return {
          id: `diario-${d.fecha}`,
          texto: cuantas === 1 ? "anotó algo en el diario" : `anotó ${cuantas} cosas en el diario`,
          detalle: null,
          fecha: d.created_at,
          url: "nosotros/diario",
        };
      }),
      ...mensajes.map((m) => ({ id: `mensaje-${m.id}`, texto: "te mandó un mensaje", detalle: recorta(m.mensaje), fecha: m.created_at, url: "inicio" })),
      ...preguntas.map((p) => ({ id: `pregunta-${p.fecha}`, texto: "respondió la pregunta del día", detalle: null, fecha: p.created_at, url: "juegos/pregunta" })),
      ...numeros.map((n) => ({ id: `numero-${n.fecha}`, texto: "eligió su número de la pregunta", detalle: null, fecha: n.created_at, url: "juegos/pregunta" })),
      ...turnos.map((t) => ({
        id: `turno-${t.id}-${t.updated_at}`,
        texto: `ya jugó: te toca en ${JUEGOS[t.tipo].nombre.toLowerCase()}`,
        detalle: null,
        fecha: t.updated_at,
        url: `juegos/${t.tipo}`,
      })),
    ];

    // El resumen del mes que acaba de terminar (la primera semana)
    const actual = mesDe(hoy);
    if (actual > 1) {
      const { fin } = periodoMes(actual - 1);
      const listo = new Date(Date.parse(fin + "T12:00:00Z") + 864e5).toISOString();
      if (Date.now() - Date.parse(listo) < 7 * 864e5) {
        items.push({ id: `resumen-${actual - 1}`, texto: `Ya está el resumen del mes ${actual - 1}`, detalle: null, fecha: listo, url: "nosotros/resumenes" });
      }
    }

    items.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
    return Response.json({ items: items.slice(0, 60), tu });
  } catch (e) {
    return error(e);
  }
}
