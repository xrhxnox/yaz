"use client";

// Hoy (lo del día), Muro (las fotos), Juegos y Nosotros (todo lo guardado). El "+" al centro crea cualquier cosa
export const SECCIONES = ["inicio", "muro", "juegos", "nosotros"] as const;
export type Seccion = (typeof SECCIONES)[number];

const ICONOS: Record<Seccion, React.ReactNode> = {
  inicio: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  muro: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </>
  ),
  juegos: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </>
  ),
  nosotros: <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" />,
};

export const NOMBRES_SECCION: Record<Seccion, string> = {
  inicio: "Hoy",
  muro: "Muro",
  juegos: "Juegos",
  nosotros: "Nosotros",
};

function Item({ s, actual }: { s: Seccion; actual: string }) {
  const activa = actual === s;
  return (
    <li>
      <a
        href={`#${s}`}
        aria-current={activa ? "page" : undefined}
        className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition ${activa ? "text-barra-texto" : "text-barra-suave hover:text-barra-texto"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activa ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {ICONOS[s]}
        </svg>
        {NOMBRES_SECCION[s]}
      </a>
    </li>
  );
}

export default function Navegacion({ actual, alCrear }: { actual: string; alCrear: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t lg:hidden border-barra-borde bg-barra/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-5 items-center">
        <Item s="inicio" actual={actual} />
        <Item s="muro" actual={actual} />
        <li className="flex justify-center">
          <button
            onClick={alCrear}
            aria-label="Crear"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-md transition active:scale-95"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </li>
        <Item s="juegos" actual={actual} />
        <Item s="nosotros" actual={actual} />
      </ul>
    </nav>
  );
}
