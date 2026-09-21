export const notificationEventTypes = ["account_created", "first_garment_added"] as const;

export type NotificationEventType = (typeof notificationEventTypes)[number];

/**
 * Internal pg-boss payload. Carries only the event and the user it concerns so the
 * worker can look up a fresh profile at execution time instead of trusting stale data.
 */
export type NotificationJobData = {
  event: NotificationEventType;
  userId: string;
};

export type NotificationRecipient = {
  name: string | null;
  email: string;
  createdAt: Date;
  firstGarmentAddedAt: Date | null;
};

export type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type DiscordWebhookPayload = {
  embeds: Array<{
    title: string;
    description?: string;
    timestamp: string;
    fields: DiscordEmbedField[];
  }>;
};
