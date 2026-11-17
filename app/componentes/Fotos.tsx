"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NOMBRES, formatearFecha, type Persona } from "@/lib/config";
import { api, comprimirImagen } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "@/lib/estilos";
import Imagen from "./Imagen";

type Foto = { url: string; nota: string | null };
type Dia = { fecha: string; a: Foto | null; b: Foto | null };

function Celda({ foto, nombre }: { foto: Foto | null; nombre: string }) {
  return (
    <div className="min-w-0">
      {foto ? (
        <Imagen src={foto.url} alt={`Foto de ${nombre}`} className="aspect-[3/4] w-full rounded-xl bg-relleno" />
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-relleno px-3 text-center text-xs text-suave">
          Sin foto
        </div>
      )}
      <p className="mt-1.5 text-xs text-suave">{nombre}</p>
      {foto?.nota && <p className="font-serif text-sm italic break-words">{foto.nota}</p>}
    </div>
  );
}

export default function Fotos({ yo }: { yo: Persona }) {
  const [datos, setDatos] = useState<{ hoy: string; dias: Dia[] } | null>(null);
  const [error, setError] = useState("");
  const [nueva, setNueva] = useState<{ blob: Blob; vista: string } | null>(null);
  const [nota, setNota] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const selector = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api("/api/fotos"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar, 60000);

  // Liberar la vista previa al cambiarla o salir
  useEffect(() => () => void (nueva && URL.revokeObjectURL(nueva.vista)), [nueva]);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const blob = await comprimirImagen(archivo);
      setNueva({ blob, vista: URL.createObjectURL(blob) });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function subir() {
    if (!nueva) return;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.set("nota", nota);
      form.set("foto", nueva.blob, "foto.jpg");
      await api("/api/fotos", form);
      setNueva(null);
      setNota("");
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubiendo(false);
    }
  }

  if (!datos) return <p className="py-10 text-center text-sm text-suave">{error || "Cargando…"}</p>;

  const hoy = datos.dias.find((d) => d.fecha === datos.hoy) ?? { fecha: datos.hoy, a: null, b: null };
  const anteriores = datos.dias.filter((d) => d.fecha !== datos.hoy);

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0">
      <section className={`${tarjeta} lg:sticky lg:top-8 lg:col-span-5`}>
        <p className={etiqueta}>Foto del día · {formatearFecha(datos.hoy, { day: "numeric", month: "long" })}</p>

        {nueva ? (
          <div className="mt-3 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nueva.vista} alt="Vista previa" className="max-h-80 w-full rounded-xl object-contain bg-relleno" />
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Nota (opcional)" className={campo} />
            <div className="flex gap-2">
              <button onClick={() => setNueva(null)} className={botonSecundario}>
                Cancelar
              </button>
              <button onClick={subir} disabled={subiendo} className={`${botonPrimario} flex-1`}>
                {subiendo ? "Subiendo…" : "Subir"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Celda foto={hoy.a} nombre={yo === "a" ? "Tú" : NOMBRES.a} />
              <Celda foto={hoy.b} nombre={yo === "b" ? "Tú" : NOMBRES.b} />
            </div>
            <button onClick={() => selector.current?.click()} className={`${botonPrimario} mt-4 w-full py-2.5`}>
              {hoy[yo] ? "Cambiar mi foto de hoy" : "Subir mi foto de hoy"}
            </button>
          </>
        )}
        <input ref={selector} type="file" accept="image/*" onChange={elegir} className="hidden" />
        {error && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
      </section>

      {anteriores.length > 0 && (
        <div className="space-y-6 lg:col-span-7 lg:border-l lg:border-borde lg:pl-12">
          <p className={`${titulo} pt-2 lg:pt-0`}>Álbum</p>
          {/* En escritorio, dos días por fila */}
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-8 lg:space-y-0">
          {anteriores.map((d) => (
            <section key={d.fecha} className={tarjeta}>
              <p className={etiqueta}>{formatearFecha(d.fecha, { weekday: "long", day: "numeric", month: "long" })}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Celda foto={d.a} nombre={NOMBRES.a} />
                <Celda foto={d.b} nombre={NOMBRES.b} />
              </div>
            </section>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
