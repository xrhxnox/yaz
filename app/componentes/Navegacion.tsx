"use client";

// Hoy (lo del día), Muro (las fotos), Juegos y Nosotros (todo lo guardado). El "+" al centro crea cualquier cosa
export const SECCIONES = ["inicio", "muro", "juegos", "nosotros"] as const;
export type Seccion = (typeof SECCIONES)[number];

// Cada ícono con su versión de contorno y la rellena (la de la pestaña en la que estás)
const ICONOS: Record<Seccion, (activo: boolean) => React.ReactNode> = {
  inicio: (activo) =>
    activo ? (
      <>
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor" />
        <path d="M9.5 21v-5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V21" className="fill-barra stroke-barra" strokeWidth={0.5} />
      </>
    ) : (
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    ),
  muro: (activo) => (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill={activo ? "currentColor" : "none"} />
      <circle cx="12" cy="12" r="4" className={activo ? "fill-barra stroke-barra" : undefined} />
      <circle cx="17.3" cy="6.7" r="0.9" stroke="none" className={activo ? "fill-barra" : "fill-current"} />
    </>
  ),
  juegos: (activo) => (
    <>
      {[4, 10, 16].flatMap((y) =>
        [4, 10, 16].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4.5" height="4.5" rx="1.2" fill={activo ? "currentColor" : "none"} />),
      )}
    </>
  ),
  nosotros: (activo) => (
    <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" fill={activo ? "currentColor" : "none"} />
  ),
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
        onClick={(e) => {
          if (!activa) return;
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        aria-current={activa ? "page" : undefined}
        className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition active:scale-90 ${activa ? "font-medium text-barra-texto" : "text-barra-suave hover:text-barra-texto"}`}
      >
        <svg
          key={activa ? "si" : "no"}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={activa ? 2 : 1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={activa ? "icono-activo" : undefined}
          aria-hidden
        >
          {ICONOS[s](activa)}
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
            className="flex h-11 w-11 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-md transition active:scale-90"
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
