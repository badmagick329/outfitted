import type { AccessMode } from "@/features/access/contracts";
import type {
  DiscordWebhookPayload,
  NotificationEventType,
  NotificationJobData,
  NotificationRecipient,
} from "../domain/contracts";
import { formatDiscordNotification } from "../domain/message";

export type NotificationServiceDependencies = {
  enqueue: (data: NotificationJobData) => Promise<unknown>;
  isEnabled: () => boolean;
  findRecipient: (userId: string) => Promise<NotificationRecipient | null>;
  getAccessMode: () => Promise<AccessMode>;
  deliver: (payload: DiscordWebhookPayload) => Promise<void>;
  nextAuthUrl?: string;
  now?: () => Date;
};

/**
 * The application-facing notification boundary. Producing and processing both no-op when
 * Discord is unconfigured, so callers never need to know whether notifications are enabled.
 */
export class NotificationService {
  constructor(private readonly dependencies: NotificationServiceDependencies) {}

  async enqueue(event: NotificationEventType, userId: string) {
    if (!this.dependencies.isEnabled()) return;
    await this.dependencies.enqueue({ event, userId });
  }

  async process(data: NotificationJobData) {
    if (!this.dependencies.isEnabled()) return;
    const member = await this.dependencies.findRecipient(data.userId);
    if (!member) return;
    const accessMode =
      data.event === "account_created" ? await this.dependencies.getAccessMode() : undefined;
    const payload = formatDiscordNotification({
      event: data.event,
      member,
      accessMode,
      nextAuthUrl: this.dependencies.nextAuthUrl,
      now: this.dependencies.now?.() ?? new Date(),
    });
    await this.dependencies.deliver(payload);
  }
}
