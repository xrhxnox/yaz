"use client";

import type { Persona } from "@/lib/config";
import { useSubseccion } from "@/lib/subseccion";
import Pestanas from "./Pestanas";
import Pendientes from "./Pendientes";
import Rondas from "./Rondas";

const PESTANAS = [
  { id: "lista", nombre: "La lista" },
  { id: "decidir", nombre: "Esto o aquello" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

export default function SeccionPendientes({ yo }: { yo: Persona }) {
  const [pestana, setPestana] = useSubseccion<Pestana>(
    PESTANAS.map((p) => p.id),
    "lista",
  );
  return (
    <div className="space-y-6">
      <Pestanas opciones={PESTANAS} actual={pestana} alCambiar={setPestana} etiqueta="Pendientes" />
      {pestana === "lista" ? <Pendientes /> : <Rondas yo={yo} />}
    </div>
  );
}
