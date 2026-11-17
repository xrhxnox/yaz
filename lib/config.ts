export type Persona = "a" | "b";

// Llave de localStorage donde se guarda quién eres en este dispositivo
export const CLAVE_SESION = "nosotros:sesion";
export const CLAVE_TEMA = "nosotros:tema";

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

export function esFecha(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
}

// "2026-02-15" -> "15 de febrero de 2026"
export function formatearFecha(fecha: string, opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", opciones);
}

export function otra(p: Persona): Persona {
  return p === "a" ? "b" : "a";
}

export function esPersona(v: unknown): v is Persona {
  return v === "a" || v === "b";
}
