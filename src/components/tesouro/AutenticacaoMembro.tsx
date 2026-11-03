import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { COR, criarConta, entrarComNumero } from "@/lib/tesouro";
import { ShieldMark } from "./Shared";

export function AutenticacaoMembro({
  onEntrou,
  onVoltar,
}: {
  onEntrou: () => void;
  onVoltar: () => void;
}) {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [numero, setNumero] = useState("");
    const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);


  const enviar = async () => {
    setErro("");
    if (!numero.trim()) return setErro("Informe o seu número.");
    if (senha.length < 6) return setErro("A senha deve ter ao menos 6 caracteres.");
    if (modo === "criar" && senha !== confirmar) return setErro("As senhas não conferem.");
    setCarregando(true);
    try {
      if (modo === "criar") {
        await criarConta(numero, senha);
        await entrarComNumero(numero, senha);
      } else {
        await entrarComNumero(numero, senha);
      }
      onEntrou();
    } catch (e) {
      const msg = String((e as Error)?.message ?? "");
      if (/already registered|already exists/i.test(msg))
        setErro("Já existe uma conta com esse número. Escolha “Já tenho conta”.");
      else if (/Invalid login credentials/i.test(msg))
        setErro("Número ou senha incorretos.");
      else setErro("Não foi possível concluir agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-8" style={{ background: COR.cream }}>
      <div className="max-w-sm mx-auto">
        <button onClick={onVoltar} className="text-sm mb-6" style={{ color: COR.navy }}>
          ← Voltar
        </button>
        <div className="flex items-center gap-3 mb-6">
          <ShieldMark size={44} />
          <div>
            <h2 className="text-lg leading-tight" style={{ color: COR.navyDeep, fontFamily: "Georgia, serif" }}>
              {modo === "criar" ? "Criar meu acesso" : "Entrar"}
            </h2>
            <p className="text-xs" style={{ color: `${COR.navyDeep}99` }}>
              Só o seu número e uma senha — sem nome
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {(["entrar", "criar"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setModo(k);
                setErro("");
              }}
              className="flex-1 py-2 rounded-lg text-sm border"
              style={{
                background: modo === k ? COR.navy : "transparent",
                color: modo === k ? COR.ivory : COR.navyDeep,
                borderColor: `${COR.navy}33`,
              }}
            >
              {k === "entrar" ? "Já tenho conta" : "Criar conta"}
            </button>
          ))}
        </div>

        <label className="block text-sm mb-1.5" style={{ color: COR.navyDeep }}>
          Seu número de identificação
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={numero}
          onChange={(e) => setNumero(e.target.value.replace(/[^0-9A-Za-z-]/g, ""))}
          placeholder="ex.: 07"
          className="w-full px-4 py-3 rounded-lg border text-base mb-4 outline-none"
          style={{ borderColor: `${COR.navy}33`, background: COR.ivory, color: COR.ink }}
        />

        <label className="block text-sm mb-1.5" style={{ color: COR.navyDeep }}>Senha</label>
                <div className="relative mb-4">
          <input
            type={mostrarSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && modo === "entrar" && enviar()}
            className="w-full px-4 py-3 pr-12 rounded-lg border text-base outline-none"
            style={{ borderColor: `${COR.navy}33`, background: COR.ivory, color: COR.ink }}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((visivel) => !visivel)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            style={{ color: COR.navyDeep }}
          >
            {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {modo === "criar" && (
          <>
            <label className="block text-sm mb-1.5" style={{ color: COR.navyDeep }}>Confirmar senha</label>
                        <div className="relative mb-4">
              <input
                type={mostrarConfirmar ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-lg border text-base outline-none"
                style={{ borderColor: `${COR.navy}33`, background: COR.ivory, color: COR.ink }}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar((visivel) => !visivel)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={mostrarConfirmar ? "Ocultar senha" : "Mostrar senha"}
                title={mostrarConfirmar ? "Ocultar senha" : "Mostrar senha"}
                style={{ color: COR.navyDeep }}
              >
                {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </>
        )}

        {erro && <p className="text-sm mb-3" style={{ color: "#8A1F1F" }}>{erro}</p>}

        <button
          disabled={carregando}
          onClick={enviar}
          className="w-full py-3.5 rounded-lg font-medium text-base transition active:scale-[0.98] disabled:opacity-50"
          style={{ background: COR.navy, color: COR.ivory }}
        >
          {carregando ? "Aguarde..." : modo === "criar" ? "Criar e entrar" : "Entrar"}
        </button>


        <p className="mt-6 text-xs leading-relaxed" style={{ color: `${COR.navyDeep}99` }}>
          Cada membro vê apenas o seu próprio tesouro espiritual. Guarde bem a sua senha:
          se esquecer, peça ao responsável para criar uma nova senha para você.
        </p>
      </div>
    </div>
  );
}
