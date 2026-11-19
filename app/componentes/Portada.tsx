"use client";

import { useState } from "react";
import { FECHA_INICIO, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import type { Estado } from "@/lib/cliente";
import { numero } from "@/lib/estilos";
import HoraClima, { describir, horaEn, useClima } from "./HoraClima";
import Reencuentro from "./Reencuentro";

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

// Años, meses y días desde que empezamos
function desglose(inicio: Date, hoy: Date) {
  let meses = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());
  if (hoy.getDate() < inicio.getDate()) meses--;
  const corte = new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate());
  const dias = Math.round((hoy.getTime() - corte.getTime()) / 864e5);
  return { anios: Math.floor(meses / 12), meses: meses % 12, dias };
}

// Cuánto falta para vernos, en corto
function faltan(fecha: string | null, ahora: Date): { grande: string; chico: string } {
  if (!fecha) return { grande: "Sin fecha", chico: "Toca para ponerla" };
  const ms = new Date(fecha).getTime() - ahora.getTime();
  const dia = new Date(fecha).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  if (ms <= 0) return { grande: "¡Ya!", chico: dia };
  const horas = ms / 36e5;
  if (horas < 24) return { grande: `${Math.ceil(horas)} h`, chico: `Hoy · ${dia}` };
  const dias = Math.ceil(horas / 24);
  return { grande: plural(dias, "día", "días"), chico: dia };
}

// La portada de Hoy: días juntos, reencuentro, racha y la hora y el clima de cada quien.
// Tocar el reencuentro o el clima abre debajo el detalle para editarlo
export default function Portada({
  yo,
  ahora,
  estado,
  alCambiar,
  alGuardarFecha,
}: {
  yo: Persona;
  ahora: Date;
  estado: Estado | null;
  alCambiar: () => Promise<void>;
  alGuardarFecha: (fecha: string | null) => Promise<void>;
}) {
  const { nombres, acentos } = usePareja();
  const [abierto, setAbierto] = useState<"reencuentro" | "clima" | null>(null);
  const clima = useClima(estado?.ubicaciones);

  const [a, m, d] = FECHA_INICIO.split("-").map(Number);
  const inicio = new Date(a, m - 1, d);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const total = Math.round((hoy.getTime() - inicio.getTime()) / 864e5);
  const { anios, meses, dias } = desglose(inicio, hoy);
  const partes = [anios && plural(anios, "año", "años"), meses && plural(meses, "mes", "meses"), dias && plural(dias, "día", "días")].filter(Boolean);
  const esMesiversario = hoy.getDate() === inicio.getDate() && total > 0;
  const esAniversario = esMesiversario && hoy.getMonth() === inicio.getMonth();

  const reencuentro = faltan(estado?.proximoEncuentro ?? null, ahora);
  const racha = estado?.rachas;
  const alternar = (que: "reencuentro" | "clima") => setAbierto((x) => (x === que ? null : que));
  const caja = "rounded-2xl bg-relleno p-3 text-left transition hover:brightness-110";

  return (
    <div className="space-y-4">
      <section
        className="overflow-hidden rounded-3xl border border-borde bg-tarjeta p-5"
        style={{ backgroundImage: `radial-gradient(320px 200px at 0% 0%, color-mix(in srgb, ${acentos[yo]} 16%, transparent), transparent 70%)` }}
      >
        <p className="text-xs tracking-wide text-suave">Juntos desde el {inicio.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
        <div className="mt-1 flex items-end gap-3">
          <p className={`${numero} text-7xl leading-none text-acento-texto lg:text-8xl`}>{total}</p>
          <div className="pb-1.5">
            <p className="font-serif text-lg leading-tight italic">días juntos</p>
            {partes.length > 0 && <p className="text-xs text-suave">{partes.join(" · ")}</p>}
          </div>
        </div>
        {esMesiversario && (
          <p className="mt-3 border-l-2 border-acento-texto pl-3 font-serif text-lg italic text-acento-texto">
            {esAniversario ? `Hoy cumplimos ${plural(anios, "año", "años")}` : `Hoy cumplimos ${plural(anios * 12 + meses, "mes", "meses")}`}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button onClick={() => alternar("reencuentro")} aria-expanded={abierto === "reencuentro"} className={caja}>
            <span className="block text-[11px] text-suave">Próximo reencuentro</span>
            <span className={`${numero} block text-2xl leading-tight text-acento-texto`}>{reencuentro.grande}</span>
            <span className="block truncate text-[11px] text-suave first-letter:uppercase">{reencuentro.chico}</span>
          </button>
          <a href="#muro" className={caja}>
            <span className="block text-[11px] text-suave">Racha con fotos</span>
            <span className={`${numero} block text-2xl leading-tight text-acento-texto`}>{plural(racha?.fotos ?? 0, "día", "días")}</span>
            <span className="block truncate text-[11px] text-suave">{racha?.preguntas ? `y ${racha.preguntas} con la pregunta` : "seguidos, los dos"}</span>
          </a>
        </div>

        {/* La hora y el clima de cada quien */}
        <button onClick={() => alternar("clima")} aria-expanded={abierto === "clima"} className="mt-2.5 grid w-full grid-cols-2 gap-2.5 text-left">
          {(["b", "a"] as Persona[]).map((p) => {
            const u = estado?.ubicaciones?.[p];
            const h = u ? horaEn(u.zona, ahora) : null;
            const c = clima[p];
            return (
              <span key={p} className={`${caja} block`}>
                <span className="block text-[11px]" style={{ color: acentos[p] }}>
                  {p === yo ? "Tú" : nombres[p]}
                </span>
                {u && h ? (
                  <>
                    <span className="block truncate font-serif text-base leading-tight">{u.ciudad}</span>
                    <span className="block text-xs text-suave">
                      {h.hora}
                      {c ? ` · ${c.temp}° ${describir(c.codigo).toLowerCase()}` : ""}
                    </span>
                    {h.deNoche && p !== yo && <span className="block text-[11px] text-suave italic">Probablemente durmiendo</span>}
                  </>
                ) : (
                  <span className="block font-serif text-sm text-suave italic">{p === yo ? "Pon tu ciudad" : "Sin ciudad"}</span>
                )}
              </span>
            );
          })}
        </button>
      </section>

      {abierto === "reencuentro" && (
        <Reencuentro fecha={estado?.proximoEncuentro ?? null} ahora={ahora} planes={estado?.planes} visitas={estado?.visitas} alGuardar={alGuardarFecha} />
      )}
      {abierto === "clima" && <HoraClima yo={yo} ubicaciones={estado?.ubicaciones} ahora={ahora} alCambiar={alCambiar} />}
    </div>
  );
}
