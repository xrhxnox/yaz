// Clases que se repiten en varias pantallas (estilo diario editorial)

// Sección de la página: sin caja, separada por una línea fina como en una revista
export const tarjeta = "border-t border-borde pt-5";
// Caja para formularios y tarjetas que sí necesitan contorno
export const caja = "rounded-xl border border-borde bg-tarjeta p-5";

// Etiqueta pequeña arriba de cada sección
export const etiqueta = "text-xs tracking-wide text-acento-texto";
// Título de sección en serif
export const titulo = "font-serif text-2xl leading-tight tracking-tight lg:text-[1.7rem]";
// Fecha o dato pequeño junto a un título de sección
export const junto = "ml-2 font-sans text-xs tracking-wide text-suave";
// Números grandes en serif
export const numero = "font-serif font-normal tabular-nums tracking-tight";

export const campo =
  "w-full rounded-lg border border-borde bg-tarjeta px-4 py-2.5 outline-none placeholder:text-suave focus:border-suave";
// Todos los botones de la app: píldora; el principal relleno con el acento, el secundario con borde
export const botonPrimario = "rounded-full bg-acento px-4 py-2 text-sm font-medium text-sobre-acento transition hover:brightness-105 active:scale-[0.97] disabled:opacity-30";
export const botonSecundario = "rounded-full border border-borde px-4 py-2 text-sm font-medium transition hover:bg-relleno active:scale-[0.97] disabled:opacity-30";
export const enlace = "text-sm text-suave underline decoration-borde underline-offset-4 hover:text-texto hover:decoration-suave";
