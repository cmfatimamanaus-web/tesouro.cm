import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { COR } from "@/lib/tesouro";
import { CATEGORIAS } from "@/lib/push-categorias";
import { enviarNotificacao, statusCentral } from "@/lib/push.functions";

type Historico = Awaited<ReturnType<typeof statusCentral>>["historico"][number];

const STATUS: Record<string, string> = {
  concluido: "Concluído",
  parcial: "Parcial (com falhas)",
  falhou: "Falhou",
  sem_inscritos: "Sem inscritos",
  enviando: "Enviando…",
};

export function CentralNotificacoes({ senha }: { senha: string }) {
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [url, setUrl] = useState("/");
  const [categoria, setCategoria] = useState("geral");
  const [inscritos, setInscritos] = useState<number | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const buscar = useServerFn(statusCentral);
  const enviar = useServerFn(enviarNotificacao);

  const carregar = useCallback(async () => {
    try {
      const r = await buscar({ data: { senha } });
      setInscritos(r.inscritos);
      setHistorico(r.historico);
    } catch (e) {
      setMsg(`Não foi possível carregar a central. ${e instanceof Error ? e.message : ""}`);
    }
  }, [buscar, senha]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const disparar = async () => {
    if (!titulo.trim() || !corpo.trim()) return setMsg("Preencha o título e a mensagem.");
    if (!window.confirm(`Enviar esta notificação para ${inscritos ?? 0} aparelho(s) inscrito(s)?`)) return;
    setEnviando(true);
    setMsg("");
    try {
      const r = await enviar({
        data: { senha, titulo, corpo, url, categoria, chaveEnvio: crypto.randomUUID() },
      });
      setMsg(
        r.total === 0
          ? "Nenhum aparelho inscrito ainda."
          : `Enviado: ${r.sucesso} de ${r.total} com sucesso${r.falhas ? `, ${r.falhas} falha(s)` : ""}${r.removidos ? `, ${r.removidos} aparelho(s) inválido(s) removido(s)` : ""}.`,
      );
      if (r.sucesso > 0) {
        setTitulo("");
        setCorpo("");
      }
      await carregar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setEnviando(false);
    }
  };

  const campo = "w-full px-3 py-2 rounded-lg text-sm outline-none border";
  const estiloCampo = { background: COR.ivory, color: COR.ink, borderColor: `${COR.navy}33` };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
        <p className="text-sm" style={{ color: COR.navyDeep }}>
          Aparelhos com notificações ativas: <b>{inscritos ?? "…"}</b>
        </p>
      </div>

      <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
        <p className="font-semibold" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>Nova notificação</p>
        <input className={campo} style={estiloCampo} maxLength={80} placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea className={campo} style={estiloCampo} maxLength={500} rows={4} placeholder="Mensagem" value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className={campo} style={estiloCampo} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input className={campo} style={estiloCampo} placeholder="Página ao tocar (ex.: /)" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>

        <div>
          <p className="text-xs mb-1" style={{ color: `${COR.navyDeep}99` }}>Prévia</p>
          <div className="flex gap-3 items-start rounded-xl p-3 shadow" style={{ background: "#fff", border: `1px solid ${COR.navy}22` }}>
            <img src="/tesouro-espiritual-icon-192.png" alt="" className="w-10 h-10 rounded-lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: COR.ink }}>{titulo || "Título da notificação"}</p>
              <p className="text-xs whitespace-pre-wrap" style={{ color: `${COR.ink}cc` }}>{corpo || "Conteúdo da mensagem aparecerá aqui."}</p>
            </div>
          </div>
        </div>

        <button
          onClick={disparar}
          disabled={enviando}
          className="w-full py-3 rounded-lg font-semibold disabled:opacity-60"
          style={{ background: COR.navyDeep, color: COR.gold }}
        >
          {enviando ? "Enviando…" : "Enviar para todos os inscritos"}
        </button>
        {msg && <p className="text-sm" style={{ color: COR.navyDeep }}>{msg}</p>}
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
        <p className="font-semibold mb-2" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>Histórico de envios</p>
        {historico.length === 0 ? (
          <p className="text-xs" style={{ color: `${COR.navyDeep}99` }}>Nenhuma notificação enviada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {historico.map((h) => (
              <li key={h.id} className="border-b pb-2 text-sm" style={{ borderColor: `${COR.navy}15`, color: COR.navyDeep }}>
                <div className="flex justify-between gap-2">
                  <b className="truncate">{h.titulo}</b>
                  <span className="text-xs whitespace-nowrap">{new Date(h.enviado_em).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-xs" style={{ color: `${COR.navyDeep}bb` }}>{h.corpo}</p>
                <p className="text-xs mt-1">
                  {STATUS[h.status] ?? h.status} — {h.sucesso}/{h.total} entregues
                  {h.falhas ? `, ${h.falhas} falha(s)` : ""}
                  {h.tokens_removidos ? `, ${h.tokens_removidos} removido(s)` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
