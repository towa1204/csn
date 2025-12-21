import { TwitterApi } from "twitter-api-v2";
import twitter from "twitter-text";
import { Page } from "../../types.ts";
import { NotificationServiceHandler, XConfig } from "./types.ts";

/**
 * X(Twitter)通知サービス
 */
export class XService implements NotificationServiceHandler {
  private static readonly TWEET_MAX_LENGTH = 280;

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

    const header = `📝 ページ更新通知 (${pages.length}件)\n\n`;
    let message = header;
    let addedCount = 0;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageEntry = this.buildPageEntry(page);
      const messageWithPage = message + pageEntry;
      const remaining = pages.length - i - 1;

      // 現在のページを追加した場合の長さをチェック
      if (
        this.calculateTweetLength(messageWithPage) > XService.TWEET_MAX_LENGTH
      ) {
        // 追加できない場合、残りの件数を表示
        const totalRemaining = remaining + 1; // 現在のページも含む
        const finalMessage = message.trimEnd() +
          `\n\n他${totalRemaining}件の更新`;

        // 残り件数メッセージを含めても制限を超える場合
        if (
          this.calculateTweetLength(finalMessage) > XService.TWEET_MAX_LENGTH
        ) {
          // 最後に追加したページを削除
          return this.removeLastPageAndAddRemaining(header, pages, addedCount);
        }

        return finalMessage;
      }

      // ページを追加
      message = messageWithPage;
      addedCount++;

      // 最後のページの場合、残りメッセージは不要
      if (remaining === 0) {
        return message.trim();
      }

      // 残りがある場合、残りメッセージを追加した場合の長さもチェック
      const messageWithRemaining = message.trimEnd() +
        `\n\n他${remaining}件の更新`;
      if (
        this.calculateTweetLength(messageWithRemaining) >
          XService.TWEET_MAX_LENGTH
      ) {
        // 残りメッセージを追加すると超える場合、現在のページは追加せずに終了
        message = message.slice(0, message.lastIndexOf(pageEntry));
        const finalRemaining = remaining + 1;
        const finalMessage = message.trimEnd() +
          `\n\n他${finalRemaining}件の更新`;

        // それでも超える場合は更に削る
        if (
          this.calculateTweetLength(finalMessage) > XService.TWEET_MAX_LENGTH
        ) {
          return this.removeLastPageAndAddRemaining(
            header,
            pages,
            addedCount - 1,
          );
        }

        return finalMessage;
      }
    }

    return message.trim();
  }

  /**
   * 最後のページを削除して残り件数を追加
   */
  private removeLastPageAndAddRemaining(
    header: string,
    pages: Page[],
    addedCount: number,
  ): string {
    if (addedCount === 0) {
      // ヘッダーのみで残り全件を表示
      return header.trimEnd() + `\n\n他${pages.length}件の更新`;
    }

    // addedCountまでのページを再構築
    let message = header;
    for (let i = 0; i < addedCount; i++) {
      message += this.buildPageEntry(pages[i]);
    }

    const remaining = pages.length - addedCount;
    return message.trimEnd() + `\n\n他${remaining}件の更新`;
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
   * ツイートの文字数を計算（Twitter公式ルールに従う）
   */
  private calculateTweetLength(text: string): number {
    const result = twitter.parseTweet(text);
    return result.weightedLength;
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
