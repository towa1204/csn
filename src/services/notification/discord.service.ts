import { Page } from "../../types.ts";
import { DiscordConfig, NotificationServiceHandler } from "./types.ts";

type DiscordEmbed = {
  title: string;
  url: string;
  thumbnail: { url: string };
};

type DiscordWebhookPayload = {
  content: string;
  embeds?: DiscordEmbed[];
};

const DISCORD_MAX_EMBEDS = 10;
const DISCORD_EMBED_TITLE_MAX_LENGTH = 256;

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function truncateEmbedTitle(title: string): string {
  return [...title].slice(0, DISCORD_EMBED_TITLE_MAX_LENGTH).join("");
}

/**
 * Discord Webhook用payloadを構築する
 */
export function buildDiscordWebhookPayload(
  pages: Page[],
): DiscordWebhookPayload {
  const embeds = pages
    .flatMap((page) =>
      page.thumbnailUrl
        ? [{
          title: truncateEmbedTitle(page.name),
          url: page.link,
          thumbnail: { url: page.thumbnailUrl },
        }]
        : []
    )
    .slice(0, DISCORD_MAX_EMBEDS);

  return {
    content: formatDiscordMessage(pages),
    ...(embeds.length > 0 ? { embeds } : {}),
  };
}

/**
 * Discord用メッセージを整形する
 */
export function formatDiscordMessage(pages: Page[]): string {
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
 * Discord通知サービス
 */
export class DiscordService implements NotificationServiceHandler {
  constructor(
    private readonly config: DiscordConfig,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  /**
   * メッセージを整形して送信
   */
  async send(pages: Page[]): Promise<void> {
    const payload = buildDiscordWebhookPayload(pages);
    await this.sendToDiscord(payload);
  }

  /**
   * Discord Webhookへ送信
   */
  private async sendToDiscord(payload: DiscordWebhookPayload): Promise<void> {
    console.log("=== Discord Message ===");
    console.log(payload);
    console.log("=======================");

    if (!this.config.webhookUrl) {
      console.log("Discord webhook URL not configured, skipping actual send");
      return;
    }

    const response = await this.fetcher(this.config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Discord webhook request failed: HTTP ${response.status}`,
      );
    }
  }
}
