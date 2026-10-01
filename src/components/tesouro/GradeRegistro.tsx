import React, {  useMemo, useState } from "react";
import { COLUMNS, COR, MESES,  calcularTotais, diasNoMes,  type Dias } from "@/lib/tesouro";
import { CelulaCheck, CelulaNumero } from "./Shared";

export function GradeRegistro({
  numero,
  mesIndex,
  ano,
  dias,
  carregando,
  onMudarPeriodo,
  onMudarDia,
  onVoltar,
  onVerProgresso,
  salvando,
  erro,
}: {
  numero: string;
  mesIndex: number;
  ano: number;
  dias: Dias;
  carregando?: boolean;
  onMudarPeriodo: (mesIndex: number, ano: number) => void;
  onMudarDia: (dia: number, colId: string, valor: number) => void;
  onVoltar: () => void;
  onVerProgresso?: () => void;
  salvando: boolean;
  erro: string;
}) {
  const totalDias = diasNoMes(mesIndex, ano);
  const totais = useMemo(() => calcularTotais(dias), [dias]);
  const totalGeral = COLUMNS.reduce((s, c) => s + (totais[c.id] || 0), 0);

  const [escalaTabela, setEscalaTabela] = useState(1);



  const gruposDecada = [
    { inicio: 1, fim: Math.min(10, totalDias), label: "1ª dezena" },
    { inicio: 11, fim: Math.min(20, totalDias), label: "2ª dezena" },
    { inicio: 21, fim: totalDias, label: "3ª dezena" },
  ].filter((g) => g.inicio <= totalDias);

  return (
    <div className="min-h-screen pb-24" style={{ background: COR.cream }}>
            <div
        className="z-20 px-4 pt-4 pb-3"
        style={{ background: COR.navyDeep, boxShadow: "0 2px 10px rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <button onClick={onVoltar} className="text-sm" style={{ color: COR.goldSoft }}>← Sair</button>
          <div className="text-right">
            <div className="text-sm" style={{ color: COR.ivory, fontFamily: "Georgia, serif" }}>
              Nº {numero}
            </div>
            <div className="text-xs" style={{ color: `${COR.ivory}99` }}>
              {carregando ? "Abrindo…" : `${MESES[mesIndex]} / ${ano}`}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select
            value={mesIndex}
            onChange={(e) => onMudarPeriodo(Number(e.target.value), ano)}
            className="px-2 py-1.5 rounded-md text-sm outline-none"
            style={{ background: COR.ivory, color: COR.ink }}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={ano}
            onChange={(e) => onMudarPeriodo(mesIndex, Number(e.target.value) || ano)}
            className="px-2 py-1.5 rounded-md text-sm outline-none"
            style={{ background: COR.ivory, color: COR.ink }}
          />
        </div>
                <div className="flex items-center justify-between text-xs" style={{ color: COR.goldSoft }}>
          <span>{salvando ? "Salvando…" : "Salvo"}</span>
          {onVerProgresso && (
            <button
              onClick={onVerProgresso}
              className="px-4 py-2 rounded-md text-sm font-semibold"
              style={{ background: COR.goldSoft, color: COR.navyDeep }}
            >
              Minha vida espiritual
            </button>
          )}
          <span>Total do mês: <b style={{ color: COR.gold }}>{totalGeral}</b></span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: COR.goldSoft }}>Zoom da tabela</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEscalaTabela((atual) => Math.max(0.8, atual - 0.1))}
              disabled={escalaTabela <= 0.8}
              className="h-7 w-7 rounded-md border text-base disabled:opacity-40"
              style={{ borderColor: `${COR.goldSoft}55`, color: COR.goldSoft }}
              aria-label="Diminuir zoom da tabela"
            >
              −
            </button>
            <span className="w-12 text-center text-xs" style={{ color: COR.ivory }}>
              {Math.round(escalaTabela * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setEscalaTabela((atual) => Math.min(1.2, atual + 0.1))}
              disabled={escalaTabela >= 1.2}
              className="h-7 w-7 rounded-md border text-base disabled:opacity-40"
              style={{ borderColor: `${COR.goldSoft}55`, color: COR.goldSoft }}
              aria-label="Aumentar zoom da tabela"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {erro && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-md text-sm" style={{ background: "#5C1A1A", color: "#FBEAEA" }}>
          {erro}
        </div>
      )}

      <div className="px-2 pt-3">
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: `${COR.navy}22` }}>
                    <table className="border-collapse" style={{ minWidth: 780, zoom: escalaTabela }}>
                        <thead className="sticky top-0 z-20">
              <tr>
                <th
                                    className="sticky left-0 z-30 px-2 py-2 text-xs font-medium text-left"
                  style={{ background: COR.navy, color: COR.ivory, minWidth: 44 }}
                >
                  Dia
                </th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.id}
                    title={c.full}
                    className="px-2 py-2 text-[11px] font-medium text-center whitespace-nowrap"
                    style={{ background: COR.navy, color: COR.ivory, minWidth: c.type === "num" ? 74 : 58 }}
                  >
                    {c.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruposDecada.map((g) => (
                <React.Fragment key={g.label}>
                  {Array.from({ length: g.fim - g.inicio + 1 }, (_, k) => g.inicio + k).map((d) => (
                    <tr key={d} style={{ background: d % 2 === 0 ? COR.ivory : COR.cream }}>
                      <td
                        className="sticky left-0 z-10 px-2 py-1.5 text-sm font-medium"
                        style={{ background: d % 2 === 0 ? COR.ivory : COR.cream, color: COR.navyDeep }}
                      >
                        {d}
                      </td>
                      {COLUMNS.map((c) => (
                        <td key={c.id} className="px-1.5 py-1.5 text-center">
                          {c.type === "check" ? (
                            <CelulaCheck
                              marcado={!!dias[String(d)]?.[c.id]}
                              onToggle={() => onMudarDia(d, c.id, dias[String(d)]?.[c.id] ? 0 : 1)}
                            />
                          ) : (
                            <CelulaNumero
                              valor={dias[String(d)]?.[c.id] || 0}
                              onChange={(v) => onMudarDia(d, c.id, v)}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr>
                <td
                  className="sticky left-0 z-10 px-2 py-2 text-sm font-semibold"
                  style={{ background: COR.goldSoft, color: COR.navyDeep }}
                >
                  Total
                </td>
                {COLUMNS.map((c) => (
                  <td
                    key={c.id}
                    className="px-2 py-2 text-center text-sm font-semibold"
                    style={{ background: COR.goldSoft, color: COR.navyDeep }}
                  >
                    {totais[c.id]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] mt-2 px-1" style={{ color: `${COR.navyDeep}88` }}>
          Toque no nome de uma coluna para ver o significado completo. Deslize a tabela para os lados para ver todas as devoções.
        </p>
      </div>
    </div>
  );
}
