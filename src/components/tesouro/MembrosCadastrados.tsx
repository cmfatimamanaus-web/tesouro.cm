import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { COR } from "@/lib/tesouro";
import {
  listarMembrosCadastrados,
  excluirMembro,
  redefinirSenhaMembro,
} from "@/lib/moderador.functions";

type Membro = { numero: string; cadastradoEm: string; ultimoAcesso: string | null; ultimoLancamento: string | null };

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function MembrosCadastrados({ senha }: { senha: string }) {
  const listar = useServerFn(listarMembrosCadastrados);
  const excluir = useServerFn(excluirMembro);
  const redefinir = useServerFn(redefinirSenhaMembro);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      setMembros(await listar({ data: { senha } }));
    } catch {
      setErro("Não foi possível carregar os cadastros agora.");
    } finally {
      setCarregando(false);
    }
  }, [listar, senha]);

  const removerMembro = async (num: string) => {
    if (!window.confirm(`Excluir o número ${num} e todos os seus registros? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(num);
    try {
      await excluir({ data: { senha, numero: num } });
      await carregar();
    } catch {
      window.alert("Não foi possível excluir esse número agora.");
    } finally {
      setExcluindo("");
    }
  };

  const redefinirSenha = async (num: string) => {
    const nova = window.prompt(`Nova senha para o nº ${num} (mínimo 6 caracteres):`);
    if (nova === null) return;
    if (nova.trim().length < 6) {
      window.alert("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    try {
      await redefinir({ data: { senha, numero: num, novaSenha: nova.trim() } });
      window.alert(`Senha do nº ${num} redefinida. Informe a nova senha ao membro.`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Não foi possível redefinir a senha agora.");
    }
  };

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) return <p className="text-sm" style={{ color: COR.navyDeep }}>Carregando cadastros…</p>;
  if (erro) return <p className="text-sm" style={{ color: "#8A1F1F" }}>{erro}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: COR.navyDeep }}>
          {membros.length} {membros.length === 1 ? "número cadastrado" : "números cadastrados"}
        </p>
        <button onClick={carregar} className="text-xs px-3 py-1.5 rounded-md border" style={{ borderColor: `${COR.navy}55`, color: COR.navy }}>
          Atualizar
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: `${COR.navy}22`, background: COR.ivory }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: COR.navy, color: COR.ivory }}>
              <th className="px-3 py-2 text-left text-xs font-medium">Nº</th>
              <th className="px-3 py-2 text-left text-xs font-medium">Cadastro</th>
              <th className="px-3 py-2 text-left text-xs font-medium">Último acesso</th>
              <th className="px-3 py-2 text-left text-xs font-medium">Último lançamento</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <tr key={m.numero} className="border-t" style={{ borderColor: `${COR.navy}15`, color: COR.navyDeep }}>
                <td className="px-3 py-2 font-semibold">{m.numero}</td>
                <td className="px-3 py-2">{fmt(m.cadastradoEm)}</td>
                <td className="px-3 py-2">{fmt(m.ultimoAcesso)}</td>
                <td className="px-3 py-2">{m.ultimoLancamento ? fmt(m.ultimoLancamento) : "Nenhum ainda"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
