export type Persona = "a" | "b";

// Llave de localStorage donde se guarda quién eres en este dispositivo
export const CLAVE_SESION = "nosotros:sesion";
export const CLAVE_TEMA = "nosotros:tema";
export const CLAVE_MINUSCULAS = "nosotros:minusculas";
export const CLAVE_FUENTE = "nosotros:fuente";

// Estilos de letra para personalizar la app (los CSS están en globals.css, [data-fuente])
export const FUENTES = [
  { id: "diario", nombre: "Diario" },
  { id: "elegante", nombre: "Elegante" },
  { id: "moderna", nombre: "Moderna" },
  { id: "redonda", nombre: "Redonda" },
  { id: "a-mano", nombre: "A mano" },
  { id: "maquina", nombre: "Máquina" },
] as const;
export type Fuente = (typeof FUENTES)[number]["id"];
export function esFuente(x: unknown): x is Fuente {
  return FUENTES.some((f) => f.id === x);
}
export type Estilo = { minusculas?: boolean; fuente?: Fuente };

export const NOMBRES: Record<Persona, string> = {
  a: process.env.NEXT_PUBLIC_NOMBRE_A || "Ric",
  b: process.env.NEXT_PUBLIC_NOMBRE_B || "Yaz",
};

// Cómo se escribe el nombre de la app: Yaz va primero
export const PAREJA = `${NOMBRES.b} & ${NOMBRES.a}`;

// Fecha en que empezamos a ser pareja (YYYY-MM-DD)
export const FECHA_INICIO = process.env.NEXT_PUBLIC_FECHA_INICIO || "2026-02-15";

export const MENSAJES = [
  "Pensé en ti",
  "Te extraño",
  "Te amo",
  "Un abrazo",
  "Buenos días",
  "Buenas noches",
];

export const MAX_MENSAJE = 120;

// Zona horaria que define cuándo empieza "hoy" para la pregunta y las fotos del día
export const ZONA_COMPARTIDA = process.env.NEXT_PUBLIC_ZONA_HORARIA || "America/Hermosillo";

export const CATEGORIAS = [
  { id: "pelis", nombre: "Películas y series" },
  { id: "lugares", nombre: "Lugares" },
  { id: "planes", nombre: "Planes juntos" },
  { id: "otro", nombre: "Otros" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["id"];

export function esCategoria(v: unknown): v is Categoria {
  return CATEGORIAS.some((c) => c.id === v);
}

export const TALLAS = [
  { id: "arriba", nombre: "Playera / blusa", ejemplo: "M" },
  { id: "abajo", nombre: "Pantalón", ejemplo: "30 / 32" },
  { id: "vestir", nombre: "Vestido / traje", ejemplo: "M" },
  { id: "zapatos", nombre: "Zapatos", ejemplo: "26 MX" },
  { id: "interior", nombre: "Ropa interior", ejemplo: "M" },
  { id: "anillo", nombre: "Anillo", ejemplo: "7" },
  { id: "notas", nombre: "Notas", ejemplo: "Colores favoritos, marcas, alergias…" },
] as const;

export type Tallas = Partial<Record<(typeof TALLAS)[number]["id"], string>>;

// Colores con los que arranca cada tema (los mismos de globals.css)
export const TEMA_INICIAL: Record<Persona, { fondo: string; acento: string }> = {
  a: { fondo: "#000000", acento: "#2f99eb" },
  b: { fondo: "#fbf7fa", acento: "#fad4f5" },
};

// Fecha YYYY-MM-DD en la zona compartida
export function hoyCompartido(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_COMPARTIDA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Momento exacto (UTC, ISO) de una hora local en la zona compartida. Ej: horaLocal("2026-11-17", 0) = medianoche local
export function horaLocal(fecha: string, hora: number) {
  const desfase = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_COMPARTIDA, timeZoneName: "shortOffset" })
    .formatToParts(new Date(fecha + "T12:00:00Z"))
    .find((p) => p.type === "timeZoneName")?.value; // ej. "GMT-7"
  const [, signo, h, m] = desfase?.match(/GMT([+-])(\d+)(?::(\d+))?/) ?? [, "+", "0", "0"];
  const minutos = (Number(h) * 60 + Number(m ?? 0)) * (signo === "-" ? -1 : 1);
  return new Date(Date.parse(fecha + "T00:00:00Z") + hora * 3600e3 - minutos * 60e3).toISOString();
}

export function esFecha(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
}

// "2026-02-15" -> "15 de febrero de 2026"
export function formatearFecha(fecha: string, opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", opciones);
}

// "Meses" de la relación: el mes 1 va del 15 de febrero al 14 de marzo, el 2 del 15 de marzo al 14 de abril…
export function periodoMes(n: number): { inicio: string; fin: string } {
  const [a, m, d] = FECHA_INICIO.split("-").map(Number);
  const inicio = new Date(Date.UTC(a, m - 1 + (n - 1), d));
  const fin = new Date(Date.UTC(a, m - 1 + n, d) - 864e5);
  return { inicio: inicio.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10) };
}

// En qué mes de la relación cae una fecha (1 = el primero)
export function mesDe(fecha: string): number {
  let n = 1;
  while (periodoMes(n + 1).inicio <= fecha) n++;
  return n;
}

export function otra(p: Persona): Persona {
  return p === "a" ? "b" : "a";
}

export function esPersona(v: unknown): v is Persona {
  return v === "a" || v === "b";
}
