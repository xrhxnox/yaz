// Preguntas de "¿seguro?" como hoja que sale desde abajo (en lugar del confirm() del navegador)
export type Pregunta = {
  titulo: string;
  detalle?: string;
  // Texto del botón que confirma (ej. "Borrar")
  accion?: string;
  // Rojo para lo que no se puede deshacer
  peligro?: boolean;
};

type Pendiente = Pregunta & { responder: (si: boolean) => void };

let actual: Pendiente | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function confirmar(p: Pregunta): Promise<boolean> {
  // Si ya había una abierta, esa se toma como "no"
  actual?.responder(false);
  return new Promise((ok) => {
    const pendiente: Pendiente = {
      ...p,
      responder: (si) => {
        if (actual === pendiente) {
          actual = null;
          avisar();
        }
        ok(si);
      },
    };
    actual = pendiente;
    avisar();
  });
}

export function preguntaActual() {
  return actual;
}

export function suscribirPregunta(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
