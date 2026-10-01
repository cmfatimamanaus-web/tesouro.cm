import { createServerFn } from "@tanstack/react-start";

type Payload = { senha: string; mesAno?: string; ano?: number };

function validarSenha(senha: string) {
  const esperada = process.env["MODERADOR_SENHA"] ?? "responsavel2026";
  if (senha !== esperada) throw new Error("Senha incorreta.");
}

export const consolidadoModerador = createServerFn({ method: "POST" })
  .inputValidator((input: Payload) => input)
  .handler(async ({ data }) => {
    validarSenha(data.senha);
    const { getAdminClient } = await import("@/lib/supabase-admin.server");
    const supabaseAdmin = getAdminClient();

    let query = supabaseAdmin.from("registros").select("numero, mes_ano, dias");
    if (data.mesAno) query = query.eq("mes_ano", data.mesAno);
    else if (data.ano) query = query.like("mes_ano", `%-${data.ano}`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
      numero: String(r.numero),
      mesIndex: Number(String(r.mes_ano).split("-")[0]) - 1,
      dias: (r.dias ?? {}) as Record<string, Record<string, number>>,
    }));
  });

export const excluirMembro = createServerFn({ method: "POST" })
  .inputValidator((input: { senha: string; numero: string }) => input)
  .handler(async ({ data }) => {
    validarSenha(data.senha);
    const { getAdminClient } = await import("@/lib/supabase-admin.server");
    const supabaseAdmin = getAdminClient();
    const { error } = await supabaseAdmin
      .from("registros")
      .delete()
      .eq("numero", data.numero);
    if (error) throw new Error(error.message);

    // Remove também as passkeys e a conta de login, obrigando novo cadastro.
    await supabaseAdmin.from("passkeys").delete().eq("numero", data.numero);

    const email = `${data.numero}@tesouro.local`;
    const { data: usuarios } = await supabaseAdmin.auth.admin.listUsers();
    const conta = usuarios?.users?.find((u) => u.email === email);
    if (conta) {
      const { error: erroAuth } = await supabaseAdmin.auth.admin.deleteUser(conta.id);
      if (erroAuth) throw new Error(erroAuth.message);
    }

    return { ok: true };
  });

export const verificarSenhaModerador = createServerFn({ method: "POST" })
  .inputValidator((input: { senha: string }) => input)
  .handler(async ({ data }) => {
    const esperada = process.env["MODERADOR_SENHA"] ?? "responsavel2026";
    return { ok: data.senha === esperada };
  });

/** Diagnóstico: confirma se o servidor enxerga as variáveis e acessa a tabela. */
export const diagnosticoBackend = createServerFn({ method: "POST" })
  .inputValidator((input: { senha: string }) => input)
  .handler(async ({ data }) => {
    validarSenha(data.senha);
    const temUrl = Boolean(process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"]);
    const temChave = Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
    try {
      const { getAdminClient } = await import("@/lib/supabase-admin.server");
      const { count, error } = await getAdminClient()
        .from("registros")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return { temUrl, temChave, registros: count ?? 0, erro: null as string | null };
    } catch (e) {
      return {
        temUrl,
        temChave,
        registros: null as number | null,
        erro: e instanceof Error ? e.message : String(e),
      };
    }
  });
