import { db, error, autenticar, notificar, revisar } from "@/lib/servidor";
import { MAX_MENSAJE, NOMBRES, otra } from "@/lib/config";

export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { mensaje } = await req.json().catch(() => ({}));
  const de = yo;
  const texto = typeof mensaje === "string" && mensaje.trim() ? mensaje.trim().slice(0, MAX_MENSAJE) : "Pensé en ti";

  try {
    revisar(await db().from("pensamientos").insert({ de, mensaje: texto }));
    const enviadas = await notificar(otra(de), NOMBRES[de], texto);
    return Response.json({ ok: true, enviadas });
  } catch (e) {
    return error(e);
  }
}
