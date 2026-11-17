"use client";

import { useRef, useState } from "react";

type Hsv = { h: number; s: number; v: number };

// ---------- Conversiones ----------
function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexAHsv(hex: string): Hsv {
  const [r, g, b] = hexARgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function hsvAHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

const esHex = (x: string) => /^#[0-9a-f]{6}$/i.test(x);

// Arrastrar con dedo o mouse: llama alMover con la posición dentro del elemento
function useArrastre(alMover: (x: number, y: number, caja: DOMRect) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const mover = (e: React.PointerEvent) => {
    const caja = ref.current?.getBoundingClientRect();
    if (caja) alMover(e.clientX - caja.left, e.clientY - caja.top, caja);
  };
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      mover(e);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) mover(e);
    },
  };
}

// Rueda de colores: el ángulo es el tono, la distancia al centro qué tan intenso; abajo, el brillo
export default function RuedaColor({ valor, alCambiar, nombre }: { valor: string; alCambiar: (hex: string) => void; nombre: string }) {
  const [hsv, setHsv] = useState<Hsv>(() => hexAHsv(valor));
  const [texto, setTexto] = useState(valor);
  // Si el color cambia desde fuera (sugerencias, deshacer…), la rueda se acomoda
  const [previo, setPrevio] = useState(valor.toLowerCase());
  if (valor.toLowerCase() !== previo) {
    setPrevio(valor.toLowerCase());
    if (hsvAHex(hsv) !== valor.toLowerCase()) setHsv(hexAHsv(valor));
    setTexto(valor.toLowerCase());
  }

  function elegir(nuevo: Hsv) {
    setHsv(nuevo);
    const hex = hsvAHex(nuevo);
    setTexto(hex);
    setPrevio(hex);
    alCambiar(hex);
  }

  const rueda = useArrastre((x, y, caja) => {
    const radio = caja.width / 2;
    const dx = x - radio;
    const dy = y - radio;
    let h = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (h < 0) h += 360;
    // Si estaba en negro, al tocar la rueda se sube el brillo para que se vea el color
    elegir({ h, s: Math.min(1, Math.hypot(dx, dy) / radio), v: hsv.v < 0.05 ? 1 : hsv.v });
  });
  const barra = useArrastre((x, _y, caja) => elegir({ ...hsv, v: Math.max(0, Math.min(1, x / caja.width)) }));

  const pleno = hsvAHex({ ...hsv, v: 1 });
  const hex = hsvAHex(hsv);
  const angulo = (hsv.h * Math.PI) / 180;

  return (
    <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        {...rueda}
        role="application"
        aria-label={`Rueda de color para ${nombre}`}
        className="relative aspect-square w-52 shrink-0 cursor-crosshair touch-none rounded-full select-none"
        style={{ background: "radial-gradient(closest-side, #fff, rgba(255,255,255,0)), conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
      >
        {/* Oscurece la rueda según el brillo */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-black" style={{ opacity: 1 - hsv.v }} />
        <span
          className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${50 + 50 * hsv.s * Math.sin(angulo)}%`, top: `${50 - 50 * hsv.s * Math.cos(angulo)}%`, background: hex }}
        />
      </div>

      <div className="w-full min-w-0 space-y-3 sm:pt-2">
        <div>
          <p className="mb-1.5 text-xs text-suave">Brillo</p>
          <div
            {...barra}
            role="slider"
            aria-label={`Brillo de ${nombre}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.v * 100)}
            tabIndex={0}
            onKeyDown={(e) => {
              const paso = e.key === "ArrowRight" ? 0.05 : e.key === "ArrowLeft" ? -0.05 : 0;
              if (paso) elegir({ ...hsv, v: Math.max(0, Math.min(1, hsv.v + paso)) });
            }}
            className="relative h-7 w-full cursor-pointer touch-none rounded-full border border-borde select-none"
            style={{ background: `linear-gradient(to right, #000, ${pleno})` }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
              style={{ left: `${hsv.v * 100}%`, background: hex }}
            />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="h-9 w-9 shrink-0 rounded-full border border-borde" style={{ background: hex }} />
          <input
            value={texto}
            onChange={(e) => {
              const t = e.target.value.trim();
              setTexto(t);
              const conGato = t.startsWith("#") ? t : `#${t}`;
              if (esHex(conGato)) {
                const limpio = conGato.toLowerCase();
                setHsv(hexAHsv(limpio));
                setPrevio(limpio);
                alCambiar(limpio);
              }
            }}
            maxLength={7}
            spellCheck={false}
            aria-label={`Código de color de ${nombre}`}
            className="sin-mayuscula w-28 rounded-lg border border-borde bg-tarjeta px-3 py-2 font-mono text-sm outline-none focus:border-suave"
          />
        </label>
      </div>
    </div>
  );
}
