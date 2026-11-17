"use client";

import { numero } from "@/lib/estilos";

// Días seguidos en que los dos respondieron la pregunta y subieron foto
export default function Rachas({ rachas }: { rachas?: { preguntas: number; fotos: number } }) {
  if (!rachas || (!rachas.preguntas && !rachas.fotos)) return null;
  const dias = (n: number) => (n === 1 ? "día" : "días");
  return (
    <section className="grid grid-cols-2 divide-x divide-borde border-y border-borde py-3">
      <div className="pr-4">
        <p className={`${numero} text-3xl text-acento-texto`}>{rachas.preguntas}</p>
        <p className="text-xs text-suave">{dias(rachas.preguntas)} seguidos respondiendo la pregunta</p>
      </div>
      <div className="pl-4">
        <p className={`${numero} text-3xl text-acento-texto`}>{rachas.fotos}</p>
        <p className="text-xs text-suave">{dias(rachas.fotos)} seguidos con fotos de los dos</p>
      </div>
    </section>
  );
}
