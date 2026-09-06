import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  COLUMNS,
  COR,
  MESES,
  calcularTotais,
  mesAnoKey,
  type Dias,
} from "@/lib/tesouro";
import {
  consolidadoModerador,
  excluirMembro,
  diagnosticoBackend,
} from "@/lib/moderador.functions";
import { ShieldMark } from "./Shared";
import { GraficosModerador, type RegistroAno } from "./GraficosModerador";

export function PainelModerador({ senha, onSair }: { senha: string; onSair: () => void }) {
  const hoje = new Date();
  const [mesIndex, setMesIndex] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [aba, setAba] = useState<"tabela" | "graficos" | "comparativos">("tabela");
  const [carregando, setCarregando] = useState(true);
  const [registros, setRegistros] = useState<{ numero: string; dias: Dias }[]>([]);
  const [anoDados, setAnoDados] = useState<RegistroAno[]>([]);
  const [erro, setErro] = useState("");
  const buscar = useServerFn(consolidadoModerador);
  const excluir = useServerFn(excluirMembro);
  const diagnosticar = useServerFn(diagnosticoBackend);
  const [excluindo, setExcluindo] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const doMes = await buscar({
  data: { senha, mesAno: mesAnoKey(mesIndex, ano) },
});

const doAno = await buscar({
  data: { senha, ano },
});
      setRegistros(
        doMes
          .map((r) => ({ numero: r.numero, dias: (r.dias || {}) as Dias }))
          .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true })),
      );
      setAnoDados(doAno.map((r) => ({ ...r, dias: (r.dias || {}) as Dias })));
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : "";
      setErro(
        detalhe
          ? `Não foi possível carregar os dados agora. (${detalhe})`
          : "Não foi possível carregar os dados agora.",
      );
    } finally {
      setCarregando(false);
    }
  }, [mesIndex, ano, senha, buscar]);

    useEffect(() => {
    carregar();
  }, [carregar]);





  const removerMembro = async (num: string) => {
    if (!window.confirm(`Excluir todos os registros do nº ${num}? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(num);
    try {
      await excluir({ data: { senha, numero: num } });
      await carregar();
    } catch {
      setErro("Não foi possível excluir esse número agora.");
    } finally {
      setExcluindo("");
    }
  };

  const totalPorMembro = useMemo(
    () => registros.map((r) => ({ numero: r.numero, totais: calcularTotais(r.dias) })),
    [registros],
  );

  const totalGeral = useMemo(() => {
    const t: Record<string, number> = {};
    COLUMNS.forEach((c) => (t[c.id] = 0));
    totalPorMembro.forEach((m) => {
      COLUMNS.forEach((c) => (t[c.id] = (t[c.id] ?? 0) + (m.totais[c.id] || 0)));
    });
    return t;
  }, [totalPorMembro]);

  return (
    <div className="min-h-screen pb-16" style={{ background: COR.cream }}>
      <div className="px-4 pt-5 pb-4" style={{ background: COR.navyDeep }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldMark size={34} />
            <span style={{ color: COR.ivory, fontFamily: "Georgia, serif" }}>Consolidado</span>
          </div>
          <button onClick={onSair} className="text-sm" style={{ color: COR.goldSoft }}>Sair</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={mesIndex}
            onChange={(e) => setMesIndex(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: COR.ivory, color: COR.ink }}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value) || hoje.getFullYear())}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: COR.ivory, color: COR.ink }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          {(["tabela", "graficos", "comparativos"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: aba === k ? COR.goldSoft : "transparent",
                color: aba === k ? COR.navyDeep : COR.goldSoft,
                border: `1px solid ${aba === k ? COR.goldSoft : `${COR.goldSoft}66`}`,
              }}
            >
              {k === "tabela" ? "Tabela" : k === "graficos" ? "Gráficos do mês" : "Comparativos"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {carregando ? (
          <p className="text-sm" style={{ color: COR.navyDeep }}>Carregando registros…</p>
        ) : erro ? (
          <p className="text-sm" style={{ color: "#8A1F1F" }}>{erro}</p>
        ) : aba === "graficos" ? (
          <GraficosModerador registrosMes={registros} anoDados={anoDados} mesIndex={mesIndex} ano={ano} modo="mes" />
        ) : aba === "comparativos" ? (
          <GraficosModerador registrosMes={registros} anoDados={anoDados} mesIndex={mesIndex} ano={ano} modo="comparativo" />
        ) : registros.length === 0 ? (
          <p className="text-sm" style={{ color: `${COR.navyDeep}99` }}>
            Nenhum membro registrou o tesouro espiritual em {MESES[mesIndex]}/{ano} ainda.
          </p>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: `${COR.navyDeep}99` }}>
              {registros.length} {registros.length === 1 ? "membro registrado" : "membros registrados"} — identificados apenas por número.
            </p>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: `${COR.navy}22` }}>
              <table className="border-collapse" style={{ minWidth: 780 }}>
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-10 px-2 py-2 text-xs font-medium text-left"
                      style={{ background: COR.navy, color: COR.ivory, minWidth: 60 }}
                    >
                      Nº
                    </th>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.id}
                        title={c.full}
                        className="px-2 py-2 text-[11px] font-medium text-center whitespace-nowrap"
                        style={{ background: COR.navy, color: COR.ivory, minWidth: 58 }}
                      >
                        {c.short}
                      </th>
                    ))}
                    <th
                      className="px-2 py-2 text-[11px] font-medium text-center"
                      style={{ background: COR.navy, color: COR.ivory, minWidth: 60 }}
                    >
                      Excluir
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {totalPorMembro.map((m, idx) => (
                    <tr key={m.numero} style={{ background: idx % 2 === 0 ? COR.ivory : COR.cream }}>
                      <td
                        className="sticky left-0 z-10 px-2 py-1.5 text-sm font-medium"
                        style={{ background: idx % 2 === 0 ? COR.ivory : COR.cream, color: COR.navyDeep }}
                      >
                        {m.numero}
                      </td>
                      {COLUMNS.map((c) => (
                        <td key={c.id} className="px-2 py-1.5 text-center text-sm" style={{ color: COR.navyDeep }}>
                          {m.totais[c.id]}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => removerMembro(m.numero)}
                          disabled={excluindo === m.numero}
                          className="text-xs px-2 py-1 rounded-md border disabled:opacity-50"
                          style={{ borderColor: "#8A1F1F55", color: "#8A1F1F" }}
                        >
                          {excluindo === m.numero ? "…" : "Excluir"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      className="sticky left-0 z-10 px-2 py-2 text-sm font-semibold"
                      style={{ background: COR.goldSoft, color: COR.navyDeep }}
                    >
                      Geral
                    </td>
                    {COLUMNS.map((c) => (
                      <td
                        key={c.id}
                        className="px-2 py-2 text-center text-sm font-semibold"
                        style={{ background: COR.goldSoft, color: COR.navyDeep }}
                      >
                        {totalGeral[c.id]}
                      </td>
                    ))}
                    <td style={{ background: COR.goldSoft }} />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
        <button
          onClick={carregar}
          className="mt-4 text-sm px-4 py-2 rounded-lg border"
          style={{ borderColor: `${COR.navy}33`, color: COR.navyDeep }}
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
