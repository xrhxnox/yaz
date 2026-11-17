import { autenticar } from "@/lib/servidor";

// Después de iniciar sesión, la app pregunta quién eres (Rick o Yaz) según tu correo
export async function GET(req: Request) {
  const yo = await autenticar(req);
  if (yo instanceof Response) return yo;
  return Response.json({ persona: yo });
}
