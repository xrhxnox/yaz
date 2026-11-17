"use client";

export const SECCIONES = ["inicio", "playlist", "fotos", "juegos", "buzon", "momentos"] as const;
export type Seccion = (typeof SECCIONES)[number];

const ICONOS: Record<Seccion, React.ReactNode> = {
  inicio: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  playlist: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  fotos: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  juegos: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </>
  ),
  buzon: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  momentos: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export const NOMBRES_SECCION: Record<Seccion, string> = {
  inicio: "Inicio",
  playlist: "Playlist",
  fotos: "Fotos",
  juegos: "Juegos",
  buzon: "Buzón",
  momentos: "Recuerdos",
};

export default function Navegacion({ actual }: { actual: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t lg:hidden border-borde bg-tarjeta/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {SECCIONES.map((s) => (
          <li key={s}>
            <a
              href={`#${s}`}
              aria-current={actual === s ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] min-[360px]:text-[11px] transition ${actual === s ? "text-texto" : "text-suave hover:text-texto"}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={actual === s ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {ICONOS[s]}
              </svg>
              {NOMBRES_SECCION[s]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
