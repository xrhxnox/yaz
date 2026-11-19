"use client";

// Pantalla vacía: un ícono, un mensaje y (si hay) el botón para empezar
export default function Vacio({ icono, texto, accion, alAccion }: { icono: string; texto: string; accion?: string; alAccion?: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-acento-suave text-acento-texto">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={icono} />
        </svg>
      </span>
      <p className="mt-3 max-w-xs font-serif text-lg text-suave italic">{texto}</p>
      {accion && alAccion && (
        <button onClick={alAccion} className="mt-4 rounded-full bg-acento px-5 py-2 text-sm font-medium text-sobre-acento transition active:scale-95">
          {accion}
        </button>
      )}
    </div>
  );
}

export const ICONOS_VACIO = {
  foto: "M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  musica: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  carta: "M3 5h18v14H3zM3 7l9 6 9-6",
  lugar: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};
