"use client";

import type { Rect } from "./CajaImagen";
import { posicionEn } from "./CajaImagen";
import { textoSobreColor } from "./Historias";

// Estilos del texto sobre la historia
export type EstiloTexto = "rect" | "libre";
export const ESTILOS: { id: EstiloTexto; nombre: string }[] = [
  { id: "rect", nombre: "Rectángulo" },
  { id: "libre", nombre: "Sin fondo" },
];

// Tamaño de la letra como fracción del ancho de la foto (así se ve igual en cualquier pantalla)
export const TAM_MIN = 0.045;
export const TAM_MAX = 0.16;
export const TAM_DEF = 0.065;
export const limitarTam = (t: number) =>
  Math.min(TAM_MAX, Math.max(TAM_MIN, t));

type Props = {
  texto: string;
  estilo?: EstiloTexto | null;
  tam?: number | null;
  color: string;
  rect: Rect;
  x: number;
  y: number;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLParagraphElement>, "color">;

// El texto tal cual se ve en la historia (al escribirla y al verla)
export default function TextoHistoria({
  texto,
  estilo,
  tam,
  color,
  rect,
  x,
  y,
  className = "",
  style,
  ...resto
}: Props) {
  const fuente = rect.width ? limitarTam(tam ?? TAM_DEF) * rect.width : 18;
  const libre = estilo === "libre";
  return (
    <p
      {...resto}
      className={`absolute max-w-[88%] -translate-x-1/2 -translate-y-1/2 text-center font-semibold break-words ${className}`}
      style={{
        ...posicionEn(rect, x, y),
        fontSize: fuente,
        lineHeight: libre ? 1.2 : 1.5,
        ...style,
      }}
    >
      <span
        style={
          libre
            ? {
                color: "#fff",
                textShadow:
                  "0 1px 3px rgba(0,0,0,0.65), 0 0 1px rgba(0,0,0,0.5)",
              }
            : {
                background: color,
                color: textoSobreColor(color),
                padding: "0.12em 0.35em",
                borderRadius: 4,
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
              }
        }
      >
        {texto}
      </span>
    </p>
  );
}
