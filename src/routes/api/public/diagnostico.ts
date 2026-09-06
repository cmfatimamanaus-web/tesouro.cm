import { createFileRoute } from "@tanstack/react-router";

/**
 * Diagnóstico público (sem segredos): mostra se o servidor onde o app está
 * hospedado enxerga as variáveis do banco e quantos registros ele consegue ler.
 * Abrir em: <seu-site>/api/public/diagnostico
 */
export const Route = createFileRoute("/api/public/diagnostico")({
  server: {
    handlers: {
      GET: async () => {
        const url =
          process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
        const temChave = Boolean(
          process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
            process.env["SUPABASE_SECRET_KEY"] ??
            process.env["SUPABASE_SERVICE_KEY"],
        );

        const resposta: Record<string, unknown> = {
          servidorAtivo: true,
          banco: url ? new URL(url).host : null,
          temChaveSecreta: temChave,
        };

        try {
          const { getAdminClient } = await import("@/lib/supabase-admin.server");
          const { count, error } = await getAdminClient()
            .from("registros")
            .select("id", { count: "exact", head: true });
          if (error) throw new Error(error.message);
          resposta["registrosEncontrados"] = count ?? 0;
          resposta["erro"] = null;
        } catch (e) {
          resposta["registrosEncontrados"] = null;
          resposta["erro"] = e instanceof Error ? e.message : String(e);
        }

        return new Response(JSON.stringify(resposta, null, 2), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      },
    },
  },
});
