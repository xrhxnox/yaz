"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TALLAS, TEMA_INICIAL, otra, type Persona, type Tallas } from "@/lib/config";
import { useNombres, usePareja } from "@/lib/pareja";
import Avatar from "./Avatar";
import { api, type Ubicacion, comprimirImagen } from "@/lib/cliente";
import { BuscarCiudad, guardarCiudad } from "./HoraClima";
import Notificaciones from "./Notificaciones";
import { aplicarMinusculas, aplicarTema } from "@/lib/tema";
import { cambiarContrasena, correoActual } from "@/lib/cuenta";
import type { Tema } from "@/lib/colores";
import { useCarga } from "@/lib/useCarga";
import { botonPrimario, botonSecundario, caja, campo, enlace, etiqueta, tarjeta, titulo as tituloSeccion } from "@/lib/estilos";

type Deseo = { id: number; persona: Persona; titulo: string; url: string; nota: string | null; comprado: boolean };
type Datos = { perfiles: Record<Persona, { tallas: Tallas; tema: Tema | null; favoritos: Favorito[] }>; deseos: Deseo[] };

const FONDOS = ["#000000", "#0f1115", "#1b1a1f", "#1f1f21", "#2b2b2e", "#ffffff", "#fbf7fa", "#f6f4ef", "#eef3f8"];
const ACENTOS = ["#2f99eb", "#fad4f5", "#e5484d", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6", "#f472b6"];

function dominio(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Equis() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ---------- Tallas ----------

function SeccionTallas({
  tallas,
  editable,
  sinTitulo,
  alGuardar,
}: {
  tallas: Tallas;
  editable: boolean;
  sinTitulo?: boolean;
  alGuardar: (t: Tallas) => Promise<void>;
}) {
  const [borrador, setBorrador] = useState<Tallas | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!borrador) return;
    setGuardando(true);
    try {
      await alGuardar(borrador);
      setBorrador(null);
    } finally {
      setGuardando(false);
    }
  }

  if (borrador) {
    return (
      <form onSubmit={guardar} className={`${caja} space-y-3`}>
        <p className={tituloSeccion}>Mis tallas</p>
        {TALLAS.map((t) => (
          <label key={t.id} className="block">
            <span className={etiqueta}>{t.nombre}</span>
            {t.id === "notas" ? (
              <textarea
                value={borrador[t.id] ?? ""}
                onChange={(e) => setBorrador({ ...borrador, [t.id]: e.target.value })}
                placeholder={t.ejemplo}
                maxLength={500}
                rows={3}
                className={`${campo} mt-1 resize-none`}
              />
            ) : (
              <input
                value={borrador[t.id] ?? ""}
                onChange={(e) => setBorrador({ ...borrador, [t.id]: e.target.value })}
                placeholder={t.ejemplo}
                maxLength={40}
                className={`${campo} mt-1`}
              />
            )}
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setBorrador(null)} className={botonSecundario}>
            Cancelar
          </button>
          <button disabled={guardando} className={`${botonPrimario} flex-1`}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    );
  }

  const conValor = TALLAS.filter((t) => t.id !== "notas" && tallas[t.id]);
  return (
    <section className={tarjeta}>
      <div className="flex items-center justify-between">
        {!sinTitulo && <p className={tituloSeccion}>Tallas</p>}
        {editable && (
          <button onClick={() => setBorrador({ ...tallas })} className={enlace}>
            Editar
          </button>
        )}
      </div>
      {conValor.length === 0 && !tallas.notas ? (
        <p className="mt-2 text-sm text-suave">{editable ? "Todavía no agregas tus tallas." : "Todavía no agrega sus tallas."}</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {conValor.map((t) => (
              <div key={t.id} className="border-b border-borde pb-2">
                <dt className="text-xs text-suave">{t.nombre}</dt>
                <dd className="font-serif text-xl break-words">{tallas[t.id]}</dd>
              </div>
            ))}
          </dl>
          {tallas.notas && <p className="mt-3 text-sm whitespace-pre-wrap text-suave">{tallas.notas}</p>}
        </>
      )}
    </section>
  );
}

// Botones ↑ ↓ para mover un elemento en una lista
function Flechas({ indice, total, alMover }: { indice: number; total: number; alMover: (desde: number, hacia: number) => void }) {
  const boton = "flex h-7 w-7 items-center justify-center rounded-full border border-borde text-suave transition hover:text-texto disabled:opacity-25";
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" onClick={() => alMover(indice, indice - 1)} disabled={indice === 0} aria-label="Subir" className={boton}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
      <button type="button" onClick={() => alMover(indice, indice + 1)} disabled={indice === total - 1} aria-label="Bajar" className={boton}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function mover<T>(lista: T[], desde: number, hacia: number): T[] {
  if (hacia < 0 || hacia >= lista.length) return lista;
  const copia = [...lista];
  const [x] = copia.splice(desde, 1);
  copia.splice(hacia, 0, x);
  return copia;
}

// ---------- Datos y favoritos ----------

type Favorito = { titulo: string; valor: string };

// Ideas para empezar rápido; cada quien puede escribir los suyos
const SUGERENCIAS = [
  "Silueta de tenis",
  "Marca de ropa",
  "Equipo de fútbol",
  "Comida",
  "Postre",
  "Bebida",
  "Café",
  "Película",
  "Serie",
  "Canción",
  "Artista",
  "Libro",
  "Color",
  "Flor",
  "Perfume",
  "Lugar",
  // Datos
  "Alergias",
  "No me gusta",
  "Signo",
  "Tipo de sangre",
];

function SeccionFavoritos({
  favoritos,
  editable,
  sinTitulo,
  alGuardar,
}: {
  favoritos: Favorito[];
  editable: boolean;
  sinTitulo?: boolean;
  alGuardar: (f: Favorito[]) => Promise<void>;
}) {
  const [borrador, setBorrador] = useState<Favorito[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  function cambiar(i: number, campoNombre: keyof Favorito, valor: string) {
    setBorrador((b) => b && b.map((f, j) => (j === i ? { ...f, [campoNombre]: valor } : f)));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!borrador) return;
    setGuardando(true);
    try {
      await alGuardar(borrador.filter((f) => f.titulo.trim() && f.valor.trim()));
      setBorrador(null);
    } finally {
      setGuardando(false);
    }
  }

  if (borrador) {
    const usados = new Set(borrador.map((f) => f.titulo.trim().toLowerCase()));
    return (
      <form onSubmit={guardar} className={`${caja} space-y-3`}>
        <p className={tituloSeccion}>Mis datos y favoritos</p>
        {borrador.length === 0 && <p className="text-sm text-suave">Agrega el primero con las ideas de abajo o con “Agregar otro”.</p>}
        <ul className="space-y-2">
          {borrador.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <div className="mt-1">
                <Flechas indice={i} total={borrador.length} alMover={(a, b) => setBorrador((x) => x && mover(x, a, b))} />
              </div>
              <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">
                <input
                  value={f.titulo}
                  onChange={(e) => cambiar(i, "titulo", e.target.value)}
                  maxLength={60}
                  placeholder="¿Qué? (ej. Equipo de fútbol)"
                  className={`${campo} text-sm`}
                />
                <input
                  value={f.valor}
                  onChange={(e) => cambiar(i, "valor", e.target.value)}
                  maxLength={120}
                  placeholder="¿Cuál? (ej. Real Madrid)"
                  className={`${campo} text-sm`}
                  autoFocus={!f.valor && !!f.titulo}
                />
              </div>
              <button
                type="button"
                onClick={() => setBorrador((b) => b && b.filter((_, j) => j !== i))}
                aria-label="Quitar"
                className="mt-2.5 shrink-0 p-1 text-suave hover:text-acento-texto"
              >
                <Equis />
              </button>
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => setBorrador((b) => b && [...b, { titulo: "", valor: "" }])} className={enlace}>
          Agregar otro
        </button>

        <div>
          <p className={etiqueta}>Ideas</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SUGERENCIAS.filter((s) => !usados.has(s.toLowerCase())).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBorrador((b) => b && [...b, { titulo: s, valor: "" }])}
                className="rounded-full border border-borde px-3 py-1 text-xs transition hover:bg-relleno"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setBorrador(null)} className={botonSecundario}>
            Cancelar
          </button>
          <button disabled={guardando} className={`${botonPrimario} flex-1`}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className={tarjeta}>
      <div className="flex items-center justify-between">
        {!sinTitulo && <p className={tituloSeccion}>Datos y favoritos</p>}
        {editable && (
          <button onClick={() => setBorrador(favoritos.length ? favoritos.map((f) => ({ ...f })) : [])} className={enlace}>
            {favoritos.length ? "Editar" : "Agregar"}
          </button>
        )}
      </div>
      {favoritos.length === 0 ? (
        <p className="mt-2 text-sm text-suave">{editable ? "Todavía no agregas tus datos ni favoritos." : "Todavía no agrega sus datos ni favoritos."}</p>
      ) : (
        <dl className="mt-2 divide-y divide-borde">
          {favoritos.map((f, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-suave">{f.titulo}</dt>
              <dd className="text-right font-serif text-lg leading-snug break-words">{f.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

// ---------- Wishlist ----------

type DatosDeseo = { url: string; titulo: string; nota: string };

// Formulario para agregar o editar un producto de la wishlist
function FormDeseo({
  inicial,
  textoBoton,
  alGuardar,
  alCancelar,
}: {
  inicial: DatosDeseo;
  textoBoton: string;
  alGuardar: (d: DatosDeseo) => Promise<void>;
  alCancelar: () => void;
}) {
  const [url, setUrl] = useState(inicial.url);
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [nota, setNota] = useState(inicial.nota);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setGuardando(true);
    try {
      await alGuardar({ url, titulo, nota });
    } catch {
      // El error ya se muestra arriba; dejamos el formulario abierto para corregir
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="mt-3 space-y-2">
      <input
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.amazon.com.mx/…"
        className={campo}
        autoFocus
      />
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Nombre (opcional)" className={campo} />
      <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Nota: color, talla… (opcional)" className={campo} />
      <div className="flex gap-2">
        <button type="button" onClick={alCancelar} className={botonSecundario}>
          Cancelar
        </button>
        <button disabled={!url.trim() || guardando} className={`${botonPrimario} flex-1`}>
          {guardando ? "Guardando…" : textoBoton}
        </button>
      </div>
    </form>
  );
}

function SeccionDeseos({
  duenio,
  yo,
  deseos,
  alAgregar,
  alEditar,
  alBorrar,
  alMarcar,
  alOrdenar,
  sinTitulo,
}: {
  duenio: Persona;
  sinTitulo?: boolean;
  yo: Persona;
  deseos: Deseo[];
  alAgregar: (d: DatosDeseo) => Promise<void>;
  alEditar: (d: Deseo, datos: DatosDeseo) => Promise<void>;
  alBorrar: (d: Deseo) => void;
  alMarcar: (d: Deseo) => void;
  alOrdenar: (ids: number[]) => void;
}) {
  const NOMBRES = useNombres();
  const [agregando, setAgregando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [ordenando, setOrdenando] = useState(false);
  const esMia = duenio === yo;

  return (
    <section className={tarjeta}>
      <div className="flex items-center justify-between">
        {!sinTitulo && <p className={tituloSeccion}>Wishlist</p>}
        {esMia && !agregando && (
          <div className="flex items-center gap-4">
            {deseos.length > 1 && (
              <button
                onClick={() => {
                  setOrdenando((o) => !o);
                  setEditando(null);
                }}
                className={enlace}
              >
                {ordenando ? "Listo" : "Ordenar"}
              </button>
            )}
            {!ordenando && (
              <button
                onClick={() => {
                  setAgregando(true);
                  setEditando(null);
                }}
                className={enlace}
              >
                Agregar link
              </button>
            )}
          </div>
        )}
      </div>
      {!esMia && <p className="mt-1 text-xs text-suave">{NOMBRES[duenio]} no ve lo que marques como comprado.</p>}

      {agregando && (
        <FormDeseo
          inicial={{ url: "", titulo: "", nota: "" }}
          textoBoton="Agregar"
          alCancelar={() => setAgregando(false)}
          alGuardar={async (datos) => {
            await alAgregar(datos);
            setAgregando(false);
          }}
        />
      )}

      {deseos.length === 0 ? (
        !agregando && <p className="mt-2 text-sm text-suave">{esMia ? "Agrega links de cosas que te gustan." : "Todavía no hay nada aquí."}</p>
      ) : (
        <ul className="mt-2 divide-y divide-borde">
          {deseos.map((d, i) =>
            editando === d.id ? (
              <li key={d.id} className="py-3">
                <p className={etiqueta}>Editar producto</p>
                <FormDeseo
                  inicial={{ url: d.url, titulo: d.titulo, nota: d.nota ?? "" }}
                  textoBoton="Guardar"
                  alCancelar={() => setEditando(null)}
                  alGuardar={async (datos) => {
                    await alEditar(d, datos);
                    setEditando(null);
                  }}
                />
              </li>
            ) : (
              <li key={d.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block font-serif text-lg leading-snug break-words hover:underline ${d.comprado ? "text-suave line-through" : ""}`}
                  >
                    {d.titulo}
                  </a>
                  <p className="sin-mayuscula text-xs text-suave">{dominio(d.url)}</p>
                  {d.nota && <p className="mt-0.5 text-sm break-words text-suave">{d.nota}</p>}
                </div>
                {esMia && ordenando ? (
                  <Flechas
                    indice={i}
                    total={deseos.length}
                    alMover={(a, b) => alOrdenar(mover(deseos, a, b).map((x) => x.id))}
                  />
                ) : esMia ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        setEditando(d.id);
                        setAgregando(false);
                      }}
                      className="px-1 text-xs text-suave underline decoration-borde underline-offset-4 hover:text-texto"
                    >
                      Editar
                    </button>
                    <button onClick={() => alBorrar(d)} aria-label="Borrar" className="p-1 text-suave hover:text-acento-texto">
                      <Equis />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => alMarcar(d)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                      d.comprado ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:bg-relleno"
                    }`}
                  >
                    {d.comprado ? "Comprado" : "Ya lo compré"}
                  </button>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

// ---------- Personalizar ----------

function Muestras({ colores, actual, alElegir, etiquetaColor }: { colores: string[]; actual: string; alElegir: (c: string) => void; etiquetaColor: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {colores.map((c) => (
        <button
          key={c}
          onClick={() => alElegir(c)}
          aria-label={`${etiquetaColor} ${c}`}
          className={`h-8 w-8 rounded-full border transition ${actual.toLowerCase() === c ? "ring-2 ring-texto ring-offset-2 ring-offset-tarjeta" : "border-borde"}`}
          style={{ background: c }}
        />
      ))}
      <label className="relative flex h-8 items-center gap-2 rounded-full border border-borde pr-3 pl-1 text-xs text-suave">
        <span className="h-6 w-6 rounded-full border border-borde" style={{ background: actual }} />
        {actual.toLowerCase()}
        <input type="color" value={actual} onChange={(e) => alElegir(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${etiquetaColor} personalizado`} />
      </label>
    </div>
  );
}

// Textos normales o todo en minúsculas; se aplica y se guarda al tocarlo
function OpcionTexto({ yo, minusculas, alGuardar }: { yo: Persona; minusculas: boolean; alGuardar: (minusculas: boolean) => Promise<void> }) {
  const [guardando, setGuardando] = useState(false);

  async function elegir(valor: boolean) {
    if (valor === minusculas || guardando) return;
    aplicarMinusculas(yo, valor);
    setGuardando(true);
    try {
      await alGuardar(valor);
    } catch {
      aplicarMinusculas(yo, minusculas);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-5">
      <p className={etiqueta}>Texto</p>
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-relleno p-1">
        {[
          { valor: false, nombre: "Normal" },
          { valor: true, nombre: "todo en minúsculas" },
        ].map((o) => (
          <button
            key={o.nombre}
            onClick={() => elegir(o.valor)}
            disabled={guardando}
            style={{ textTransform: "none" }}
            className={`sin-mayuscula rounded-full py-2 text-sm transition ${
              minusculas === o.valor ? "bg-acento font-medium text-sobre-acento" : "text-suave hover:text-texto"
            }`}
          >
            {o.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

function SeccionTema({
  yo,
  temaActual,
  minusculas,
  alGuardar,
  alGuardarTexto,
}: {
  yo: Persona;
  temaActual: Tema | null;
  minusculas: boolean;
  alGuardar: (t: Tema | null) => Promise<void>;
  alGuardarTexto: (minusculas: boolean) => Promise<void>;
}) {
  const original = TEMA_INICIAL[yo];
  const [borrador, setBorrador] = useState<Tema>(temaActual ?? original);
  const [guardando, setGuardando] = useState(false);
  const base = temaActual ?? original;
  const cambiado = borrador.fondo !== base.fondo || borrador.acento !== base.acento;

  // Al salir sin guardar, regresa al tema que estaba
  const guardado = useRef(temaActual);
  useEffect(() => {
    guardado.current = temaActual;
  }, [temaActual]);
  useEffect(() => () => aplicarTema(yo, guardado.current, false), [yo]);

  function probar(t: Tema) {
    setBorrador(t);
    // Si es igual al original no hace falta calcular nada: se usan los colores de globals.css
    aplicarTema(yo, t.fondo === original.fondo && t.acento === original.acento ? null : t, false);
  }

  async function guardar(t: Tema | null) {
    setGuardando(true);
    try {
      await alGuardar(t);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className={tarjeta}>
      <p className={tituloSeccion}>Personalizar mi app</p>
      <p className="mt-0.5 text-xs text-suave">Solo cambia cómo la ves tú. Los cambios se ven en vivo.</p>

      <p className={`${etiqueta} mt-4`}>Fondo</p>
      <Muestras colores={FONDOS} actual={borrador.fondo} etiquetaColor="Fondo" alElegir={(fondo) => probar({ ...borrador, fondo })} />

      <p className={`${etiqueta} mt-4`}>Color de acento</p>
      <Muestras colores={ACENTOS} actual={borrador.acento} etiquetaColor="Acento" alElegir={(acento) => probar({ ...borrador, acento })} />

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-relleno p-3">
        <span className="rounded-full bg-acento px-3 py-1.5 text-sm font-medium text-sobre-acento">Botón</span>
        <span className="text-sm text-acento-texto">Texto de acento</span>
        <span className="ml-auto text-sm text-suave">Vista previa</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          disabled={!cambiado || guardando}
          onClick={() => guardar(borrador.fondo === original.fondo && borrador.acento === original.acento ? null : borrador)}
          className={botonPrimario}
        >
          {guardando ? "Guardando…" : "Guardar colores"}
        </button>
        {cambiado && (
          <button onClick={() => probar(base)} className={botonSecundario}>
            Deshacer
          </button>
        )}
        {(temaActual || cambiado) && (
          <button onClick={() => probar(original)} className={`${enlace} ml-auto`}>
            Colores originales
          </button>
        )}
      </div>
      <OpcionTexto yo={yo} minusculas={minusculas} alGuardar={alGuardarTexto} />
    </section>
  );
}

// ---------- Cuenta ----------

function SeccionCuenta() {
  const [correo, setCorreo] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  useEffect(() => {
    correoActual().then(setCorreo);
  }, []);

  const problema =
    nueva && nueva.length < 8 ? "Usa al menos 8 caracteres" : repetida && nueva !== repetida ? "Las contraseñas no coinciden" : "";

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!actual || !nueva || problema || nueva !== repetida) return;
    setGuardando(true);
    setError("");
    try {
      await cambiarContrasena(actual, nueva);
      setActual("");
      setNueva("");
      setRepetida("");
      setAbierto(false);
      setListo(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className={tarjeta}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={tituloSeccion}>Mi cuenta</p>
          {correo && <p className="sin-mayuscula truncate text-sm text-suave">{correo}</p>}
        </div>
        {!abierto && (
          <button
            onClick={() => {
              setAbierto(true);
              setListo(false);
            }}
            className={`${enlace} shrink-0`}
          >
            Cambiar contraseña
          </button>
        )}
      </div>
      {listo && <p className="mt-2 text-sm text-acento-texto">Contraseña actualizada.</p>}

      {abierto && (
        <form onSubmit={guardar} className="mt-3 space-y-2">
          <input
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder="Contraseña actual"
            className={campo}
            autoFocus
          />
          <input
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Nueva contraseña (mínimo 8)"
            className={campo}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            placeholder="Repite la nueva contraseña"
            className={campo}
          />
          {(problema || error) && <p className="text-sm text-acento-texto">{error || problema}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setError("");
              }}
              className={botonSecundario}
            >
              Cancelar
            </button>
            <button disabled={!actual || !nueva || !repetida || !!problema || guardando} className={`${botonPrimario} flex-1`}>
              {guardando ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// ---------- Ajustes ----------

function SeccionAjustes({ yo, ubicacion, alCambiar }: { yo: Persona; ubicacion: Ubicacion | null; alCambiar: () => Promise<void> }) {
  const [buscando, setBuscando] = useState(false);
  return (
    <section className={tarjeta}>
      <p className={tituloSeccion}>Ajustes</p>

      <div className="mt-4">
        <p className={etiqueta}>Mi ciudad</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="font-serif text-lg">{ubicacion?.ciudad ?? "Sin ciudad todavía"}</p>
          {!buscando && (
            <button onClick={() => setBuscando(true)} className={`${enlace} shrink-0`}>
              {ubicacion ? "Cambiar" : "Poner mi ciudad"}
            </button>
          )}
        </div>
        <p className="text-xs text-suave">Se usa para tu hora y tu clima en el inicio.</p>
        {buscando && (
          <BuscarCiudad
            alCancelar={() => setBuscando(false)}
            alElegir={async (r) => {
              await guardarCiudad(r);
              await alCambiar();
              setBuscando(false);
            }}
          />
        )}
      </div>

      <div className="mt-5 border-t border-borde pt-4">
        <p className={etiqueta}>Notificaciones</p>
        <div className="mt-2">
          <Notificaciones yo={yo} enPerfil />
        </div>
      </div>
    </section>
  );
}

// ---------- Foto, apodo y cumpleaños ----------

const MESES = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString("es-MX", { month: "long" }));

function textoCumple(cumple: string) {
  const [m, d] = cumple.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

function SeccionDatos({ persona, editable, alCambiar }: { persona: Persona; editable: boolean; alCambiar: () => Promise<void> }) {
  const { nombres, cumples } = usePareja();
  const [editando, setEditando] = useState(false);
  const [apodo, setApodo] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState("");
  const cumple = cumples[persona];

  function abrir() {
    setApodo(nombres[persona]);
    const [m, d] = cumple ? cumple.split("-") : ["", ""];
    setMes(m);
    setDia(d);
    setError("");
    setEditando(true);
  }

  async function hacer(texto: string, accion: () => Promise<unknown>) {
    setOcupado(texto);
    setError("");
    try {
      await accion();
      await alCambiar();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setOcupado(null);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if ((dia && !mes) || (!dia && mes)) return setError("Elige día y mes, o deja los dos vacíos");
    const ok = await hacer("Guardando…", () =>
      api("/api/perfil", { apodo, cumple: dia && mes ? `${mes}-${dia.padStart(2, "0")}` : null }),
    );
    if (ok) setEditando(false);
  }

  async function cambiarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    await hacer("Subiendo foto…", async () => {
      const form = new FormData();
      form.set("foto", await comprimirImagen(archivo, 600), "perfil.jpg");
      await api("/api/perfil", form, "PUT");
    });
  }

  return (
    <section className={tarjeta}>
      <div className="flex items-center gap-4">
        <Avatar persona={persona} size={72} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-3xl leading-tight tracking-tight">{nombres[persona]}</p>
          <p className="font-serif text-sm italic text-suave">
            {cumple ? `Cumpleaños: ${textoCumple(cumple)}` : editable ? "Agrega tu cumpleaños" : "Sin cumpleaños todavía"}
          </p>
        </div>
        {editable && !editando && (
          <button onClick={abrir} className={`${enlace} shrink-0`}>
            Editar
          </button>
        )}
      </div>

      {editable && editando && (
        <form onSubmit={guardar} className="mt-5 space-y-4">
          <div>
            <p className={etiqueta}>Foto de perfil</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label className={`${botonSecundario} cursor-pointer`}>
                {ocupado === "Subiendo foto…" ? ocupado : "Elegir foto"}
                <input type="file" accept="image/*" onChange={cambiarFoto} disabled={!!ocupado} className="hidden" />
              </label>
              <button
                type="button"
                disabled={!!ocupado}
                onClick={() => hacer("Quitando…", () => api("/api/perfil", { quitarFoto: true }))}
                className={enlace}
              >
                Quitar foto
              </button>
            </div>
          </div>

          <label className="block">
            <span className={etiqueta}>Apodo</span>
            <input value={apodo} onChange={(e) => setApodo(e.target.value)} maxLength={30} className={`${campo} mt-1`} />
          </label>

          <div>
            <p className={etiqueta}>Cumpleaños</p>
            <div className="mt-1 grid grid-cols-[6rem_1fr] gap-2">
              <select value={dia} onChange={(e) => setDia(e.target.value)} className={campo} aria-label="Día">
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                  <option key={d} value={d}>
                    {Number(d)}
                  </option>
                ))}
              </select>
              <select value={mes} onChange={(e) => setMes(e.target.value)} className={campo} aria-label="Mes">
                <option value="">Mes</option>
                {MESES.map((nombre, i) => (
                  <option key={nombre} value={String(i + 1).padStart(2, "0")}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-acento-texto">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditando(false)} disabled={!!ocupado} className={botonSecundario}>
              Cerrar
            </button>
            <button disabled={!!ocupado} className={`${botonPrimario} flex-1`}>
              {ocupado === "Guardando…" ? ocupado : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// ---------- Perfil ----------

export default function Perfil({
  yo,
  temaActual,
  minusculas,
  ubicacion,
  alCambiarTema,
  alCambiarDatos,
  alSalir,
}: {
  yo: Persona;
  temaActual: Tema | null;
  minusculas: boolean;
  ubicacion: Ubicacion | null;
  alCambiarTema: () => Promise<void>;
  alCambiarDatos: () => Promise<void>;
  alSalir: () => void;
}) {
  const NOMBRES = useNombres();
  const [viendo, setViendo] = useState<Persona>(yo);
  // Al ver el perfil del otro, tallas / datos y favoritos / wishlist van en pestañas
  const [pestana, setPestana] = useState<"tallas" | "favoritos" | "wishlist">("tallas");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/api/perfil"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useCarga(cargar);

  async function hacer(accion: Promise<unknown>) {
    try {
      await accion;
      setError("");
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      await cargar();
    }
  }

  const deseos = (datos?.deseos ?? []).filter((d) => d.persona === viendo);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-relleno p-1 lg:mx-auto lg:max-w-md">
        {([yo, otra(yo)] as Persona[]).map((p) => (
          <button
            key={p}
            onClick={() => setViendo(p)}
            className={`rounded-full py-2 text-sm font-medium transition ${viendo === p ? "bg-tarjeta shadow-sm" : "text-suave hover:text-texto"}`}
          >
            <span className="inline-flex items-center gap-2">
              <Avatar persona={p} size={22} />
              {p === yo ? `Yo (${NOMBRES[p]})` : NOMBRES[p]}
            </span>
          </button>
        ))}
      </div>

      <SeccionDatos key={`datos-${viendo}`} persona={viendo} editable={viendo === yo} alCambiar={alCambiarDatos} />

      {error && <p className="text-sm text-acento-texto">{error}</p>}
      {!datos && !error && <p className="py-10 text-center text-sm text-suave">Cargando…</p>}

      {/* En escritorio: tallas y wishlist a la izquierda, ajustes a la derecha */}
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12 lg:space-y-0">
      <div className={`space-y-6 ${viendo === yo ? "" : "lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-2xl [&>section]:border-t-0 [&>section]:pt-0"}`}>
      {datos && viendo !== yo && (
        <div role="tablist" aria-label="Secciones del perfil" className="flex gap-4 border-b border-borde sm:gap-6">
          {(
            [
              ["tallas", "Tallas", TALLAS.filter((t) => datos.perfiles[viendo].tallas[t.id]).length],
              ["favoritos", "Datos y favoritos", (datos.perfiles[viendo].favoritos ?? []).length],
              ["wishlist", "Wishlist", deseos.length],
            ] as const
          ).map(([id, nombre, cuantos]) => (
            <button
              key={id}
              role="tab"
              aria-selected={pestana === id}
              onClick={() => setPestana(id)}
              className={`-mb-px flex items-baseline gap-1.5 border-b-2 pb-2 font-serif text-lg transition ${
                pestana === id ? "border-acento-texto text-texto" : "border-transparent text-suave hover:text-texto"
              }`}
            >
              {nombre}
              {cuantos > 0 && <span className="font-sans text-xs text-acento-texto">{cuantos}</span>}
            </button>
          ))}
        </div>
      )}
      {datos && (
        <>
          {(viendo === yo || pestana === "tallas") && (
          <SeccionTallas
            key={`tallas-${viendo}`}
            tallas={datos.perfiles[viendo].tallas}
            editable={viendo === yo}
            sinTitulo={viendo !== yo}
            alGuardar={(tallas) => hacer(api("/api/perfil", { tallas }))}
          />
          )}
          {(viendo === yo || pestana === "favoritos") && (
          <SeccionFavoritos
            key={`favoritos-${viendo}`}
            favoritos={datos.perfiles[viendo].favoritos ?? []}
            editable={viendo === yo}
            sinTitulo={viendo !== yo}
            alGuardar={(favoritos) => hacer(api("/api/perfil", { favoritos }))}
          />
          )}
          {(viendo === yo || pestana === "wishlist") && (
          <SeccionDeseos
            key={`deseos-${viendo}`}
            duenio={viendo}
            yo={yo}
            sinTitulo={viendo !== yo}
            deseos={deseos}
            alAgregar={(d) => hacer(api("/api/deseos", d))}
            alEditar={(d, datos) => hacer(api("/api/deseos", { id: d.id, ...datos }, "PUT"))}
            alOrdenar={(ids) => {
              setDatos((x) => {
                if (!x) return x;
                const otros = x.deseos.filter((d) => !ids.includes(d.id));
                const ordenados = ids.map((id) => x.deseos.find((d) => d.id === id)!).filter(Boolean);
                return { ...x, deseos: [...ordenados, ...otros] };
              });
              hacer(api("/api/deseos", { orden: ids }, "PATCH")).catch(() => {});
            }}
            alBorrar={(d) => {
              if (confirm(`¿Borrar "${d.titulo}"?`)) hacer(api(`/api/deseos?id=${d.id}`, undefined, "DELETE")).catch(() => {});
            }}
            alMarcar={(d) => {
              setDatos((x) => x && { ...x, deseos: x.deseos.map((y) => (y.id === d.id ? { ...y, comprado: !d.comprado } : y)) });
              hacer(api("/api/deseos", { id: d.id, comprado: !d.comprado }, "PATCH")).catch(() => {});
            }}
          />
          )}
        </>
      )}
      </div>

      {viendo === yo && (
      <div className="space-y-6 lg:border-l lg:border-borde lg:pl-12">
        <SeccionTema
          yo={yo}
          temaActual={temaActual}
          minusculas={minusculas}
          alGuardarTexto={async (valor) => {
            await hacer(api("/api/perfil", { estilo: { minusculas: valor } }));
            await alCambiarTema();
          }}
          alGuardar={async (tema) => {
            await hacer(api("/api/perfil", { tema }));
            await alCambiarTema();
          }}
        />
        <SeccionAjustes yo={yo} ubicacion={ubicacion} alCambiar={alCambiarDatos} />
        <SeccionCuenta />
      </div>
      )}
      </div>

      <button
        onClick={() => {
          if (confirm("¿Cerrar sesión en este dispositivo?")) alSalir();
        }}
        className={`${enlace} mx-auto block pt-2`}
      >
        Cerrar sesión en este dispositivo
      </button>
    </div>
  );
}
