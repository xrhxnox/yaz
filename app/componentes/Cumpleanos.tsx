"use client";

import { hoyCompartido, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";

// Días que faltan para el próximo "MM-DD" contando desde hoy (0 = hoy)
function diasPara(cumple: string, hoy: string) {
  const [a, m, d] = hoy.split("-").map(Number);
  const [cm, cd] = cumple.split("-").map(Number);
  const inicio = Date.UTC(a, m - 1, d);
  let siguiente = Date.UTC(a, cm - 1, cd);
  if (siguiente < inicio) siguiente = Date.UTC(a + 1, cm - 1, cd);
  return Math.round((siguiente - inicio) / 864e5);
}

// Aviso en el inicio cuando el cumpleaños de alguno está cerca (una semana antes)
export default function Cumpleanos({ yo }: { yo: Persona }) {
  const { nombres, cumples } = usePareja();
  const hoy = hoyCompartido();

  const avisos = (["a", "b"] as Persona[])
    .filter((p) => cumples[p])
    .map((p) => ({ p, dias: diasPara(cumples[p]!, hoy) }))
    .filter(({ dias }) => dias <= 7)
    .sort((x, y) => x.dias - y.dias);

  if (!avisos.length) return null;

  return (
    <div className="space-y-2">
      {avisos.map(({ p, dias }) => {
        const quien = p === yo ? "tu cumpleaños" : `el cumpleaños de ${nombres[p]}`;
        const texto =
          dias === 0
            ? p === yo
              ? "Hoy es tu cumpleaños"
              : `Hoy es el cumpleaños de ${nombres[p]}`
            : dias === 1
              ? `Mañana es ${quien}`
              : `Faltan ${dias} días para ${quien}`;
        return (
          <p key={p} className="border-l-2 border-acento-texto pl-3 font-serif text-xl italic text-acento-texto">
            {texto}
          </p>
        );
      })}
    </div>
  );
}
