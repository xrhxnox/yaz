"use client";

import type { Persona } from "@/lib/config";
import { useSubseccion } from "@/lib/subseccion";
import Pestanas from "./Pestanas";
import Muro from "./Muro";
import Diario from "./Diario";

const PESTANAS = [
  { id: "muro", nombre: "Muro" },
  { id: "diario", nombre: "Diario" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

// El día a día: el muro de fotos y el diario
export default function SeccionFotos({ yo }: { yo: Persona }) {
  const [pestana, setPestana] = useSubseccion<Pestana>(
    PESTANAS.map((p) => p.id),
    "muro",
  );
  return (
    <div className="space-y-6">
      <Pestanas opciones={PESTANAS} actual={pestana} alCambiar={setPestana} etiqueta="Fotos y diario" />
      {pestana === "muro" ? (
        <div className="lg:mx-auto lg:max-w-xl">
          <Muro yo={yo} />
        </div>
      ) : (
        <Diario yo={yo} />
      )}
    </div>
  );
}
