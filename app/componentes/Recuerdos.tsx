"use client";

import { useSubseccion } from "@/lib/subseccion";
import Pestanas from "./Pestanas";
import Momentos from "./Momentos";
import Visitas from "./Visitas";
import Resumenes from "./Resumenes";
import Playlist from "./Playlist";
import type { Persona } from "@/lib/config";

const PESTANAS = [
  { id: "linea", nombre: "Momentos" },
  { id: "visitas", nombre: "Visitas" },
  { id: "resumenes", nombre: "Resúmenes" },
  { id: "playlist", nombre: "Playlist" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

// Recuerdos: línea del tiempo, visitas, resúmenes del mes y la playlist
export default function Recuerdos({ yo }: { yo: Persona }) {
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
      {pestana === "playlist" && <Playlist yo={yo} />}
    </div>
  );
}
