import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIAS_IDS } from "@/lib/push-categorias";

function validarSenha(senha: string) {
  const esperada = process.env["MODERADOR_SENHA"] ?? "responsavel2026";
  if (senha !== esperada) throw new Error("Senha incorreta.");
}

/** Membro autenticado registra o token deste aparelho. */
export const registrarDispositivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string; plataforma?: string }) => {
    if (typeof input?.token !== "string" || input.token.length < 20 || input.token.length > 4096)
      throw new Error("Token inválido.");
    return { token: input.token, plataforma: String(input.plataforma ?? "").slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    const email = String((context.claims as { email?: string }).email ?? "");
    const numero = email.endsWith("@tesouro.local") ? email.split("@")[0] : null;
    const { getAdminClient } = await import("@/lib/supabase-admin.server");
    const { error } = await getAdminClient()
      .from("push_inscricoes")
      .upsert(
        {
          token: data.token,
          user_id: context.userId,
          numero,
          plataforma: data.plataforma,
          ativo: true,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Membro desativa as notificações deste aparelho. */
export const cancelarDispositivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => ({ token: String(input?.token ?? "").slice(0, 4096) }))
  .handler(async ({ data, context }) => {
    const { getAdminClient } = await import("@/lib/supabase-admin.server");
    await getAdminClient()
      .from("push_inscricoes")
      .delete()
      .eq("token", data.token)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** Central de Notificações: total de inscritos + histórico. */
export const statusCentral = createServerFn({ method: "POST" })
  .inputValidator((input: { senha: string }) => input)
  .handler(async ({ data }) => {
    validarSenha(data.senha);
    const { getAdminClient } = await import("@/lib/supabase-admin.server");
    const db = getAdminClient();
    const { count } = await db
      .from("push_inscricoes")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true);
    const { data: historico, error } = await db
      .from("notificacoes_enviadas")
      .select("id, titulo, corpo, url, categoria, status, total, sucesso, falhas, tokens_removidos, erro, enviado_em")
      .order("enviado_em", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { inscritos: count ?? 0, historico: historico ?? [] };
  });

type EnvioInput = {
  senha: string;
  titulo: string;
  corpo: string;
  url?: string;
  categoria?: string;
  chaveEnvio: string;
};

/** Envia para todos os aparelhos inscritos via Firebase Cloud Messaging. */
export const enviarNotificacao = createServerFn({ method: "POST" })
  .inputValidator((input: EnvioInput) => {
    const titulo = String(input?.titulo ?? "").trim();
    const corpo = String(input?.corpo ?? "").trim();
    if (!titulo || titulo.length > 80) throw new Error("Título deve ter de 1 a 80 caracteres.");
    if (!corpo || corpo.length > 500) throw new Error("Mensagem deve ter de 1 a 500 caracteres.");
    let url = String(input?.url ?? "/").trim() || "/";
    if (!url.startsWith("/") || url.startsWith("//")) url = "/";
    const categoria = CATEGORIAS_IDS.includes(String(input?.categoria)) ? String(input.categoria) : "geral";
    const chaveEnvio = String(input?.chaveEnvio ?? "").slice(0, 100);
    if (chaveEnvio.length < 8) throw new Error("Chave de envio inválida.");
    return { senha: String(input.senha ?? ""), titulo, corpo, url, categoria, chaveEnvio };
  })
  .handler(async ({ data }) => {
    validarSenha(data.senha);
    const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
    const FCM_KEY = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!LOVABLE_API_KEY || !FCM_KEY) throw new Error("Firebase não está configurado no servidor.");

    const { getAdminClient } = await import("@/lib/supabase-admin.server");
    const db = getAdminClient();

    // Proteção contra envio duplicado: chave única por clique + bloqueio de repetição em 60s.
    const umMinuto = new Date(Date.now() - 60_000).toISOString();
    const { data: recente } = await db
      .from("notificacoes_enviadas")
      .select("id")
      .eq("titulo", data.titulo)
      .eq("corpo", data.corpo)
      .gte("enviado_em", umMinuto)
      .limit(1);
    if (recente && recente.length > 0)
      throw new Error("Essa mesma notificação acabou de ser enviada. Aguarde um minuto para repetir.");

    const { data: registro, error: erroIns } = await db
      .from("notificacoes_enviadas")
      .insert({
        titulo: data.titulo,
        corpo: data.corpo,
        url: data.url,
        categoria: data.categoria,
        chave_envio: data.chaveEnvio,
      })
      .select("id")
      .single();
    if (erroIns) {
      if (erroIns.code === "23505") throw new Error("Esse envio já foi processado.");
      throw new Error(erroIns.message);
    }

    const { data: inscricoes } = await db
      .from("push_inscricoes")
      .select("id, token")
      .eq("ativo", true)
      .contains("categorias", [data.categoria]);
    const lista = inscricoes ?? [];

    const origem = new URL(getRequest().url).origin;
    const link = `${origem}${data.url}`;
    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": FCM_KEY,
      "Content-Type": "application/json",
    };

    let sucesso = 0;
    let falhas = 0;
    const invalidos: string[] = [];
    let ultimoErro: string | null = null;

    const enviarUm = async (token: string) => {
      const res = await fetch(
        "https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: {
              token,
              notification: { title: data.titulo, body: data.corpo },
              data: { url: data.url, categoria: data.categoria },
              webpush: {
                notification: { icon: "/tesouro-espiritual-icon-192.png", badge: "/tesouro-espiritual-icon-192.png" },
                fcm_options: { link },
              },
            },
          }),
        },
      );
      if (res.ok) {
        sucesso++;
        return;
      }
      const corpo = await res.text();
      falhas++;
      ultimoErro = `[${res.status}] ${corpo.slice(0, 300)}`;
      console.error("FCM falhou", ultimoErro);
      if (res.status === 404 || (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT|registration token/i.test(corpo)))
        invalidos.push(token);
    };

    for (let i = 0; i < lista.length; i += 20) {
      await Promise.all(lista.slice(i, i + 20).map((r) => enviarUm(r.token)));
    }

    if (invalidos.length > 0) await db.from("push_inscricoes").delete().in("token", invalidos);

    const status = lista.length === 0 ? "sem_inscritos" : falhas === 0 ? "concluido" : sucesso === 0 ? "falhou" : "parcial";
    await db
      .from("notificacoes_enviadas")
      .update({
        status,
        total: lista.length,
        sucesso,
        falhas,
        tokens_removidos: invalidos.length,
        erro: falhas > 0 ? ultimoErro : null,
      })
      .eq("id", registro.id);

    return { status, total: lista.length, sucesso, falhas, removidos: invalidos.length };
  });
