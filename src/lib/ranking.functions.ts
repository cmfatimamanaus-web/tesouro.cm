import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Payload = { ano: number; mesAno?: string };

/** Ranking de devoções por número. Só para membros autenticados. */
export const rankingMembros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Payload) => input)
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/lib/supabase-admin.server");
    const supabaseAdmin = getAdminClient();

    let query = supabaseAdmin.from("registros").select("numero, mes_ano, dias");
    if (data.mesAno) query = query.eq("mes_ano", data.mesAno);
    else query = query.like("mes_ano", `%-${data.ano}`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const totais = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      const dias = (r.dias ?? {}) as Record<string, Record<string, number>>;
      let soma = 0;
      Object.values(dias).forEach((linha) => {
        Object.values(linha ?? {}).forEach((v) => (soma += Number(v) || 0));
      });
      const numero = String(r.numero);
      totais.set(numero, (totais.get(numero) ?? 0) + soma);
    });

    return [...totais.entries()]
      .map(([numero, total]) => ({ numero, total }))
      .sort((a, b) => b.total - a.total || a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  });

/** Todos os meses do próprio membro no ano escolhido. */
export const meusRegistrosDoAno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ano: number }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("registros")
      .select("mes_ano, dias")
      .eq("user_id", context.userId)
      .like("mes_ano", `%-${data.ano}`);
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
      mesIndex: Number(String(r.mes_ano).split("-")[0]) - 1,
      dias: (r.dias ?? {}) as Record<string, Record<string, number>>,
    }));
  });
