"use client";

import { useCallback, useState } from "react";
import { NOMBRES, formatearFecha, otra, type Persona } from "@/lib/config";
import { api } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, campo, enlace, etiqueta, tarjeta } from "@/lib/estilos";

type Datos = {
  fecha: string;
  pregunta: string;
  mia: string | null;
  suya: string | null;
  suyaRespondida: boolean;
  historial: { fecha: string; pregunta: string; a: string; b: string }[];
};

function Respuesta({ quien, texto }: { quien: string; texto: string }) {
  return (
    <div>
      <p className="text-xs text-suave">{quien}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{texto}</p>
    </div>
  );
}

export default function Pregunta({ yo }: { yo: Persona }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const tu = otra(yo);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/api/pregunta"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 30000);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await api("/api/pregunta", { respuesta: texto });
      setEditando(false);
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (!datos) return <p className="py-10 text-center text-sm text-suave">{error || "Cargando…"}</p>;

  const formulario = (
    <form onSubmit={responder} className="mt-4 space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Tu respuesta"
        className={`${campo} resize-none`}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-suave">
          {datos.suyaRespondida ? `${NOMBRES[tu]} ya respondió. Contesta para ver su respuesta.` : `Verás la respuesta de ${NOMBRES[tu]} cuando ambos contesten.`}
        </p>
        <button disabled={!texto.trim() || enviando} className={botonPrimario}>
          {enviando ? "Enviando…" : "Responder"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-3">
      <section className={tarjeta}>
        <p className={etiqueta}>Pregunta del día · {formatearFecha(datos.fecha, { day: "numeric", month: "long" })}</p>
        <p className="mt-2 text-xl font-semibold tracking-tight">{datos.pregunta}</p>

        {!datos.mia || editando ? (
          formulario
        ) : (
          <div className="mt-4 space-y-4 border-t border-borde pt-4">
            <Respuesta quien="Tú" texto={datos.mia} />
            {datos.suya ? (
              <Respuesta quien={NOMBRES[tu]} texto={datos.suya} />
            ) : (
              <p className="text-sm text-suave">Esperando la respuesta de {NOMBRES[tu]}…</p>
            )}
            <button
              onClick={() => {
                setTexto(datos.mia ?? "");
                setEditando(true);
              }}
              className={enlace}
            >
              Editar mi respuesta
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
      </section>

      {datos.historial.length > 0 && (
        <>
          <p className="px-1 pt-3 text-sm font-medium">Días anteriores</p>
          {datos.historial.map((h) => (
            <section key={h.fecha} className={tarjeta}>
              <p className={etiqueta}>{formatearFecha(h.fecha)}</p>
              <p className="mt-1 font-medium">{h.pregunta}</p>
              <div className="mt-3 space-y-3 text-sm">
                <Respuesta quien={yo === "a" ? "Tú" : NOMBRES.a} texto={h.a} />
                <Respuesta quien={yo === "b" ? "Tú" : NOMBRES.b} texto={h.b} />
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
