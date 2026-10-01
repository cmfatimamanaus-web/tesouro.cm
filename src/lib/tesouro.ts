import { supabase } from "@/integrations/supabase/client";

export type ColunaTipo = "check" | "num";

export interface Coluna {
  id: string;
  short: string;
  full: string;
  type: ColunaTipo;
}

/* type: "check" = marcado/não marcado (conta 1 quando feito)
   type: "num"   = quantidade livre (ex.: partes do Ofício rezadas no dia) */
export const COLUMNS: Coluna[] = [
  { id: "oracaoManha", short: "Or. Manhã", full: "Oração da manhã", type: "check" },
  { id: "oracaoNoite", short: "Or. Noite", full: "Oração da noite", type: "check" },
  { id: "medit", short: "Medit.", full: "Meditação", type: "check" },
  { id: "exameCons", short: "Exame", full: "Exame de consciência", type: "check" },
  { id: "missa", short: "Missa", full: "Missa", type: "check" },
  { id: "comun", short: "Comun.", full: "Comunhão", type: "check" },
  { id: "visitaSSmo", short: "Vis. SSmo", full: "Visita ao Santíssimo", type: "check" },
  { id: "terco", short: "Terço", full: "Terço (nº de terços rezados no dia)", type: "num" },
  { id: "oficio", short: "Ofício", full: "Ofício (nº de partes rezadas no dia)", type: "num" },
  { id: "jejum", short: "Jejum", full: "Jejum", type: "check" },
  { id: "abst", short: "Abst.", full: "Abstinência", type: "check" },
  { id: "sacrif", short: "Sacrif.", full: "Sacrifício", type: "check" },
  { id: "devParti", short: "Dev. Parti.", full: "Devoção particular (nº de devoções feitas no dia)", type: "num" },
  { id: "confis", short: "Confis.", full: "Confissão", type: "check" },
];

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MODERADOR_SENHA_PADRAO = "responsavel2026";

export type Dias = Record<string, Record<string, number>>;

export const COR = {
  navy: "#1B3560",
  navyDeep: "#122343",
  gold: "#C9A227",
  goldSoft: "#E4C766",
  cream: "#F6F1E4",
  ivory: "#FBF8F0",
  ink: "#2A2A28",
};

export function diasNoMes(mesIndex: number, ano: number) {
  return new Date(ano, mesIndex + 1, 0).getDate();
}

export function mesAnoKey(mesIndex: number, ano: number) {
  return `${String(mesIndex + 1).padStart(2, "0")}-${ano}`;
}

export function entradaVazia(mesIndex: number, ano: number): Dias {
  const total = diasNoMes(mesIndex, ano);
  const dias: Dias = {};
  for (let d = 1; d <= total; d++) {
    const linha: Record<string, number> = {};
    COLUMNS.forEach((c) => {
      linha[c.id] = 0;
    });
    dias[String(d)] = linha;
  }
  return dias;
}

export function calcularTotais(dias: Dias | null | undefined) {
  const totais: Record<string, number> = {};
  COLUMNS.forEach((c) => (totais[c.id] = 0));
  Object.values(dias || {}).forEach((linha) => {
    COLUMNS.forEach((c) => {
      totais[c.id] = (totais[c.id] ?? 0) + Number(linha?.[c.id] || 0);
    });
  });
  return totais;
}

/* ============ Autenticação por número + senha ============ */

export function normalizarNumero(numero: string) {
  return numero.trim().toLowerCase().replace(/[^0-9a-z-]/g, "");
}

export function emailDoNumero(numero: string) {
  return `${normalizarNumero(numero)}@tesouro.local`;
}

export async function criarConta(numero: string, senha: string) {
  const { error } = await supabase.auth.signUp({
    email: emailDoNumero(numero),
    password: senha,
    options: { data: { numero: normalizarNumero(numero) } },
  });
  if (error) throw error;
}

export async function entrarComNumero(numero: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailDoNumero(numero),
    password: senha,
  });
  if (error) throw error;
}

export async function sairDaConta() {
  await supabase.auth.signOut();
}

export async function usuarioAtual() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const numero =
    (data.user.user_metadata?.["numero"] as string | undefined) ??
    String(data.user.email ?? "").split("@")[0] ??
    "";
  return { id: data.user.id, numero };
}

/* ============ Acesso aos dados (Lovable Cloud) ============ */

export async function carregarRegistro(mesIndex: number, ano: number) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sem sessão");
  const { data, error } = await supabase
    .from("registros")
    .select("dias")
    .eq("user_id", auth.user.id)
    .eq("mes_ano", mesAnoKey(mesIndex, ano))
    .maybeSingle();
  if (error) throw error;
  return (data?.dias as Dias | undefined) || null;
}

export async function salvarRegistro(
  numero: string,
  mesIndex: number,
  ano: number,
  dias: Dias,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sem sessão");
  const { error } = await supabase
    .from("registros")
    .upsert(
      { user_id: auth.user.id, numero, mes_ano: mesAnoKey(mesIndex, ano), dias },
      { onConflict: "user_id,mes_ano" },
    );
  if (error) throw error;
}


/* Dias em que a devoção foi cumprida (valor > 0) por coluna */
export function contarDiasCumpridos(dias: Dias | null | undefined) {
  const t: Record<string, number> = {};
  COLUMNS.forEach((c) => (t[c.id] = 0));
  Object.values(dias || {}).forEach((linha) => {
    COLUMNS.forEach((c) => {
      if (Number(linha?.[c.id] || 0) > 0) t[c.id] = (t[c.id] ?? 0) + 1;
    });
  });
  return t;
}

/* % de adesão: dias cumpridos / (membros x dias do mês) */
export function percentuaisDoMes(
  registros: { dias: Dias }[],
  mesIndex: number,
  ano: number,
) {
  const base = registros.length * diasNoMes(mesIndex, ano);
  const somas: Record<string, number> = {};
  COLUMNS.forEach((c) => (somas[c.id] = 0));
  registros.forEach((r) => {
    const c = contarDiasCumpridos(r.dias);
    COLUMNS.forEach((col) => (somas[col.id] = (somas[col.id] ?? 0) + (c[col.id] || 0)));
  });
  return COLUMNS.map((col) => ({
    id: col.id,
    nome: col.short,
    completo: col.full,
    percentual: base > 0 ? Math.round(((somas[col.id] ?? 0) / base) * 1000) / 10 : 0,
  }));
}


