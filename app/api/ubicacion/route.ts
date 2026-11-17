import { db, error, invalido, autenticar, revisar } from "@/lib/servidor";

function zonaValida(zona: unknown): zona is string {
  if (typeof zona !== "string") return false;
  try {
    new Intl.DateTimeFormat("es", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { ciudad, lat, lon, zona } = await req.json().catch(() => ({}));
  if (
    typeof ciudad !== "string" ||
    !ciudad.trim() ||
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180 ||
    !zonaValida(zona)
  ) {
    return invalido();
  }

  try {
    revisar(
      await db()
        .from("ubicaciones")
        .upsert({ persona: yo, ciudad: ciudad.trim().slice(0, 120), lat, lon, zona, updated_at: new Date().toISOString() }),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
