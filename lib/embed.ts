// Convierte el link de una canción en su reproductor para poner dentro de la app.
// alto: pixeles del reproductor, o "video" para 16:9 (YouTube). null = no se puede incrustar.
export type Embed = { src: string; alto: number | "video"; servicio: string };

export function embedDe(url: string): Embed | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");

  // Spotify: open.spotify.com/(intl-es/)track/ID (también álbum, playlist, episodio)
  if (host === "open.spotify.com") {
    const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`, alto: m[1] === "track" || m[1] === "episode" ? 152 : 352, servicio: "Spotify" };
  }

  // YouTube y YouTube Music: watch?v=ID, youtu.be/ID, shorts/ID
  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? u.pathname.slice(1).split("/")[0] : (u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1]);
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    return { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`, alto: "video", servicio: host === "music.youtube.com" ? "YouTube Music" : "YouTube" };
  }

  // Apple Music: el mismo link en embed.music.apple.com (?i= es una canción; sin él, el álbum)
  if (host === "music.apple.com") {
    return { src: `https://embed.music.apple.com${u.pathname}${u.search}`, alto: u.searchParams.has("i") ? 175 : 450, servicio: "Apple Music" };
  }

  // SoundCloud
  if (host === "soundcloud.com") {
    return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=false`, alto: 166, servicio: "SoundCloud" };
  }

  return null;
}
