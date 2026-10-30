import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { COR } from "@/lib/tesouro";
import { ativarPush, desativarPush, tokenSalvo } from "@/lib/push";
import { cancelarDispositivo, registrarDispositivo } from "@/lib/push.functions";

const MENSAGENS: Record<string, string> = {
  "nao-configurado": "As notificações ainda não estão configuradas. Avise o responsável.",
  "nao-suportado": "Este navegador não aceita notificações. No Android use o Chrome; no iPhone, instale o app na tela inicial.",
  "abrir-nova-aba": "Abra o aplicativo em uma aba própria (ou pelo ícone da tela inicial) para ativar.",
  negado: "As notificações foram bloqueadas. Libere nas configurações do navegador para este site e tente de novo.",
  "ios-instalar": "No iPhone: toque em Compartilhar → “Adicionar à Tela de Início”, abra o app pelo ícone e ative aqui.",
};

export function AtivarNotificacoes() {
  const [ativo, setAtivo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const registrar = useServerFn(registrarDispositivo);
  const cancelar = useServerFn(cancelarDispositivo);

  useEffect(() => {
    setAtivo(Boolean(tokenSalvo()) && "Notification" in window && Notification.permission === "granted");
  }, []);

  const ativar = async () => {
    setOcupado(true);
    setAviso("");
    try {
      const r = await ativarPush();
      if (r.status === "registrado") {
        await registrar({ data: { token: r.token, plataforma: navigator.userAgent } });
        setAtivo(true);
        setAviso("Pronto! Você receberá os avisos da Congregação neste aparelho.");
      } else setAviso(MENSAGENS[r.status] ?? "");
    } catch (e) {
      setAviso(`Não foi possível ativar agora. ${e instanceof Error ? e.message : ""}`);
    } finally {
      setOcupado(false);
    }
  };

  const desativar = async () => {
    setOcupado(true);
    try {
      const token = await desativarPush();
      if (token) await cancelar({ data: { token } });
      setAtivo(false);
      setAviso("Notificações desativadas neste aparelho.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${COR.gold}66`, background: COR.ivory }}>
      <p className="text-sm font-semibold" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>
        Avisos da Congregação
      </p>
      <p className="text-xs mt-1" style={{ color: `${COR.navyDeep}bb` }}>
        {ativo
          ? "As notificações estão ativas neste aparelho."
          : "Receba no celular os comunicados de missas, reuniões e eventos. Ao tocar em ativar, o celular vai pedir sua permissão — toque em “Permitir”."}
      </p>
      <button
        onClick={ativo ? desativar : ativar}
        disabled={ocupado}
        className="mt-2 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
        style={ativo ? { border: `1px solid ${COR.navy}55`, color: COR.navyDeep } : { background: COR.navy, color: COR.ivory }}
      >
        {ocupado ? "Aguarde…" : ativo ? "Desativar notificações" : "Ativar notificações"}
      </button>
      {aviso && <p className="text-xs mt-2" style={{ color: COR.navyDeep }}>{aviso}</p>}
    </div>
  );
}
