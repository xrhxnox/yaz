"use client";

import { useSubseccion } from "@/lib/subseccion";
import Pestanas from "./Pestanas";
import Momentos from "./Momentos";
import Visitas from "./Visitas";
import Resumenes from "./Resumenes";
import Pendientes from "./Pendientes";

const PESTANAS = [
  { id: "linea", nombre: "Historia" },
  { id: "pendientes", nombre: "Pendientes" },
  { id: "visitas", nombre: "Visitas" },
  { id: "resumenes", nombre: "Resúmenes" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

// Momentos: historia (línea del tiempo), pendientes, visitas y resúmenes del mes
export default function Recuerdos() {
  const [pestana, setPestana] = useSubseccion<Pestana>(
    PESTANAS.map((p) => p.id),
    "linea",
  );

  return (
    // Pendientes usa dos columnas en escritorio; lo demás va en una columna centrada
    <div className={`space-y-6 ${pestana === "pendientes" ? "" : "lg:mx-auto lg:max-w-2xl"}`}>
      <Pestanas opciones={PESTANAS} actual={pestana} alCambiar={setPestana} etiqueta="Momentos" />
      {pestana === "linea" && <Momentos />}
      {pestana === "visitas" && <Visitas />}
      {pestana === "resumenes" && <Resumenes />}
      {pestana === "pendientes" && <Pendientes />}
    </div>
  );
}
