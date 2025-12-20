import { Page } from "../../types.ts";
import { DiscordConfig, NotificationServiceHandler } from "./types.ts";

/**
 * Discord通知サービス
 */
export class DiscordService implements NotificationServiceHandler {
  constructor(private readonly config: DiscordConfig) {}

  /**
   * メッセージを整形して送信
   */
  async send(pages: Page[]): Promise<void> {
    const message = this.formatMessage(pages);
    await this.sendToDiscord(message);
  }

  /**
   * Discord用メッセージフォーマット
   */
  private formatMessage(pages: Page[]): string {
    if (pages.length === 0) {
      return "更新されたページはありません。";
    }

    let message = `📝 **ページ更新通知** (${pages.length}件)\n\n`;

    for (const page of pages) {
      message += `**${page.name}**\n`;
      message += `📌 プロジェクト: ${page.projectName}\n`;
      message += `👤 著者: ${page.authors.join(", ")}\n`;
      message += `🔗 ${page.link}\n`;
      message += `🕒 ${page.updatedAt}\n\n`;
    }

    return message;
  }

  /**
   * Discord Webhookへ送信
   */
  private async sendToDiscord(message: string): Promise<void> {
    console.log("=== Discord Message ===");
    console.log(message);
    console.log("=======================");

    if (!this.config.webhookUrl) {
      console.log("Discord webhook URL not configured, skipping actual send");
      return;
    }

    await fetch(this.config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  }
}
