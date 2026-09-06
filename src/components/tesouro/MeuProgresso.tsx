import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  COLUMNS,
  COR,
  MESES,
  calcularTotais,
  contarDiasCumpridos,
  diasNoMes,
  mesAnoKey,
  type Dias,
} from "@/lib/tesouro";
import { meusRegistrosDoAno, rankingMembros } from "@/lib/ranking.functions";
import { Ranking, type ItemRanking } from "./Ranking";

type MesDoAno = { mesIndex: number; dias: Dias };

export function MeuProgresso({
  numero,
  mesIndex,
  ano,
  onVoltar,
}: {
  numero: string;
  mesIndex: number;
  ano: number;
  onVoltar: () => void;
}) {
  const [aba, setAba] = useState<"mes" | "ano" | "ranking">("mes");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [meses, setMeses] = useState<MesDoAno[]>([]);
  const [rank, setRank] = useState<ItemRanking[]>([]);
  const [escopoRank, setEscopoRank] = useState<"ano" | "mes">("ano");

  const buscarAno = useServerFn(meusRegistrosDoAno);
  const buscarRank = useServerFn(rankingMembros);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro("");
    Promise.all([
      buscarAno({ data: { ano } }),
      buscarRank({
        data: escopoRank === "mes" ? { ano, mesAno: mesAnoKey(mesIndex, ano) } : { ano },
      }),
    ])
      .then(([anoDados, ranking]) => {
        if (!ativo) return;
        setMeses(anoDados.map((r) => ({ mesIndex: r.mesIndex, dias: r.dias as Dias })));
        setRank(ranking);
      })
      .catch(() => ativo && setErro("Não foi possível carregar seus gráficos agora."))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [ano, mesIndex, escopoRank, buscarAno, buscarRank]);

  const diasDoMes = useMemo(
    () => meses.find((m) => m.mesIndex === mesIndex)?.dias ?? {},
    [meses, mesIndex],
  );

  const dadosMes = useMemo(() => {
    const cumpridos = contarDiasCumpridos(diasDoMes);
    const totais = calcularTotais(diasDoMes);
    const base = diasNoMes(mesIndex, ano);
    return COLUMNS.map((c) => ({
      nome: c.short,
      completo: c.full,
      dias: cumpridos[c.id] ?? 0,
      quantidade: totais[c.id] ?? 0,
      percentual: base > 0 ? Math.round(((cumpridos[c.id] ?? 0) / base) * 1000) / 10 : 0,
    }));
  }, [diasDoMes, mesIndex, ano]);

  const dadosAno = useMemo(
    () =>
      MESES.map((nome, i) => {
        const reg = meses.find((m) => m.mesIndex === i);
        const totais = calcularTotais(reg?.dias);
        const total = COLUMNS.reduce((s, c) => s + (totais[c.id] ?? 0), 0);
        const cumpridos = contarDiasCumpridos(reg?.dias);
        const base = diasNoMes(i, ano) * COLUMNS.length;
        const somaCumpridos = COLUMNS.reduce((s, c) => s + (cumpridos[c.id] ?? 0), 0);
        return {
          mes: nome.slice(0, 3),
          total,
          percentual: base > 0 ? Math.round((somaCumpridos / base) * 1000) / 10 : 0,
        };
      }),
    [meses, ano],
  );

  const totalAno = dadosAno.reduce((s, d) => s + d.total, 0);
  const totalMes = dadosMes.reduce((s, d) => s + d.quantidade, 0);
  const posicao = rank.findIndex((r) => r.numero === numero) + 1;

  return (
    <div className="min-h-screen pb-16" style={{ background: COR.cream }}>
      <div className="px-4 pt-5 pb-4" style={{ background: COR.navyDeep }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onVoltar} className="text-sm" style={{ color: COR.goldSoft }}>
            ← Voltar
          </button>
          <span className="text-sm" style={{ color: COR.ivory, fontFamily: "Georgia, serif" }}>
            Minha vida espiritual — Nº {numero}
          </span>
        </div>
        <div className="flex gap-3 text-xs" style={{ color: COR.goldSoft }}>
          <span>
            {MESES[mesIndex]}: <b style={{ color: COR.gold }}>{totalMes}</b>
          </span>
          <span>
            Ano {ano}: <b style={{ color: COR.gold }}>{totalAno}</b>
          </span>
          {posicao > 0 && (
            <span>
              Classificação: <b style={{ color: COR.gold }}>{posicao}º</b>
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          {(["mes", "ano", "ranking"] as const).map((k) => (
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
              {k === "mes" ? "Meu mês" : k === "ano" ? "Meu ano" : "Classificação"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {carregando ? (
          <p className="text-sm" style={{ color: COR.navyDeep }}>Carregando seus gráficos…</p>
        ) : erro ? (
          <p className="text-sm" style={{ color: "#8A1F1F" }}>{erro}</p>
        ) : aba === "mes" ? (
          <div className="rounded-xl border p-3" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>
              {MESES[mesIndex]} de {ano} — dias cumpridos por devoção
            </h3>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={dadosMes} margin={{ top: 8, right: 8, left: -18, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${COR.navy}22`} />
                  <XAxis dataKey="nome" angle={-40} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10, fill: COR.navyDeep }} />
                  <YAxis tick={{ fontSize: 10, fill: COR.navyDeep }} />
                  <Tooltip
                    formatter={(v: number, _n, p) => [`${v} dia(s) — ${p.payload.percentual}% do mês`, p.payload.completo]}
                  />
                  <Bar dataKey="dias" fill={COR.navy} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : aba === "ano" ? (
          <>
            <div className="rounded-xl border p-3" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>
                Crescimento mês a mês em {ano} — devoções lançadas
              </h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={dadosAno} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${COR.navy}22`} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: COR.navyDeep }} />
                    <YAxis tick={{ fontSize: 10, fill: COR.navyDeep }} />
                    <Tooltip formatter={(v: number) => [`${v}`, "Devoções"]} />
                    <Line type="monotone" dataKey="total" stroke={COR.navy} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>
                Constância geral (% dos dias com devoção cumprida)
              </h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={dadosAno} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${COR.navy}22`} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: COR.navyDeep }} />
                    <YAxis unit="%" tick={{ fontSize: 10, fill: COR.navyDeep }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Constância"]} />
                    <Bar dataKey="percentual" fill={COR.gold} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              {(["ano", "mes"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setEscopoRank(k)}
                  className="px-3 py-1.5 rounded-lg text-xs border"
                  style={{
                    background: escopoRank === k ? COR.navy : "transparent",
                    color: escopoRank === k ? COR.ivory : COR.navyDeep,
                    borderColor: `${COR.navy}44`,
                  }}
                >
                  {k === "ano" ? `Ano ${ano}` : `${MESES[mesIndex]}`}
                </button>
              ))}
            </div>
            <Ranking
              itens={rank}
              destaque={numero}
              titulo={escopoRank === "ano" ? `Classificação do ano ${ano}` : `Classificação de ${MESES[mesIndex]}`}
              legenda="Total de devoções realizadas. Os membros aparecem apenas pelo número."
            />
          </>
        )}
      </div>
    </div>
  );
}
