import { TwitterApi } from "twitter-api-v2";
import { Page } from "../../types.ts";
import { NotificationServiceHandler, XConfig } from "./types.ts";

/**
 * X(Twitter)通知サービス
 */
export class XService implements NotificationServiceHandler {
  private static readonly TWEET_MAX_LENGTH = 280;
  private static readonly URL_LENGTH = 23; // t.co短縮URL長
  private static readonly URL_REGEX = /https?:\/\/[^\s]+/g;

  constructor(private readonly config: XConfig) {}

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
    let addedCount = 0;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageEntry = this.buildPageEntry(page);
      const tentativeMessage = message + pageEntry;

      // 残りのページがある場合、"他X件の更新"メッセージも考慮
      const remaining = pages.length - i - 1;
      const remainingText = remaining > 0 ? `\n他${remaining}件の更新` : "";
      const messageWithRemaining = tentativeMessage.trimEnd() + remainingText;

      if (
        this.calculateTweetLength(tentativeMessage) > XService.TWEET_MAX_LENGTH
      ) {
        // 現在のページを追加できない場合
        if (remaining > 0) {
          const finalMessage = message.trimEnd() +
            `\n他${remaining + 1}件の更新`;
          // "他X件"を追加しても制限を超える場合は、さらにページを削る
          if (
            this.calculateTweetLength(finalMessage) >
              XService.TWEET_MAX_LENGTH &&
            addedCount > 0
          ) {
            // 最後のページエントリーを削除して再試行
            const entries = message.split("\n\n").slice(0, -1);
            message = entries.join("\n\n") + "\n\n";
            return message.trimEnd() +
              `\n他${pages.length - addedCount + 1}件の更新`;
          }
          message = finalMessage;
        }
        break;
      }

      // "他X件"を含めても制限内かチェック
      if (
        remaining > 0 &&
        this.calculateTweetLength(messageWithRemaining) >
          XService.TWEET_MAX_LENGTH
      ) {
        // 含めると超える場合、このページは追加せずに終了
        message = message.trimEnd() + `\n他${remaining + 1}件の更新`;
        break;
      }

      message += pageEntry;
      addedCount++;
    }

    return message.trim();
  }

  /**
   * ページエントリーを構築
   */
  private buildPageEntry(page: Page): string {
    const authorsText = page.authors.slice(0, 2).join(", ");
    const moreAuthors = page.authors.length > 2
      ? ` 他${page.authors.length - 2}名`
      : "";

    return `${page.name}\nby ${authorsText}${moreAuthors}\n${page.link}\n\n`;
  }

  /**
   * ツイートの文字数を計算（URLは23文字として扱う）
   */
  private calculateTweetLength(text: string): number {
    const textWithReplacedUrls = text.replace(
      XService.URL_REGEX,
      "x".repeat(XService.URL_LENGTH),
    );
    return textWithReplacedUrls.length;
  }

  /**
   * X APIへ送信
   */
  private async sendToX(message: string): Promise<void> {
    console.log("=== X (Twitter) Post ===");
    console.log(message);
    console.log("========================");

    const { apiKey, apiKeySecret, accessToken, accessTokenSecret } =
      this.config;

    if (!apiKey || !apiKeySecret || !accessToken || !accessTokenSecret) {
      console.log("X API credentials not configured, skipping actual send");
      return;
    }

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiKeySecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    const tweet = await client.readWrite.v2.tweet(message);
    console.log("Tweeted:", tweet.data);
  }
}
