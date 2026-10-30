// Registro do aparelho para notificações (somente no navegador).
const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as string | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as string | undefined;
const firebaseConfig = {
  apiKey: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as string) ?? "",
  projectId: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as string) ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResultado =
  | { status: "registrado"; token: string }
  | { status: "nao-configurado" | "nao-suportado" | "abrir-nova-aba" | "negado" | "ios-instalar" };

const CHAVE_TOKEN = "tesouro-push-token";

export function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
export function ehInstalado() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
export function tokenSalvo() {
  return localStorage.getItem(CHAVE_TOKEN);
}

/** Chamar a partir de um clique: o navegador exige ação do usuário. */
export async function ativarPush(): Promise<PushResultado> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !vapidKey || !firebaseConfig.messagingSenderId)
    return { status: "nao-configurado" };
  if (window.top !== window.self) return { status: "abrir-nova-aba" };
  if (ehIOS() && !ehInstalado()) return { status: "ios-instalar" };
  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported()))
    return { status: "nao-suportado" };

  const permissao =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permissao !== "granted") return { status: "negado" };

  const { initializeApp, getApps } = await import("firebase/app");
  const query = new URLSearchParams(firebaseConfig).toString();
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
  await navigator.serviceWorker.ready;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return { status: "negado" };
  localStorage.setItem(CHAVE_TOKEN, token);
  return { status: "registrado", token };
}

export async function desativarPush() {
  const token = tokenSalvo();
  try {
    const { getApps } = await import("firebase/app");
    const { getMessaging, deleteToken } = await import("firebase/messaging");
    const app = getApps()[0];
    if (app) await deleteToken(getMessaging(app));
  } catch {
    /* segue mesmo assim */
  }
  localStorage.removeItem(CHAVE_TOKEN);
  return token;
}
