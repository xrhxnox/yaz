"use client";

import { useState } from "react";
import { vibrar } from "@/lib/vibrar";
import { otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import { api } from "@/lib/cliente";
import { campo } from "@/lib/estilos";
import Corazon from "./Corazon";

export type Reaccion = { persona: Persona; corazon: boolean; comentario: string | null };
type Tipo = "foto" | "diario";

export function reaccionar(tipo: Tipo, id: number, cambios: { corazon?: boolean; comentario?: string }) {
  return api("/api/reacciones", { tipo, id, ...cambios });
}

// Campo para escribir o cambiar un comentario cortito
export function EditorComentario({ inicial, alGuardar, alCancelar }: { inicial: string; alGuardar: (texto: string) => Promise<void>; alCancelar: () => void }) {
  const [texto, setTexto] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
          await alGuardar(texto);
        } finally {
          setGuardando(false);
        }
      }}
      className="mt-1.5 flex items-center gap-2"
    >
      <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Un comentario…" autoFocus className={`${campo} min-w-0 flex-1 py-1.5 text-sm`} />
      <button disabled={guardando} className="shrink-0 text-xs font-medium text-acento-texto disabled:opacity-50">
        {guardando ? "…" : "Listo"}
      </button>
      <button type="button" onClick={alCancelar} className="shrink-0 text-xs text-suave">
        Cancelar
      </button>
    </form>
  );
}

// Corazón y comentario. En lo tuyo ves lo que reaccionó la otra persona; en lo suyo, reaccionas tú.
// alComentar: si se pasa, el campo de comentario lo pone quien llama (ej. debajo de la cuadrícula de fotos)
export default function Reacciones({
  tipo,
  id,
  duenio,
  yo,
  reacciones,
  alCambiar,
  alComentar,
}: {
  tipo: Tipo;
  id: number;
  duenio: Persona;
  yo: Persona;
  reacciones?: Reaccion[];
  alCambiar: () => Promise<void>;
  alComentar?: () => void;
}) {
  const { nombres, acentos } = usePareja();
  const tu = otra(yo);
  const mia = reacciones?.find((r) => r.persona === yo);
  const suya = reacciones?.find((r) => r.persona === tu);
  // Mientras se guarda, el corazón cambia al instante
  const [corazon, setCorazon] = useState<boolean | null>(null);
  const [editando, setEditando] = useState(false);
  const lleno = corazon ?? !!mia?.corazon;

  // Es mío: solo muestro lo que reaccionó la otra persona
  if (duenio === yo) {
    if (!suya || (!suya.corazon && !suya.comentario)) return null;
    return (
      <p className="mt-1 text-xs break-words" style={{ color: acentos[tu] }}>
        {suya.corazon && <Corazon size={11} className="mr-1 inline align-[-1px]" />}
        {suya.comentario ? <span className="font-serif italic">“{suya.comentario}”</span> : `A ${nombres[tu]} le gustó`}
      </p>
    );
  }

  async function alternar() {
    const valor = !lleno;
    if (valor) vibrar();
    setCorazon(valor);
    try {
      await reaccionar(tipo, id, { corazon: valor });
      await alCambiar();
    } finally {
      setCorazon(null);
    }
  }

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-suave">
        <button onClick={alternar} aria-pressed={lleno} aria-label={lleno ? "Quitar me gusta" : "Me gusta"} className="flex items-center transition hover:text-texto">
          <span style={{ color: lleno ? acentos[yo] : undefined }}>
            <Corazon size={15} contorno={!lleno} grosor={2} />
          </span>
        </button>
        <button onClick={() => (alComentar ? alComentar() : setEditando(true))} className="transition hover:text-texto">
          {mia?.comentario ? "Editar" : "Comentar"}
        </button>
      </div>
      {mia?.comentario && !editando && (
        <p className="mt-0.5 font-serif text-xs italic break-words" style={{ color: acentos[yo] }}>
          “{mia.comentario}”
        </p>
      )}
      {editando && (
        <EditorComentario
          inicial={mia?.comentario ?? ""}
          alCancelar={() => setEditando(false)}
          alGuardar={async (texto) => {
            await reaccionar(tipo, id, { comentario: texto });
            await alCambiar();
            setEditando(false);
          }}
        />
      )}
    </div>
  );
}
