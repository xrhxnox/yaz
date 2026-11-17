"use client";

import { useSubseccion } from "@/lib/subseccion";
import Pestanas from "./Pestanas";
import Momentos from "./Momentos";
import Visitas from "./Visitas";
import Resumenes from "./Resumenes";

const PESTANAS = [
  { id: "linea", nombre: "Momentos" },
  { id: "visitas", nombre: "Visitas" },
  { id: "resumenes", nombre: "Resúmenes" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

// Recuerdos: línea del tiempo, visitas y resúmenes del mes
export default function Recuerdos() {
  const [pestana, setPestana] = useSubseccion<Pestana>(
    PESTANAS.map((p) => p.id),
    "linea",
  );

  return (
    <div className="space-y-6 lg:mx-auto lg:max-w-2xl">
      <Pestanas opciones={PESTANAS} actual={pestana} alCambiar={setPestana} etiqueta="Recuerdos" />
      {pestana === "linea" && <Momentos />}
      {pestana === "visitas" && <Visitas />}
      {pestana === "resumenes" && <Resumenes />}
    </div>
  );
}
