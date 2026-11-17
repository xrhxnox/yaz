import { db, error, invalido, autenticar, nombresActuales, notificar, revisar } from "@/lib/servidor";
import { horaLocal, hoyCompartido, otra, type Persona } from "@/lib/config";
import { JUEGOS, PARTIDAS_POR_DIA, buscarGanador, caidaEnColumna, esTipoJuego, tableroVacio, type Ficha, type Resultado, type TipoJuego } from "@/lib/juegos";

type Partida = {
  id: number;
  tipo: TipoJuego;
  tablero: Ficha[];
  empieza: Persona;
  turno: Persona | null;
  ganador: Resultado | null;
  linea: number[] | null;
  created_at: string;
  updated_at: string;
};

const CAMPOS = "id, tipo, tablero, empieza, turno, ganador, linea, created_at, updated_at";

// Partidas en curso, la última terminada de cada juego y el marcador histórico
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  try {
    const partidas: Partida[] = revisar(await db().from("partidas").select(CAMPOS).order("created_at", { ascending: false })) ?? [];
    const marcador: Record<TipoJuego, { a: number; b: number; empate: number }> = {
      gato: { a: 0, b: 0, empate: 0 },
      conecta4: { a: 0, b: 0, empate: 0 },
    };
    for (const p of partidas) if (p.ganador) marcador[p.tipo][p.ganador]++;

    // La más reciente de cada tipo (en curso o recién terminada)
    const actual: Record<TipoJuego, Partida | null> = {
      gato: partidas.find((p) => p.tipo === "gato") ?? null,
      conecta4: partidas.find((p) => p.tipo === "conecta4") ?? null,
    };
    // Cuántas partidas de cada juego se han empezado hoy (hora local)
    const desde = Date.parse(horaLocal(hoyCompartido(), 0));
    const deHoy = (t: TipoJuego) => partidas.filter((p) => p.tipo === t && Date.parse(p.created_at) >= desde).length;
    const hoy: Record<TipoJuego, number> = { gato: deHoy("gato"), conecta4: deHoy("conecta4") };
    return Response.json({ actual, marcador, hoy, limite: PARTIDAS_POR_DIA });
  } catch (e) {
    return error(e);
  }
}

// Nueva partida (o revancha). Empieza quien no empezó la anterior de ese juego
export async function POST(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { tipo } = await req.json().catch(() => ({}));
  if (!esTipoJuego(tipo)) return invalido();

  try {
    const anterior = revisar(
      await db().from("partidas").select("id, empieza, ganador").eq("tipo", tipo).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ) as { id: number; empieza: Persona; ganador: Resultado | null } | null;
    if (anterior && !anterior.ganador) return invalido("Ya hay una partida en curso");

    const { count } = await db()
      .from("partidas")
      .select("*", { count: "exact", head: true })
      .eq("tipo", tipo)
      .gte("created_at", horaLocal(hoyCompartido(), 0));
    if ((count ?? 0) >= PARTIDAS_POR_DIA) {
      return invalido(`Ya jugaron ${PARTIDAS_POR_DIA} partidas de ${JUEGOS[tipo].nombre} hoy. Mañana hay más`);
    }

    const empieza: Persona = anterior ? otra(anterior.empieza) : yo;
    revisar(await db().from("partidas").insert({ tipo, tablero: tableroVacio(tipo), empieza, turno: empieza }));

    const nombres = await nombresActuales();
    const juego = JUEGOS[tipo].nombre;
    if (empieza !== yo) await notificar(empieza, juego, `${nombres[yo]} empezó una partida. Te toca`, `/#juegos/${tipo}`);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Hacer una jugada: { id, posicion } (gato: casilla 0-8; conecta 4: columna 0-6)
export async function PATCH(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const { id, posicion } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id) || !Number.isInteger(posicion)) return invalido();

  try {
    const p = revisar(await db().from("partidas").select(CAMPOS).eq("id", id).maybeSingle()) as Partida | null;
    if (!p) return invalido("Esa partida ya no existe");
    if (p.ganador) return invalido("La partida ya terminó");
    if (p.turno !== yo) return invalido("No es tu turno");

    const { columnas } = JUEGOS[p.tipo];
    const tablero = [...p.tablero];
    const casilla = p.tipo === "conecta4" ? (posicion >= 0 && posicion < columnas ? caidaEnColumna(tablero, posicion) : -1) : posicion;
    if (casilla < 0 || casilla >= tablero.length || tablero[casilla] !== null) return invalido("Ahí no se puede");
    tablero[casilla] = yo;

    const { ganador, linea } = buscarGanador(tablero, p.tipo);
    // Solo se guarda si sigue siendo mi turno (evita dos jugadas al mismo tiempo)
    const guardada = revisar(
      await db()
        .from("partidas")
        .update({ tablero, turno: ganador ? null : otra(yo), ganador, linea, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("turno", yo)
        .select("id")
        .maybeSingle(),
    );
    if (!guardada) return invalido("No es tu turno");

    const nombres = await nombresActuales();
    const juego = JUEGOS[p.tipo].nombre;
    const url = `/#juegos/${p.tipo}`;
    const mensaje = !ganador ? `${nombres[yo]} ya jugó. Te toca` : ganador === "empate" ? "Quedaron empate" : `Ganó ${nombres[yo]}`;
    await notificar(otra(yo), juego, mensaje, url);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// Abandonar (borrar) la partida en curso
export async function DELETE(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return invalido();

  try {
    revisar(await db().from("partidas").delete().eq("id", id).is("ganador", null));
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}
