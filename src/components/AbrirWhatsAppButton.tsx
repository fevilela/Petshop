"use client";

/**
 * Link "Abrir no WhatsApp" que também dispara a marcação de "notificado" no
 * clique — precisa ser client component pra poder reagir ao onClick e
 * chamar a Server Action antes/junto de abrir o link (o `<a target="_blank">`
 * puro não tem como disparar nada além da navegação).
 *
 * Server Actions passadas como prop pra um Client Component funcionam
 * normalmente no App Router (o Next serializa a referência) — por isso
 * `marcarNotificadoAction` chega já vinculada ao id da cobrança, igual às
 * outras actions usadas em CobrancaPainel.
 *
 * Não bloqueamos nem esperamos a action terminar pra abrir o link: a
 * marcação é "best effort" (só um lembrete visual, não confirmação de
 * entrega — ver comentário em src/lib/cobranca.ts), então não faz sentido
 * atrasar o clique do atendente por causa dela.
 */
export default function AbrirWhatsAppButton({
  href,
  marcarNotificadoAction,
}: {
  href: string;
  marcarNotificadoAction: () => Promise<void>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="btn-secondary text-sm"
      onClick={() => {
        marcarNotificadoAction().catch((err) => {
          console.error("[AbrirWhatsAppButton] Falha ao marcar como notificado:", err);
        });
      }}
    >
      Abrir no WhatsApp
    </a>
  );
}
