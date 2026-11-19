// Lo que la persona quiso crear desde el botón "+": la sección a la que se va lo lee al abrirse
// y abre su formulario directamente (ej. "cancion" abre "Agregar canción" en la playlist).
export type Intencion = "publicar" | "cancion" | "carta" | "momento" | "pendiente" | "diario";

let pendiente: Intencion | null = null;

export function pedir(i: Intencion) {
  pendiente = i;
}

// Para leerlo al crear el estado: useState(() => hay("cancion"))
export function hay(i: Intencion) {
  return pendiente === i;
}

// Y olvidarlo ya que se usó (en un efecto)
export function limpiar(i: Intencion) {
  if (pendiente === i) pendiente = null;
}
