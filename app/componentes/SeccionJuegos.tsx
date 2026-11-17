"use client";

import type { Persona } from "@/lib/config";
import { useSubseccion } from "@/lib/subseccion";
import Pestanas from "./Pestanas";
import Pregunta from "./Pregunta";
import Juegos from "./Juegos";

const PESTANAS = [
  { id: "pregunta", nombre: "Pregunta" },
  { id: "gato", nombre: "Gato" },
  { id: "conecta4", nombre: "Conecta 4" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

// Juegos: la pregunta del día, gato y conecta 4
export default function SeccionJuegos({ yo, turnos }: { yo: Persona; turnos?: string[] }) {
  const [pestana, setPestana] = useSubseccion<Pestana>(
    PESTANAS.map((p) => p.id),
    "pregunta",
  );
  return (
    <div className="space-y-6">
      <div className="lg:mx-auto lg:max-w-xl">
        <Pestanas
          // Un 1 en el juego donde te toca jugar
          opciones={PESTANAS.map((o) => ({ ...o, cuantos: turnos?.includes(o.id) ? 1 : 0 }))}
          actual={pestana}
          alCambiar={setPestana}
          etiqueta="Juegos"
        />
      </div>
      {pestana === "pregunta" ? <Pregunta yo={yo} /> : <Juegos key={pestana} yo={yo} tipo={pestana} />}
    </div>
  );
}
