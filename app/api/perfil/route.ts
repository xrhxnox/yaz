import { db, error, invalido, autenticar, revisar } from "@/lib/servidor";
import { TALLAS, type Persona, type Tallas } from "@/lib/config";
import { esHex } from "@/lib/colores";

type Fila = { persona: Persona; tallas: Tallas; tema: { fondo: string; acento: string } | null };
type Deseo = { id: number; persona: Persona; titulo: string; url: string; nota: string | null; comprado: boolean };

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;


  try {
    const [filas, deseos]: [Fila[], Deseo[]] = await Promise.all([
      db().from("perfiles").select("persona, tallas, tema").then(revisar),
      db().from("deseos").select("id, persona, titulo, url, nota, comprado").order("created_at", { ascending: false }).then(revisar),
    ]).then(([f, d]) => [f ?? [], d ?? []]);

    const perfiles: Record<Persona, Omit<Fila, "persona">> = { a: { tallas: {}, tema: null }, b: { tallas: {}, tema: null } };
    for (const { persona, ...p } of filas) perfiles[persona] = p;

    return Response.json({
      perfiles,
      // Lo que el otro ya te compró es sorpresa: no se te muestra
      deseos: deseos.map((d) => (d.persona === yo ? { ...d, comprado: false } : d)),
    });
  } catch (e) {
    return error(e);
  }
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { tallas, tema } = await req.json().catch(() => ({}));
  const persona = yo;

  const cambios: Record<string, unknown> = { persona, updated_at: new Date().toISOString() };

  if (tallas !== undefined) {
    if (typeof tallas !== "object" || tallas === null) return invalido();
    const limpias: Tallas = {};
    for (const { id } of TALLAS) {
      const v = tallas[id];
      if (typeof v === "string" && v.trim()) limpias[id] = v.trim().slice(0, id === "notas" ? 500 : 40);
    }
    cambios.tallas = limpias;
  }

  if (tema !== undefined) {
    if (tema !== null && (!esHex(tema?.fondo) || !esHex(tema?.acento))) return invalido("Colores inválidos");
    cambios.tema = tema && { fondo: tema.fondo.toLowerCase(), acento: tema.acento.toLowerCase() };
  }

  try {
    revisar(await db().from("perfiles").upsert(cambios));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
