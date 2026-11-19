// La forma gris de lo que va a aparecer, mientras carga (se siente más rápido que un "Cargando…")
type Tipo = "publicaciones" | "lista" | "cuadricula" | "historias";

export default function Esqueleto({ tipo = "lista", filas = 3 }: { tipo?: Tipo; filas?: number }) {
  const n = Array.from({ length: filas }, (_, i) => i);
  return (
    <div role="status" aria-label="Cargando" aria-busy="true">
      {tipo === "publicaciones" && (
        <div className="space-y-6">
          {n.slice(0, 2).map((i) => (
            <div key={i}>
              <div className="flex items-center gap-2.5 py-2">
                <span className="esqueleto h-8 w-8 rounded-full" />
                <span className="esqueleto h-3 w-24 rounded-full" />
              </div>
              <div className="esqueleto -mx-5 aspect-[4/5] lg:mx-0 lg:rounded-xl" />
              <div className="mt-3 flex gap-3">
                <span className="esqueleto h-6 w-6 rounded-full" />
                <span className="esqueleto h-6 w-6 rounded-full" />
              </div>
              <span className="esqueleto mt-2 block h-3 w-2/3 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {tipo === "lista" && (
        <ul className="space-y-4 py-2">
          {n.map((i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="esqueleto h-10 w-10 shrink-0 rounded-xl" />
              <span className="flex-1 space-y-2">
                <span className="esqueleto block h-3 rounded-full" style={{ width: `${75 - i * 12}%` }} />
                <span className="esqueleto block h-2.5 w-1/3 rounded-full" />
              </span>
            </li>
          ))}
        </ul>
      )}
      {tipo === "cuadricula" && (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: filas * 3 }, (_, i) => (
            <span key={i} className="esqueleto aspect-square" />
          ))}
        </div>
      )}
      {tipo === "historias" && (
        <div className="flex gap-3">
          {[0, 1].map((i) => (
            <span key={i} className="flex w-[72px] flex-col items-center gap-1.5">
              <span className="esqueleto h-[68px] w-[68px] rounded-full" />
              <span className="esqueleto h-2.5 w-12 rounded-full" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
