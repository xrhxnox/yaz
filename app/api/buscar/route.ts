import { db, error, invalido, autenticar } from "@/lib/servidor";
import { hoyCompartido, otra, type Persona } from "@/lib/config";

type Resultado = { tipo: string; texto: string; detalle: string | null; fecha: string | null; seccion: string };

// Busca en mensajes, respuestas, momentos, pendientes, wishlist, visitas, cartas, diario y playlist
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  // Quitamos comas y paréntesis: rompen los filtros combinados (or) de Supabase
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[,()]/g, " ").trim();
  if (q.length < 2) return invalido("Escribe al menos 2 letras");
  // Para ilike: escapamos los comodines que pudiera traer la búsqueda
  const patron = `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
  const hoy = hoyCompartido();

  // Cada búsqueda es independiente: si una tabla aún no existe, solo se omite
  const buscar = async <T,>(consulta: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    try {
      const r = await consulta;
      return r.error ? [] : (r.data ?? []);
    } catch {
      return [];
    }
  };

  try {
    const [mensajes, respuestas, momentos, pendientes, deseos, visitas, cartas, diario, canciones] = await Promise.all([
      buscar<{ mensaje: string; de: Persona; created_at: string }>(
        db().from("pensamientos").select("mensaje, de, created_at").ilike("mensaje", patron).order("created_at", { ascending: false }).limit(20),
      ),
      buscar<{ respuesta: string; persona: Persona; fecha: string }>(
        db().from("respuestas").select("respuesta, persona, fecha").ilike("respuesta", patron).order("fecha", { ascending: false }).limit(20),
      ),
      buscar<{ titulo: string; descripcion: string | null; fecha: string }>(
        db().from("momentos").select("titulo, descripcion, fecha").or(`titulo.ilike.${patron},descripcion.ilike.${patron}`).limit(20),
      ),
      buscar<{ texto: string; hecho: boolean; created_at: string }>(
        db().from("pendientes").select("texto, hecho, created_at").ilike("texto", patron).limit(20),
      ),
      buscar<{ titulo: string; nota: string | null; persona: Persona }>(
        db().from("deseos").select("titulo, nota, persona").or(`titulo.ilike.${patron},nota.ilike.${patron}`).limit(20),
      ),
      buscar<{ ciudad: string | null; nota: string | null; inicio: string }>(
        db().from("visitas").select("ciudad, nota, inicio").or(`ciudad.ilike.${patron},nota.ilike.${patron}`).limit(20),
      ),
      buscar<{ titulo: string; contenido: string; de: Persona; para: Persona; abierta_at: string | null; created_at: string }>(
        db().from("cartas").select("titulo, contenido, de, para, abierta_at, created_at").or(`titulo.ilike.${patron},contenido.ilike.${patron}`).limit(20),
      ),
      buscar<{ texto: string; tipo: string; persona: Persona; fecha: string }>(
        db().from("diario").select("texto, tipo, persona, fecha").ilike("texto", patron).order("fecha", { ascending: false }).limit(20),
      ),
      buscar<{ titulo: string; artista: string | null; nota: string | null; persona: Persona; created_at: string }>(
        db()
          .from("canciones")
          .select("titulo, artista, nota, persona, created_at")
          .or(`titulo.ilike.${patron},artista.ilike.${patron},nota.ilike.${patron}`)
          .limit(20),
      ),
    ]);

    const resultados: Resultado[] = [
      ...mensajes.map((m) => ({ tipo: "Mensaje", texto: m.mensaje, detalle: m.de, fecha: m.created_at.slice(0, 10), seccion: "inicio" })),
      // La respuesta de hoy del otro sigue siendo secreta hasta que contestes
      ...respuestas
        .filter((r) => !(r.fecha === hoy && r.persona === otra(yo)))
        .map((r) => ({ tipo: "Pregunta del día", texto: r.respuesta, detalle: r.persona, fecha: r.fecha, seccion: "juegos/pregunta" })),
      ...momentos.map((m) => ({ tipo: "Momento", texto: m.titulo, detalle: m.descripcion, fecha: m.fecha, seccion: "momentos" })),
      ...pendientes.map((p) => ({
        tipo: p.hecho ? "Ya lo hicimos" : "Pendiente",
        texto: p.texto,
        detalle: null,
        fecha: p.created_at.slice(0, 10),
        seccion: "momentos/pendientes",
      })),
      ...deseos.map((d) => ({ tipo: "Wishlist", texto: d.titulo, detalle: d.nota, fecha: null, seccion: "perfil" })),
      ...visitas.map((v) => ({ tipo: "Visita", texto: v.ciudad ?? "Visita", detalle: v.nota, fecha: v.inicio, seccion: "momentos/visitas" })),
      // Cartas: solo las que escribiste o las que ya abriste
      ...cartas
        .filter((c) => c.de === yo || c.abierta_at)
        .map((c) => ({ tipo: "Carta", texto: c.titulo, detalle: null, fecha: c.created_at.slice(0, 10), seccion: "buzon" })),
      ...diario.map((d) => ({ tipo: "Diario", texto: d.texto, detalle: d.persona, fecha: d.fecha, seccion: "fotos/diario" })),
      ...canciones.map((c) => ({
        tipo: "Canción",
        texto: c.titulo,
        detalle: [c.artista, c.nota].filter(Boolean).join(" · ") || null,
        fecha: c.created_at.slice(0, 10),
        seccion: "playlist",
      })),
    ];

    return Response.json({ resultados });
  } catch (e) {
    return error(e);
  }
}
