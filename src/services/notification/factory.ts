import { NotificationService } from "../../types.ts";
import { DiscordService } from "./discord.service.ts";
import { XService } from "./x.service.ts";
import {
  DiscordConfig,
  NotificationConfig,
  NotificationServiceHandler,
  XConfig,
} from "./types.ts";

/**
 * 通知サービスのファクトリー
 */
export class NotificationFactory {
  static create(
    service: NotificationService,
    config: NotificationConfig,
  ): NotificationServiceHandler {
    switch (service) {
      case "Discord":
        return new DiscordService(config as DiscordConfig);
      case "X":
        return new XService(config as XConfig);
      default:
        throw new Error(`Unknown notification service: ${service}`);
    }
  }
}
