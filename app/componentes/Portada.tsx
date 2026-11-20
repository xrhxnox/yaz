"use client";

import { useState } from "react";
import { FECHA_INICIO, otra, type Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";
import type { Estado } from "@/lib/cliente";
import { enlace, numero } from "@/lib/estilos";
import HoraClima, { BuscarCiudad, describir, guardarCiudad, horaEn, useClima } from "./HoraClima";
import Reencuentro from "./Reencuentro";
import EditarAnimo, { hace } from "./Animo";
import Avatar from "./Avatar";

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

// Cuánto falta para vernos
function faltan(fecha: string | null, ahora: Date): { grande: string; chico: string } {
  if (!fecha) return { grande: "Sin fecha", chico: "toca para ponerla" };
  const ms = new Date(fecha).getTime() - ahora.getTime();
  const dia = new Date(fecha).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  if (ms <= 0) return { grande: "¡Ya!", chico: dia };
  const horas = ms / 36e5;
  if (horas < 24) return { grande: `${Math.ceil(horas)} h`, chico: `Hoy · ${dia}` };
  const dias = Math.ceil(horas / 24);
  return { grande: plural(dias, "día", "días"), chico: dia };
}

type Abierto = "reencuentro" | "yo" | "clima" | null;

// Lo principal de Hoy: cuánto falta para verse (con los días juntos abajo) y "Ustedes ahora":
// cómo está cada quien, dónde, qué hora es y qué clima hace. Tocar algo abre debajo su detalle
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
  const [abierto, setAbierto] = useState<Abierto>(null);
  const [cambiandoCiudad, setCambiandoCiudad] = useState(false);
  const clima = useClima(estado?.ubicaciones);
  const alternar = (que: Abierto) => {
    setCambiandoCiudad(false);
    setAbierto((x) => (x === que ? null : que));
  };

  const [a, m, d] = FECHA_INICIO.split("-").map(Number);
  const inicio = new Date(a, m - 1, d);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const total = Math.round((hoy.getTime() - inicio.getTime()) / 864e5);
  const { anios, meses, dias } = desglose(inicio, hoy);
  const partes = [anios && plural(anios, "año", "años"), meses && plural(meses, "mes", "meses"), dias && plural(dias, "día", "días")].filter(Boolean);
  const reencuentro = faltan(estado?.proximoEncuentro ?? null, ahora);

  return (
    <div className="space-y-3">
      {/* Los días juntos al centro; abajo, cuánto falta para vernos (tocar abre el reencuentro) */}
      <button
        onClick={() => alternar("reencuentro")}
        aria-expanded={abierto === "reencuentro"}
        className="block w-full overflow-hidden rounded-3xl border border-borde bg-tarjeta px-5 pt-4 pb-4 text-center transition active:scale-[0.99]"
        style={{ backgroundImage: `radial-gradient(320px 200px at 50% 0%, color-mix(in srgb, ${acentos[yo]} 16%, transparent), transparent 70%)` }}
      >
        <span className="block text-xs tracking-wide text-suave">
          Juntos desde el {inicio.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
        </span>
        <span className={`${numero} mt-1 block text-7xl leading-none text-acento-texto lg:text-8xl`}>{total}</span>
        <span className="mt-1 block font-serif text-lg italic">{total === 1 ? "día juntos" : "días juntos"}</span>
        {partes.length > 1 && <span className="block text-xs text-suave">{partes.join(" · ")}</span>}
        <span className="mt-3 flex items-center justify-center gap-1.5 border-t border-borde pt-3 text-sm">
          <span className="shrink-0 whitespace-nowrap text-suave">Próximo reencuentro</span>
          <span className="shrink-0 font-medium whitespace-nowrap text-acento-texto">{reencuentro.grande}</span>
          <span className="truncate text-xs text-suave first-letter:uppercase">· {reencuentro.chico}</span>
        </span>
      </button>
      {abierto === "reencuentro" && (
        <Reencuentro fecha={estado?.proximoEncuentro ?? null} ahora={ahora} planes={estado?.planes} visitas={estado?.visitas} alGuardar={alGuardarFecha} />
      )}

      {/* Ustedes ahora: una columna por persona */}
      <section className="rounded-2xl border border-borde bg-tarjeta p-1.5" aria-label="Ustedes ahora">
        <div className="grid grid-cols-2 gap-1.5">
          {([otra(yo), yo] as Persona[]).map((p) => {
            const u = estado?.ubicaciones?.[p];
            const h = u ? horaEn(u.zona, ahora) : null;
            const c = clima[p];
            const animo = estado?.animos?.[p];
            const mia = p === yo;
            const activo = abierto === (mia ? "yo" : "clima");
            return (
              <button
                key={p}
                onClick={() => alternar(mia ? "yo" : "clima")}
                aria-expanded={activo}
                className={`flex min-w-0 flex-col justify-start rounded-xl p-2.5 text-left transition hover:bg-relleno ${activo ? "bg-relleno" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <Avatar persona={p} size={26} />
                  <span className="truncate text-sm font-medium" style={{ color: acentos[p] }}>
                    {mia ? "Tú" : nombres[p]}
                  </span>
                </span>
                <span className={`mt-1.5 block font-serif text-[15px] leading-snug italic ${animo ? "" : "text-suave"}`}>
                  {animo ? animo.texto : mia ? "¿Cómo estás?" : "Sin estado"}
                </span>
                {animo && <span className="block text-[11px] text-suave">{hace(animo.updated_at)}</span>}
                {u && h ? (
                  <span className="mt-1.5 block text-xs text-suave">
                    <span className="block truncate">{u.ciudad}</span>
                    <span className="block truncate">
                      {h.hora}
                      {c ? ` · ${c.temp}° ${describir(c.codigo).toLowerCase()}` : ""}
                    </span>
                  </span>
                ) : (
                  <span className="mt-1.5 block text-xs text-suave">{mia ? "Pon tu ciudad" : "Sin ciudad"}</span>
                )}
                {h?.deNoche && !mia && <span className="block text-[11px] text-suave italic">Probablemente durmiendo</span>}
              </button>
            );
          })}
        </div>

        {/* Mi columna: cambiar mi estado y mi ciudad */}
        {abierto === "yo" && (
          <div className="border-t border-borde px-2.5 pt-3 pb-2">
            <EditarAnimo
              tengo={!!estado?.animos?.[yo]}
              alCambiar={async () => {
                await alCambiar();
                setAbierto(null);
              }}
            />
            {cambiandoCiudad ? (
              <BuscarCiudad
                alCancelar={() => setCambiandoCiudad(false)}
                alElegir={async (r) => {
                  await guardarCiudad(r);
                  await alCambiar();
                  setCambiandoCiudad(false);
                }}
              />
            ) : (
              <button onClick={() => setCambiandoCiudad(true)} className={`${enlace} mt-3 block text-xs`}>
                {estado?.ubicaciones?.[yo] ? "Cambiar mi ciudad" : "Poner mi ciudad"}
              </button>
            )}
          </div>
        )}
      </section>
      {abierto === "clima" && <HoraClima yo={yo} ubicaciones={estado?.ubicaciones} ahora={ahora} alCambiar={alCambiar} />}
    </div>
  );
}
