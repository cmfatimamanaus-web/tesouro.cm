/** Categorias de comunicados. Hoje o envio vai a todos; a estrutura permite segmentar no futuro. */
export const CATEGORIAS = [
  { id: "geral", nome: "Avisos gerais" },
  { id: "missas", nome: "Missas e celebrações" },
  { id: "reunioes", nome: "Reuniões" },
  { id: "formacao", nome: "Formação" },
  { id: "eventos", nome: "Eventos" },
  { id: "urgente", nome: "Comunicados urgentes" },
] as const;

export const CATEGORIAS_IDS: string[] = CATEGORIAS.map((c) => c.id);
