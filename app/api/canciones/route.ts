import { db, error, invalido, autenticar, nombresActuales, notificar, revisar } from "@/lib/servidor";
import { otra } from "@/lib/config";

const CAMPOS = "id, persona, url, titulo, artista, portada, nota, corazon_a, corazon_b, destacada, created_at";

// Título, artista y portada desde el link (Spotify y YouTube tienen oEmbed público; Apple Music no)
async function leerCancion(url: string): Promise<{ titulo: string; artista: string | null; portada: string | null } | null> {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^(www|m)\./, "");
  } catch {
    return null;
  }
  let servicio: string | null = null;
  if (host.endsWith("spotify.com")) servicio = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  else if (host === "youtube.com" || host === "youtu.be" || host === "music.youtube.com")
    servicio = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.replace("music.youtube.com", "www.youtube.com"))}`;
  if (!servicio) return null;
  try {
    const r = await fetch(servicio, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const d = await r.json();
    const titulo = typeof d.title === "string" ? d.title.trim().slice(0, 200) : "";
    if (!titulo) return null;
    return {
      titulo,
      artista: typeof d.author_name === "string" && d.author_name.trim() ? d.author_name.trim().slice(0, 120) : null,
      portada: typeof d.thumbnail_url === "string" && /^https:\/\//.test(d.thumbnail_url) ? d.thumbnail_url : null,
    };
  } catch {
    return null;
  }
}

// La playlist completa: la canción fijada primero y luego de la más nueva a la más vieja
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const canciones =
      revisar(await db().from("canciones").select(CAMPOS).order("destacada", { ascending: false }).order("created_at", { ascending: false })) ?? [];
    return Response.json({ canciones });
  } catch (e) {
    return error(e);
  }
}

// Agregar una canción: { url, nota?, titulo? } (titulo solo se usa si no se pudo leer del link)
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { url, nota, titulo } = await req.json().catch(() => ({}));
  const link = typeof url === "string" ? url.trim() : "";
  if (!/^https?:\/\/\S+$/i.test(link)) return invalido("Pega el link de la canción (https://…)");

  const leida = await leerCancion(link);
  const nombre = typeof titulo === "string" ? titulo.trim() : "";
  if (!leida && !nombre) return invalido("No pude leer la canción de ese link. Escribe el nombre.");

  try {
    revisar(
      await db()
        .from("canciones")
        .insert({
          persona: yo,
          url: link.slice(0, 500),
          titulo: (leida?.titulo || nombre).slice(0, 200),
          artista: leida?.artista ?? null,
          portada: leida?.portada ?? null,
          nota: typeof nota === "string" && nota.trim() ? nota.trim().slice(0, 300) : null,
        }),
    );
    const nombres = await nombresActuales();
    await notificar(otra(yo), "Playlist", `${nombres[yo]} agregó “${leida?.titulo || nombre}”`, "/#momentos/playlist");
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// { id, corazon: true|false } → mi corazón; { id, destacada: true|false } → "nuestra canción" (solo una)
export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, corazon, destacada } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return invalido();

  try {
    if (typeof corazon === "boolean") {
      revisar(await db().from("canciones").update({ [`corazon_${yo}`]: corazon }).eq("id", id));
    }
    if (typeof destacada === "boolean") {
      if (destacada) revisar(await db().from("canciones").update({ destacada: false }).eq("destacada", true));
      revisar(await db().from("canciones").update({ destacada }).eq("id", id));
    }
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Quitar una canción que agregué yo
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    revisar(await db().from("canciones").delete().eq("id", id).eq("persona", yo));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
