import type { AccessMode } from "@/features/access/contracts";
import type {
  DiscordWebhookPayload,
  NotificationEventType,
  NotificationRecipient,
} from "./contracts";

const titles: Record<NotificationEventType, string> = {
  account_created: "New Outfitted account",
  first_garment_added: "First garment added",
};

const unnamedMember = "Unnamed member";

/**
 * Masks the local part of an address so staff notification channels can identify a
 * member without exposing the full address in a third-party service.
 */
export function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}

function adminUsersLink(nextAuthUrl: string | undefined) {
  const base = nextAuthUrl?.trim().replace(/\/+$/, "");
  return base ? `${base}/admin/users` : undefined;
}

export type FormatNotificationInput = {
  event: NotificationEventType;
  member: NotificationRecipient;
  accessMode?: AccessMode;
  nextAuthUrl?: string;
  now: Date;
};

export function formatDiscordNotification({
  event,
  member,
  accessMode,
  nextAuthUrl,
  now,
}: FormatNotificationInput): DiscordWebhookPayload {
  const occurredAt =
    event === "account_created" ? member.createdAt : (member.firstGarmentAddedAt ?? now);
  const link = adminUsersLink(nextAuthUrl);
  return {
    embeds: [
      {
        title: titles[event],
        ...(link ? { description: `[Review member access](${link})` } : {}),
        timestamp: occurredAt.toISOString(),
        fields: [
          { name: "Member", value: member.name?.trim() || unnamedMember, inline: true },
          { name: "Email", value: maskEmail(member.email), inline: true },
          { name: "When (UTC)", value: occurredAt.toISOString() },
          ...(event === "account_created" && accessMode
            ? [{ name: "Access mode", value: accessMode, inline: true }]
            : []),
        ],
      },
    ],
  };
}
