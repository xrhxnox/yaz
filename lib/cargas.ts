// Cuántas llamadas a la API van en camino (el cargador espera a que lleguen a 0)
let pendientes = 0;

export function cargasPendientes() {
  return pendientes;
}

export async function contarCarga<T>(promesa: Promise<T>): Promise<T> {
  pendientes++;
  try {
    return await promesa;
  } finally {
    pendientes--;
  }
}
