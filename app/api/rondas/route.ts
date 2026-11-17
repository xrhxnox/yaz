import { db, error, invalido, autenticar, nombresActuales, notificar, revisar } from "@/lib/servidor";
import { otra, type Persona } from "@/lib/config";

type Ronda = { id: number; titulo: string; creado_por: Persona; created_at: string };
type Opcion = { id: number; ronda_id: number; texto: string };
type Voto = { opcion_id: number; persona: Persona; si: boolean };

const MAX_OPCIONES = 40;

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const [rondas, opciones, votos]: [Ronda[], Opcion[], Voto[]] = await Promise.all([
      db().from("rondas").select("id, titulo, creado_por, created_at").order("created_at", { ascending: false }).limit(30).then(revisar),
      db().from("opciones").select("id, ronda_id, texto").order("id", { ascending: true }).then(revisar),
      db().from("votos").select("opcion_id, persona, si").then(revisar),
    ]).then(([r, o, v]) => [r ?? [], o ?? [], v ?? []]);

    const voto = (opcion: number, p: Persona) => votos.find((v) => v.opcion_id === opcion && v.persona === p);

    return Response.json({
      rondas: rondas.map((r) => {
        const ops = opciones.filter((o) => o.ronda_id === r.id);
        return {
          ...r,
          // Mi voto en cada opción; del otro solo sé si ya votó (no qué votó)
          opciones: ops.map((o) => ({ id: o.id, texto: o.texto, mio: voto(o.id, yo)?.si ?? null })),
          votadasPorMi: ops.filter((o) => voto(o.id, yo)).length,
          votadasPorOtro: ops.filter((o) => voto(o.id, otra(yo))).length,
          // Coincidencias: las que los dos dijeron que sí
          coincidencias: ops.filter((o) => voto(o.id, "a")?.si && voto(o.id, "b")?.si).map((o) => o.texto),
        };
      }),
    });
  } catch (e) {
    return error(e);
  }
}

// Crear una ronda con varias opciones
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { titulo, opciones } = await req.json().catch(() => ({}));
  const limpias: string[] = Array.isArray(opciones)
    ? [...new Set(opciones.filter((o: unknown) => typeof o === "string" && o.trim()).map((o: string) => o.trim().slice(0, 120)))]
    : [];
  if (typeof titulo !== "string" || !titulo.trim() || limpias.length < 2) return invalido("Escribe un título y al menos 2 opciones");

  try {
    const ronda = revisar(
      await db()
        .from("rondas")
        .insert({ titulo: titulo.trim().slice(0, 80), creado_por: yo })
        .select("id")
        .single(),
    );
    if (!ronda) throw new Error("No se pudo crear la ronda");
    revisar(await db().from("opciones").insert(limpias.slice(0, MAX_OPCIONES).map((texto) => ({ ronda_id: ronda.id, texto }))));
    await notificar(otra(yo), "Esto o aquello", `${(await nombresActuales())[yo]} quiere decidir: ${titulo.trim()}`, "/#lista/decidir");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Votar sí / no en una opción
export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { opcion, si } = await req.json().catch(() => ({}));
  if (!Number.isInteger(opcion) || typeof si !== "boolean") return invalido();

  try {
    revisar(await db().from("votos").upsert({ opcion_id: opcion, persona: yo, si }, { onConflict: "opcion_id,persona" }));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Borrar una ronda (borra también sus opciones y votos)
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    revisar(await db().from("rondas").delete().eq("id", id));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
