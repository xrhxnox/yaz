// A partir de dos colores (fondo y acento) calcula todos los colores de la interfaz.
// barra (opcional): color de la barra de navegación del celular

export type Tema = { fondo: string; acento: string; barra?: string };

export function esHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
}

function aRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex([r, g, b]: number[]): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("");
}

// t = 0 devuelve a, t = 1 devuelve b
export function mezclar(a: string, b: string, t: number): string {
  const x = aRgb(a);
  const y = aRgb(b);
  return aHex(x.map((c, i) => c + (y[i] - c) * t));
}

function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Acerca `color` a `hacia` poco a poco hasta que se lea bien sobre `fondo`
function legible(color: string, fondo: string, hacia: string, minimo: number): string {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mezclar(color, hacia, t);
    if (contraste(c, fondo) >= minimo) return c;
  }
  return hacia;
}

// Texto que se lee bien sobre un color (claro sobre oscuro, oscuro sobre claro)
function textoSobre(color: string) {
  return luminancia(color) < 0.18 ? mezclar(color, "#ffffff", 0.94) : mezclar(color, "#000000", 0.84);
}

export function derivarTema({ fondo, acento, barra }: Tema): Record<string, string> {
  const oscuro = luminancia(fondo) < 0.18;
  const texto = oscuro ? mezclar(fondo, "#ffffff", 0.94) : mezclar(fondo, "#000000", 0.84);
  const tarjeta = oscuro ? mezclar(fondo, "#ffffff", 0.06) : mezclar(fondo, "#ffffff", 0.75);
  const sobreAcento = contraste(acento, "#ffffff") >= 3 ? "#ffffff" : legible(mezclar(acento, "#000000", 0.6), acento, "#000000", 4.5);

  return {
    "color-scheme": oscuro ? "dark" : "light",
    "--fondo": fondo,
    "--tarjeta": tarjeta,
    "--texto": texto,
    "--suave": mezclar(fondo, texto, 0.6),
    "--borde": mezclar(fondo, texto, 0.13),
    "--relleno": mezclar(tarjeta, texto, 0.06),
    "--acento": acento,
    "--sobre-acento": sobreAcento,
    // El acento se usa tal cual, sin ajustarlo aunque contraste poco con el fondo
    "--acento-texto": acento,
    "--acento-suave": mezclar(tarjeta, acento, 0.2),
    // Sin color propio, la barra usa el de las tarjetas (ver globals.css)
    ...(barra
      ? (() => {
          const t = textoSobre(barra);
          return { "--barra": barra, "--barra-texto": t, "--barra-suave": mezclar(barra, t, 0.6), "--barra-borde": mezclar(barra, t, 0.13) };
        })()
      : {}),
  };
}
