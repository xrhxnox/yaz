"use client";

import { FECHA_INICIO, hoyCompartido, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { JUEGOS, esTipoJuego } from "@/lib/juegos";
import type { Estado } from "@/lib/cliente";

type Pendiente = { id: string; texto: string; href?: string; especial?: boolean };

// Días que faltan para el próximo "MM-DD" contando desde hoy (0 = hoy)
function diasPara(cumple: string, hoy: string) {
  const [a, m, d] = hoy.split("-").map(Number);
  const [cm, cd] = cumple.split("-").map(Number);
  const inicio = Date.UTC(a, m - 1, d);
  let siguiente = Date.UTC(a, cm - 1, cd);
  if (siguiente < inicio) siguiente = Date.UTC(a + 1, cm - 1, cd);
  return Math.round((siguiente - inicio) / 864e5);
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// Todo lo que pide algo hoy, junto en una tarjeta: cumpleaños cerca, mesiversario, juegos donde te toca
// y la pregunta del día. Si no hay nada, no aparece
export default function ParaHoy({ yo, ahora, estado }: { yo: Persona; ahora: Date; estado: Estado | null }) {
  const { nombres, cumples } = usePareja();
  const hoy = hoyCompartido();
  const lista: Pendiente[] = [];

  // Mesiversario o aniversario
  const [a, m, d] = FECHA_INICIO.split("-").map(Number);
  const meses = (ahora.getFullYear() - a) * 12 + (ahora.getMonth() - (m - 1));
  if (ahora.getDate() === d && meses > 0) {
    lista.push({
      id: "mes",
      texto: meses % 12 === 0 ? `Hoy cumplen ${plural(meses / 12, "año", "años")} juntos` : `Hoy cumplen ${plural(meses, "mes", "meses")} juntos`,
      href: "#nosotros/resumenes",
      especial: true,
    });
  }

  // Cumpleaños de la próxima semana
  for (const p of ["a", "b"] as Persona[]) {
    if (!cumples[p]) continue;
    const dias = diasPara(cumples[p]!, hoy);
    if (dias > 7) continue;
    const quien = p === yo ? "tu cumpleaños" : `el cumpleaños de ${nombres[p]}`;
    const texto =
      dias === 0 ? (p === yo ? "Hoy es tu cumpleaños" : `Hoy es el cumpleaños de ${nombres[p]}`) : dias === 1 ? `Mañana es ${quien}` : `Faltan ${dias} días para ${quien}`;
    lista.push({ id: `cumple-${p}`, texto, href: p === yo ? undefined : "#perfil/pareja", especial: dias === 0 });
  }

  // Juegos donde me toca
  for (const t of (estado?.turnos ?? []).filter(esTipoJuego)) lista.push({ id: `turno-${t}`, texto: `Te toca en ${JUEGOS[t].nombre}`, href: `#juegos/${t}` });

  // Pregunta del día
  if (estado?.preguntaPendiente) lista.push({ id: "pregunta", texto: "Responde la pregunta del día", href: "#juegos/pregunta" });

  if (!lista.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-borde bg-tarjeta">
      <p className="px-4 pt-3 text-xs tracking-wide text-acento-texto">Para hoy</p>
      <ul className="py-1">
        {lista.map((x) => {
          const contenido = (
            <>
              <span className={`h-2 w-2 shrink-0 rounded-full ${x.especial ? "bg-acento" : "border-2 border-acento-texto"}`} aria-hidden />
              <span className={`min-w-0 flex-1 ${x.especial ? "font-serif text-lg italic text-acento-texto" : ""}`}>{x.texto}</span>
              {x.href && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-suave" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              )}
            </>
          );
          return (
            <li key={x.id}>
              {x.href ? (
                <a href={x.href} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-relleno active:bg-relleno">
                  {contenido}
                </a>
              ) : (
                <p className="flex items-center gap-3 px-4 py-2.5">{contenido}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
