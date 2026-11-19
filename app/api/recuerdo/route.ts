import { db, error, autenticar, firmar } from "@/lib/servidor";
import { hoyCompartido, type Persona } from "@/lib/config";
import { fotosDelMuro } from "@/lib/muro";

// Si una tabla aún no existe, esa parte sale vacía
async function opcional<T>(consulta: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const r = await consulta;
    return r.error ? [] : (r.data ?? []);
  } catch {
    return [];
  }
}

// El mismo día del mes, k meses antes (null si ese mes no tiene ese día, ej. 31 de abril)
function mesesAtras(fecha: string, k: number): string | null {
  const [a, m, d] = fecha.split("-").map(Number);
  const total = a * 12 + (m - 1) - k;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  if (d > dias) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function hace(k: number) {
  if (k % 12 === 0) return k === 12 ? "Hace un año" : `Hace ${k / 12} años`;
  return k === 1 ? "Hace un mes" : `Hace ${k} meses`;
}

// "Un día como hoy": lo que pasó en esta misma fecha en meses anteriores (fotos, momentos y diario)
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;

  const hoy = hoyCompartido();
  const fechas = new Map<string, number>();
  for (let k = 1; k <= 36; k++) {
    const f = mesesAtras(hoy, k);
    if (f) fechas.set(f, k);
  }
  const lista = [...fechas.keys()];

  try {
    const [fotos, momentos, diario] = await Promise.all([
      fotosDelMuro({ fechas: lista }),
      opcional<{ fecha: string; titulo: string }>(db().from("momentos").select("fecha, titulo").in("fecha", lista)),
      opcional<{ fecha: string; persona: Persona; tipo: string; texto: string }>(
        db().from("diario").select("fecha, persona, tipo, texto").in("fecha", lista).order("created_at"),
      ),
    ]);

    // Por día, del más reciente al más viejo; máximo 3 días y 3 fotos por día
    const dias = lista
      .map((fecha) => ({
        fecha,
        hace: hace(fechas.get(fecha)!),
        fotos: fotos.filter((f) => f.fecha === fecha).slice(0, 3),
        momentos: momentos.filter((m) => m.fecha === fecha).map((m) => m.titulo),
        diario: diario.filter((d) => d.fecha === fecha).slice(0, 4),
      }))
      .filter((d) => d.fotos.length || d.momentos.length || d.diario.length)
      .slice(0, 3);

    const vista = (f: { path: string; miniatura?: string | null }) => f.miniatura ?? f.path;
    const urls = await firmar(dias.flatMap((d) => d.fotos.map(vista)));
    return Response.json({
      recuerdos: dias.map((d) => ({
        ...d,
        fotos: d.fotos.filter((f) => urls[vista(f)]).map((f) => ({ url: urls[vista(f)], persona: f.persona, nota: f.nota })),
      })),
    });
  } catch (e) {
    return error(e);
  }
}
