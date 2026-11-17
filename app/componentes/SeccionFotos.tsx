"use client";

import type { Persona } from "@/lib/config";
import { useSubseccion } from "@/lib/subseccion";
import Pestanas from "./Pestanas";
import Fotos from "./Fotos";
import Diario from "./Diario";

const PESTANAS = [
  { id: "fotos", nombre: "Fotos" },
  { id: "diario", nombre: "Diario" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

// El día a día: fotos y diario
export default function SeccionFotos({ yo }: { yo: Persona }) {
  const [pestana, setPestana] = useSubseccion<Pestana>(
    PESTANAS.map((p) => p.id),
    "fotos",
  );
  return (
    <div className="space-y-6">
      <Pestanas opciones={PESTANAS} actual={pestana} alCambiar={setPestana} etiqueta="Fotos y diario" />
      {pestana === "fotos" ? <Fotos yo={yo} /> : <Diario yo={yo} />}
    </div>
  );
}
