"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatearFecha, type Persona } from "@/lib/config";
import { useNombres } from "@/lib/pareja";
import { api, comprimirImagen } from "@/lib/cliente";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "@/lib/estilos";
import Imagen from "./Imagen";

type Foto = { id: number; url: string; nota: string | null };
type Dia = { fecha: string; a: Foto[]; b: Foto[] };
type Elegida = { blob: Blob; vista: string };

// Las fotos de una persona en un día, en cuadrícula
function Galeria({
  fotos,
  nombre,
  propias,
  alBorrar,
}: {
  fotos: Foto[];
  nombre: string;
  propias?: boolean;
  alBorrar?: (f: Foto) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-suave">
        {nombre}
        {fotos.length > 1 && ` · ${fotos.length} fotos`}
      </p>
      {fotos.length === 0 ? (
        <p className="font-serif text-sm italic text-suave">Sin fotos todavía.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((f) => (
            <figure key={f.id} className="relative min-w-0">
              <Imagen src={f.url} alt={f.nota || `Foto de ${nombre}`} className="aspect-[3/4] w-full rounded-lg bg-relleno" />
              {propias && alBorrar && (
                <button
                  onClick={() => alBorrar(f)}
                  aria-label="Borrar foto"
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
              {f.nota && <figcaption className="mt-1 font-serif text-xs italic break-words">{f.nota}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Fotos({ yo }: { yo: Persona }) {
  const NOMBRES = useNombres();
  const [datos, setDatos] = useState<{ hoy: string; maximo: number; dias: Dia[] } | null>(null);
  const [error, setError] = useState("");
  const [elegidas, setElegidas] = useState<Elegida[]>([]);
  const [nota, setNota] = useState("");
  const [progreso, setProgreso] = useState<string | null>(null);
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

  // Liberar las vistas previas al salir de la pantalla
  const vistas = useRef<Elegida[]>([]);
  useEffect(() => {
    vistas.current = elegidas;
  }, [elegidas]);
  useEffect(() => () => vistas.current.forEach((e) => URL.revokeObjectURL(e.vista)), []);

  if (!datos) return <p className="py-10 text-center text-sm text-suave">{error || "Cargando…"}</p>;

  const hoy = datos.dias.find((d) => d.fecha === datos.hoy) ?? { fecha: datos.hoy, a: [], b: [] };
  const anteriores = datos.dias.filter((d) => d.fecha !== datos.hoy);
  const disponibles = datos.maximo - hoy[yo].length;
  const tu = yo === "a" ? "b" : "a";

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!archivos.length) return;
    setError("");
    const cupo = disponibles - elegidas.length;
    if (archivos.length > cupo) setError(`Solo puedes subir ${datos!.maximo} fotos por día; tomé las primeras ${Math.max(cupo, 0)}.`);
    try {
      setProgreso("Preparando…");
      const nuevas: Elegida[] = [];
      for (const a of archivos.slice(0, Math.max(cupo, 0))) {
        const blob = await comprimirImagen(a);
        nuevas.push({ blob, vista: URL.createObjectURL(blob) });
      }
      setElegidas((x) => [...x, ...nuevas]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgreso(null);
    }
  }

  async function subir() {
    if (!elegidas.length) return;
    try {
      for (const [i, e] of elegidas.entries()) {
        setProgreso(elegidas.length > 1 ? `Subiendo ${i + 1} de ${elegidas.length}…` : "Subiendo…");
        const form = new FormData();
        form.set("nota", nota);
        form.set("foto", e.blob, "foto.jpg");
        await api("/api/fotos", form);
      }
      setElegidas([]);
      setNota("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgreso(null);
      await cargar();
    }
  }

  async function borrar(f: Foto) {
    if (!confirm("¿Borrar esta foto?")) return;
    try {
      await api(`/api/fotos?id=${f.id}`, undefined, "DELETE");
    } catch (err) {
      setError((err as Error).message);
    }
    await cargar();
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:space-y-0">
      <section className={`${tarjeta} lg:sticky lg:top-8 lg:col-span-5`}>
        <p className={etiqueta}>Fotos del día · {formatearFecha(datos.hoy, { day: "numeric", month: "long" })}</p>

        {elegidas.length > 0 ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {elegidas.map((e, i) => (
                <div key={e.vista} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.vista} alt={`Foto elegida ${i + 1}`} className="aspect-[3/4] w-full rounded-lg bg-relleno object-cover" />
                  <button
                    onClick={() => setElegidas((x) => x.filter((y) => y !== e))}
                    aria-label="Quitar foto"
                    disabled={!!progreso}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}
              {elegidas.length < disponibles && (
                <button
                  onClick={() => selector.current?.click()}
                  disabled={!!progreso}
                  className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-borde text-2xl text-suave hover:border-suave hover:text-texto"
                  aria-label="Agregar más fotos"
                >
                  +
                </button>
              )}
            </div>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              maxLength={200}
              placeholder={elegidas.length > 1 ? "Nota para estas fotos (opcional)" : "Nota (opcional)"}
              className={campo}
            />
            <div className="flex gap-2">
              <button onClick={() => setElegidas([])} disabled={!!progreso} className={botonSecundario}>
                Cancelar
              </button>
              <button onClick={subir} disabled={!!progreso} className={`${botonPrimario} flex-1`}>
                {progreso ?? (elegidas.length > 1 ? `Subir ${elegidas.length} fotos` : "Subir foto")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-5">
              <Galeria fotos={hoy[yo]} nombre="Tú" propias alBorrar={borrar} />
              <Galeria fotos={hoy[tu]} nombre={NOMBRES[tu]} />
            </div>
            <button
              onClick={() => selector.current?.click()}
              disabled={disponibles <= 0 || !!progreso}
              className={`${botonPrimario} mt-5 w-full py-2.5`}
            >
              {progreso ?? (disponibles <= 0 ? "Ya subiste las fotos de hoy" : hoy[yo].length ? "Agregar más fotos" : "Subir fotos de hoy")}
            </button>
          </>
        )}
        <input ref={selector} type="file" accept="image/*" multiple onChange={elegir} className="hidden" />
        {error && <p className="mt-2 text-sm text-acento-texto">{error}</p>}
      </section>

      {anteriores.length > 0 && (
        <div className="space-y-6 lg:col-span-7 lg:border-l lg:border-borde lg:pl-12">
          <p className={`${titulo} pt-2 lg:pt-0`}>Álbum</p>
          {anteriores.map((d) => (
            <section key={d.fecha} className={tarjeta}>
              <p className={etiqueta}>{formatearFecha(d.fecha, { weekday: "long", day: "numeric", month: "long" })}</p>
              <div className="mt-3 space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                <Galeria fotos={d[yo]} nombre="Tú" propias alBorrar={borrar} />
                <Galeria fotos={d[tu]} nombre={NOMBRES[tu]} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
