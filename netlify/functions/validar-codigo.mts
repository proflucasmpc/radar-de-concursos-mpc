import type { Config, Context } from "@netlify/functions";

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") return new Response("Método não permitido", { status: 405 });
  try {
    const { codigo } = await request.json() as { codigo?: string };
    const normalizado = codigo?.trim().toUpperCase() || "";
    const valido = /^[A-Z0-9]{6}$/.test(normalizado);

    if (!valido) return Response.json({ error: "Código inválido" }, { status: 401 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Solicitação inválida" }, { status: 400 });
  }
};

export const config: Config = { path: "/api/validar-codigo" };
