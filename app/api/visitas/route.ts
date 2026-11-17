import { db, error, invalido, autenticar, revisar } from "@/lib/servidor";
import { esFecha } from "@/lib/config";

type Datos = { inicio: string; fin: string; ciudad: string | null; nota: string | null };

function leer(cuerpo: Record<string, unknown>): Datos | null {
  const { inicio, fin, ciudad, nota } = cuerpo;
  if (!esFecha(inicio) || !esFecha(fin) || fin < inicio) return null;
  return {
    inicio,
    fin,
    ciudad: typeof ciudad === "string" && ciudad.trim() ? ciudad.trim().slice(0, 80) : null,
    nota: typeof nota === "string" && nota.trim() ? nota.trim().slice(0, 500) : null,
  };
}

export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;
  try {
    const visitas = revisar(
      await db().from("visitas").select("id, inicio, fin, ciudad, nota, creado_por").order("inicio", { ascending: false }),
    );
    return Response.json({ visitas: visitas ?? [] });
  } catch (e) {
    return error(e);
  }
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;
  const datos = leer(await req.json().catch(() => ({})));
  if (!datos) return invalido("Revisa las fechas");
  try {
    revisar(await db().from("visitas").insert({ ...datos, creado_por: yo }));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;
  const cuerpo = await req.json().catch(() => ({}));
  const datos = leer(cuerpo);
  if (!Number.isInteger(cuerpo.id) || !datos) return invalido("Revisa las fechas");
  try {
    revisar(await db().from("visitas").update(datos).eq("id", cuerpo.id));
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
    revisar(await db().from("visitas").delete().eq("id", id));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
