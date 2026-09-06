import { COR } from "@/lib/tesouro";

export type ItemRanking = { numero: string; total: number };

export function Ranking({
  itens,
  destaque,
  titulo,
  legenda,
}: {
  itens: ItemRanking[];
  destaque?: string;
  titulo: string;
  legenda?: string;
}) {
  if (itens.length === 0) {
    return (
      <p className="text-sm" style={{ color: `${COR.navyDeep}99` }}>
        Ainda não há devoções lançadas para montar a classificação.
      </p>
    );
  }

  const maior = Math.max(...itens.map((i) => i.total), 1);

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
      <h3 className="text-sm font-semibold mb-1" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>
        {titulo}
      </h3>
      {legenda && (
        <p className="text-[11px] mb-3" style={{ color: `${COR.navyDeep}88` }}>
          {legenda}
        </p>
      )}
      <ol className="space-y-1.5">
        {itens.map((item, i) => {
          const meu = destaque && item.numero === destaque;
          const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <li
              key={item.numero}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{
                background: meu ? COR.goldSoft : i % 2 === 0 ? COR.cream : "transparent",
                border: meu ? `1px solid ${COR.gold}` : "1px solid transparent",
              }}
            >
              <span className="w-8 text-sm font-semibold text-right" style={{ color: COR.navyDeep }}>
                {medalha ?? `${i + 1}º`}
              </span>
              <span className="text-sm" style={{ color: COR.navyDeep }}>
                Nº {item.numero}
                {meu ? " (você)" : ""}
              </span>
              <span className="flex-1 h-2 rounded-full mx-1" style={{ background: `${COR.navy}14` }}>
                <span
                  className="block h-2 rounded-full"
                  style={{ width: `${Math.max(4, (item.total / maior) * 100)}%`, background: COR.navy }}
                />
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: COR.navyDeep }}>
                {item.total}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
