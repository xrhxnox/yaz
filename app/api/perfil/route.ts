import { borrarImagenes, db, error, invalido, autenticar, revisar, subirImagen } from "@/lib/servidor";
import { TALLAS, type Persona, type Tallas } from "@/lib/config";
import { esHex } from "@/lib/colores";

type Fila = { persona: Persona; tallas: Tallas; tema: { fondo: string; acento: string } | null };
// Cumpleaños: "MM-DD" (se acepta el 29 de febrero)
function esCumple(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{2}-\d{2}$/.test(v)) return false;
  const [m, d] = v.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(2024, m, 0).getDate();
}

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

  const { tallas, tema, apodo, cumple, quitarFoto } = await req.json().catch(() => ({}));
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

  if (apodo !== undefined) {
    if (apodo !== null && typeof apodo !== "string") return invalido();
    cambios.apodo = apodo?.trim() ? apodo.trim().slice(0, 30) : null;
  }

  if (cumple !== undefined) {
    if (cumple !== null && !esCumple(cumple)) return invalido("Fecha de cumpleaños inválida");
    cambios.cumple = cumple;
  }

  try {
    let fotoVieja: string | null = null;
    if (quitarFoto === true) {
      fotoVieja = revisar(await db().from("perfiles").select("avatar_path").eq("persona", persona).maybeSingle())?.avatar_path ?? null;
      cambios.avatar_path = null;
    }
    revisar(await db().from("perfiles").upsert(cambios));
    if (fotoVieja) await borrarImagenes([fotoVieja]);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Subir o cambiar la foto de perfil
export async function PUT(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const form = await req.formData().catch(() => null);
  if (!form) return invalido();

  try {
    const anterior = revisar(await db().from("perfiles").select("avatar_path").eq("persona", yo).maybeSingle())?.avatar_path ?? null;
    const path = await subirImagen(form.get("foto"), "perfil");
    revisar(await db().from("perfiles").upsert({ persona: yo, avatar_path: path, updated_at: new Date().toISOString() }));
    if (anterior) await borrarImagenes([anterior]);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
