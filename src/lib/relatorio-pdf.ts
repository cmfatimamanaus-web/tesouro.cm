import { COLUMNS, MESES, calcularTotais, type Dias } from "@/lib/tesouro";

type Reg = { numero: string; mesIndex: number; dias: Dias };

const NAVY: [number, number, number] = [27, 53, 96];
const GOLD: [number, number, number] = [228, 199, 102];

/** Gera e baixa o PDF com o resumo anual completo. */
export async function baixarRelatorioAnual(ano: number, anoDados: Reg[], graficos: HTMLElement | null) {
  const [{ jsPDF }, { default: autoTable }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("html2canvas-pro"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const nums = (s: string[]) => s.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text(`Tesouro Espiritual — Resumo do ano ${ano}`, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(90);
  const membros = nums([...new Set(anoDados.map((r) => r.numero))]);
  doc.text(
    `Congregação Mariana N. S. de Fátima · ${membros.length} membros com registro · gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    14,
    22,
  );

  const head = (primeira: string) => [[primeira, ...COLUMNS.map((c) => c.short), "Total"]];
  const estilo = {
    styles: { fontSize: 7, cellPadding: 1.2, halign: "center" as const },
    headStyles: { fillColor: NAVY, textColor: 255 },
    footStyles: { fillColor: GOLD, textColor: NAVY },
    columnStyles: { 0: { halign: "left" as const } },
  };
  const linha = (rotulo: string, t: Record<string, number>) => {
    const vals = COLUMNS.map((c) => t[c.id] ?? 0);
    return [rotulo, ...vals, vals.reduce((s, v) => s + v, 0)];
  };
  const somar = (regs: Reg[]) => {
    const t: Record<string, number> = {};
    regs.forEach((r) => {
      const x = calcularTotais(r.dias);
      COLUMNS.forEach((c) => (t[c.id] = (t[c.id] ?? 0) + (x[c.id] ?? 0)));
    });
    return t;
  };
  const geral = linha("Geral", somar(anoDados));

  // 1. Totais por mês
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("Totais de devoções por mês", 14, 30);
  autoTable(doc, {
    startY: 33,
    head: head("Mês"),
    body: MESES.map((m, i) => linha(m, somar(anoDados.filter((r) => r.mesIndex === i)))),
    foot: [geral],
    ...estilo,
  });

  // 2. Totais por membro no ano
  doc.addPage();
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(`Totais por membro em ${ano}`, 14, 14);
  autoTable(doc, {
    startY: 17,
    head: head("Nº"),
    body: membros.map((n) => linha(n, somar(anoDados.filter((r) => r.numero === n)))),
    foot: [geral],
    ...estilo,
  });

  // 3. Classificação anual e por mês
  doc.addPage();
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(`Classificação do ano ${ano}`, 14, 14);
  const total = (regs: Reg[]) => {
    const t = somar(regs);
    return COLUMNS.reduce((s, c) => s + (t[c.id] ?? 0), 0);
  };
  const rank = membros
    .map((n) => ({ n, t: total(anoDados.filter((r) => r.numero === n)) }))
    .sort((a, b) => b.t - a.t || a.n.localeCompare(b.n, undefined, { numeric: true }));
  autoTable(doc, {
    startY: 17,
    head: [["Posição", "Nº", "Total no ano", ...MESES.map((m) => m.slice(0, 3))]],
    body: rank.map((r, i) => [
      `${i + 1}º`,
      r.n,
      r.t,
      ...MESES.map((_, mi) => total(anoDados.filter((x) => x.numero === r.n && x.mesIndex === mi))),
    ]),
    ...estilo,
  });

  // 4. Gráficos
  if (graficos) {
    const blocos = Array.from(
      graficos.querySelectorAll<HTMLElement>("section.rounded-lg, section .grid > div"),
    );
    const margem = 10;
    let y = H; // força nova página
    for (const [i, el] of blocos.entries()) {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#FBF8F0" });
      const grande = i < 2;
      const larg = grande ? W - margem * 2 : (W - margem * 3) / 2;
      const alt = (canvas.height / canvas.width) * larg;
      const col = grande ? 0 : (i - 2) % 2;
      if (col === 0 && y + alt > H - margem) {
        doc.addPage();
        y = margem;
      }
      const x = margem + col * (larg + margem);
      doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", x, y, larg, alt);
      if (grande || col === 1) y += alt + 5;
    }
  }

  doc.save(`tesouro-espiritual-${ano}.pdf`);
}
