"use client";

import { useEffect, useRef, useState } from "react";
import { pedir, type Intencion } from "@/lib/intencion";
import { componerHistorias } from "./ComponerHistoria";
import { irA } from "@/lib/navegar";

type Opcion = { id: Intencion | "historia"; nombre: string; texto: string; destino: string; icono: string };

// Todo lo que se puede crear, y a dónde lleva cada cosa
const OPCIONES: Opcion[] = [
  { id: "publicar", nombre: "Foto al muro", texto: "Una o varias fotos", destino: "muro", icono: "M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" },
  { id: "historia", nombre: "Historia", texto: "Dura 24 horas", destino: "inicio", icono: "M12 3a9 9 0 1 0 9 9M12 8v8M8 12h8M17 3.5l.5 1.5M20.5 7l-1.5.5" },
  { id: "diario", nombre: "Anotar en el diario", texto: "Qué hiciste, comiste, viste…", destino: "nosotros/diario", icono: "M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h4" },
  { id: "cancion", nombre: "Canción", texto: "A la playlist", destino: "nosotros/playlist", icono: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  { id: "carta", nombre: "Carta", texto: "Para abrir cuando quieras", destino: "nosotros/buzon", icono: "M3 5h18v14H3zM3 7l9 6 9-6" },
  { id: "momento", nombre: "Momento", texto: "A nuestra historia", destino: "nosotros/historia", icono: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" },
  { id: "pendiente", nombre: "Pendiente", texto: "Algo que queremos hacer", destino: "nosotros/pendientes", icono: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" },
];

// Hoja que sale desde abajo con todo lo que se puede crear
export default function Crear({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const selector = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto, alCerrar]);

  function elegir(o: Opcion) {
    setError("");
    // La historia se sube aquí mismo: primero se eligen las fotos
    if (o.id === "historia") return selector.current?.click();
    pedir(o.id);
    irA(o.destino);
    alCerrar();
  }

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!archivos.length) return;
    // Se abre la vista previa para escribir sobre cada foto; al compartir aparece en Hoy
    irA("inicio");
    componerHistorias(archivos);
    alCerrar();
  }

  return (
    <>
      <input ref={selector} type="file" accept="image/*" multiple onChange={subir} className="hidden" />
      {abierto && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 lg:items-center" onClick={alCerrar} role="presentation">
          <div
            role="dialog"
            aria-label="Crear"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-borde bg-tarjeta px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:rounded-3xl lg:pb-4"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-borde lg:hidden" />
            <div className="mb-2 flex items-baseline justify-between px-1">
              <p className="font-serif text-2xl">Crear</p>
              <button onClick={alCerrar} className="text-sm text-suave hover:text-texto">
                Cerrar
              </button>
            </div>
            <ul className="grid grid-cols-1 gap-1">
              {OPCIONES.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => elegir(o)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-relleno disabled:opacity-60"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acento-suave text-acento-texto">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d={o.icono} />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium leading-tight">{o.nombre}</span>
                      <span className="block text-xs text-suave">{o.texto}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {error && <p className="mt-2 px-1 text-sm text-acento-texto">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
