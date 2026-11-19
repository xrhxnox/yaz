// Un toquecito al dar me gusta, mandar un corazón o publicar (en Android; en iPhone el navegador no lo permite)
export function vibrar(patron: number | number[] = 12) {
  try {
    navigator.vibrate?.(patron);
  } catch {
    // Sin vibración: no pasa nada
  }
}
