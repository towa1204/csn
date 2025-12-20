import { TwitterApi } from "twitter-api-v2";
import { NotificationService, Page } from "./types.ts";

/**
 * 通知サービスの基底インターフェース
 */
export interface NotificationServiceHandler {
  send(pages: Page[]): Promise<void>;
}

/**
 * Discord通知サービス
 */
export class DiscordService implements NotificationServiceHandler {
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
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");

    console.log("=== Discord Message ===");
    console.log(message);
    console.log("=======================");

    if (!webhookUrl) {
      console.log("DISCORD_WEBHOOK_URL not set, skipping actual send");
      return;
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  }
}

/**
 * X(Twitter)通知サービス
 */
export class XService implements NotificationServiceHandler {
  /**
   * メッセージを整形して送信
   */
  async send(pages: Page[]): Promise<void> {
    const message = this.formatMessage(pages);
    await this.sendToX(message);
  }

  /**
   * X用メッセージフォーマット
   */
  private formatMessage(pages: Page[]): string {
    if (pages.length === 0) {
      return "更新されたページはありません。";
    }

    let message = `📝 ページ更新通知 (${pages.length}件)\n\n`;

    // URLは23文字(t.co短縮URL)として計算
    const URL_LENGTH = 23;

    for (const page of pages) {
      const authorsText = page.authors.slice(0, 2).join(", ");
      const moreAuthors = page.authors.length > 2
        ? ` 他${page.authors.length - 2}名`
        : "";

      const pageText = `${page.name}\nby ${authorsText}${moreAuthors}\n`;
      const pageEntry = pageText + `${page.link}\n\n`;

      // URLを考慮した文字数計算（実際のURL長ではなく23文字として計算）
      const currentLength = this.calculateTweetLength(message);
      const entryLength = this.calculateTweetLength(pageEntry);

      if (currentLength + entryLength > 280) {
        // 280文字を超える場合は「他N件」として省略
        const remaining = pages.length - pages.indexOf(page);
        if (remaining > 0) {
          message += `\n他${remaining}件の更新`;
        }
        break;
      }

      message += pageEntry;
    }

    return message.trim();
  }

  /**
   * ツイートの文字数を計算（URLは23文字として扱う）
   */
  private calculateTweetLength(text: string): number {
    // URLを検出して23文字に置き換えて計算
    const URL_REGEX = /https?:\/\/[^\s]+/g;
    const textWithReplacedUrls = text.replace(URL_REGEX, "x".repeat(23));
    return textWithReplacedUrls.length;
  }

  /**
   * X APIへ送信
   */
  private async sendToX(message: string): Promise<void> {
    console.log("=== X (Twitter) Post ===");
    console.log(message);
    console.log("========================");

    const apiKey = Deno.env.get("API_KEY");
    const apiKeySecret = Deno.env.get("API_KEY_SECRET");
    const accessToken = Deno.env.get("ACCESS_TOKEN");
    const accessTokenSecret = Deno.env.get("ACCESS_TOKEN_SECRET");

    if (!apiKey || !apiKeySecret || !accessToken || !accessTokenSecret) {
      console.log("X API credentials not set, skipping actual send");
      return;
    }

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiKeySecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    const rwClient = client.readWrite;
    const tweet = await rwClient.v2.tweet(message);

    console.log("Tweeted:", tweet.data);
  }
}

/**
 * 通知サービスのファクトリー
 */
export class NotificationFactory {
  static create(service: NotificationService): NotificationServiceHandler {
    switch (service) {
      case "Discord":
        return new DiscordService();
      case "X":
        return new XService();
      default:
        throw new Error(`Unknown notification service: ${service}`);
    }
  }
}
