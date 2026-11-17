"use client";

import { hoyCompartido, mesDe, periodoMes } from "@/lib/config";

// Los primeros 3 días de cada "mes" de la relación avisa que ya está el resumen del mes que terminó
export default function AvisoResumen() {
  const hoy = hoyCompartido();
  const actual = mesDe(hoy);
  if (actual < 2) return null;
  const dias = Math.round((Date.parse(hoy) - Date.parse(periodoMes(actual).inicio)) / 864e5);
  if (dias > 2) return null;
  return (
    <a href="#momentos/resumenes" className="block border-l-2 border-acento-texto pl-3 font-serif text-xl italic text-acento-texto hover:underline">
      Ya salió el número especial del mes {actual - 1}
    </a>
  );
}
