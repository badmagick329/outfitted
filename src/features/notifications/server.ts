import { getAccessMode } from "@/features/access/settings";
import { enqueueDiscordNotification } from "@/lib/jobs";
import { NotificationService } from "./application/notification-service";
import { sendDiscordNotification, isDiscordConfigured } from "./infrastructure/discord-webhook";
import { findNotificationRecipient } from "./infrastructure/drizzle-notification-recipient";

export const notificationService = new NotificationService({
  enqueue: enqueueDiscordNotification,
  isEnabled: isDiscordConfigured,
  findRecipient: findNotificationRecipient,
  getAccessMode,
  deliver: sendDiscordNotification,
  nextAuthUrl: process.env.NEXTAUTH_URL,
});
