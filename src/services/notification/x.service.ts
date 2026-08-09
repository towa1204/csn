import { Buffer } from "node:buffer";
import { EUploadMimeType, TwitterApi } from "twitter-api-v2";
import twitter from "twitter-text";
import { Page } from "../../types.ts";
import { NotificationServiceHandler, XConfig } from "./types.ts";

type XMediaIds =
  | [string]
  | [string, string]
  | [string, string, string]
  | [string, string, string, string];

const X_MAX_MEDIA_COUNT = 4;
const X_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const X_MAX_GIF_BYTES = 15 * 1024 * 1024;
const X_IMAGE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Xへ添付するサムネイルURLを重複なしで取得する
 */
export function selectThumbnailUrls(pages: Page[]): string[] {
  return [
    ...new Set(
      pages.flatMap((page) => page.thumbnailUrl ? [page.thumbnailUrl] : []),
    ),
  ].slice(0, X_MAX_MEDIA_COUNT);
}

function toXMediaIds(mediaIds: string[]): XMediaIds | undefined {
  switch (mediaIds.length) {
    case 1:
      return [mediaIds[0]];
    case 2:
      return [mediaIds[0], mediaIds[1]];
    case 3:
      return [mediaIds[0], mediaIds[1], mediaIds[2]];
    case 4:
      return [mediaIds[0], mediaIds[1], mediaIds[2], mediaIds[3]];
    default:
      return undefined;
  }
}

function toXImageMimeType(contentType: string | null): EUploadMimeType | null {
  const mimeType = contentType?.split(";")[0].trim().toLowerCase();

  switch (mimeType) {
    case EUploadMimeType.Jpeg:
    case EUploadMimeType.Png:
    case EUploadMimeType.Gif:
    case EUploadMimeType.Webp:
      return mimeType;
    default:
      return null;
  }
}

/**
 * Xの添付ルール上、候補のメディアを追加できるか判定する
 */
export function canAttachXMedia(
  attachedMimeTypes: EUploadMimeType[],
  candidateMimeType: EUploadMimeType,
): boolean {
  if (attachedMimeTypes.length === 0) {
    return true;
  }

  if (
    attachedMimeTypes.includes(EUploadMimeType.Gif) ||
    candidateMimeType === EUploadMimeType.Gif
  ) {
    return false;
  }

  return attachedMimeTypes.length < X_MAX_MEDIA_COUNT;
}

/**
 * レスポンス本文を上限サイズまで読み込む
 */
export async function readImageWithSizeLimit(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Image exceeds size limit of ${maxBytes} bytes`);
  }

  if (!response.body) {
    throw new Error("Image response body is empty");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`Image exceeds size limit of ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new Error("Image response body is empty");
  }

  return Buffer.concat(chunks, totalBytes);
}

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
    await this.sendToX(message, pages);
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
  private async sendToX(message: string, pages: Page[]): Promise<void> {
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

    const mediaIds = await this.uploadThumbnails(client, pages);
    const tweetMediaIds = toXMediaIds(mediaIds);
    const tweet = await client.readWrite.v2.tweet(
      message,
      tweetMediaIds
        ? {
          media: {
            media_ids: tweetMediaIds,
          },
        }
        : undefined,
    );
    console.log("Tweeted:", tweet.data);
  }

  /**
   * ページのサムネイルをXへアップロードする
   */
  private async uploadThumbnails(
    client: TwitterApi,
    pages: Page[],
  ): Promise<string[]> {
    const thumbnailUrls = selectThumbnailUrls(pages);
    const mediaIds: string[] = [];
    const attachedMimeTypes: EUploadMimeType[] = [];

    for (const thumbnailUrl of thumbnailUrls) {
      try {
        const response = await fetch(thumbnailUrl, {
          signal: AbortSignal.timeout(X_IMAGE_FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        const mimeType = toXImageMimeType(contentType);
        if (!mimeType) {
          throw new Error(
            `Unsupported content type: ${contentType ?? "unknown"}`,
          );
        }

        if (!canAttachXMedia(attachedMimeTypes, mimeType)) {
          console.warn(
            `Skipping thumbnail due to X media constraints: ${thumbnailUrl}`,
          );
          continue;
        }

        const maxBytes = mimeType === EUploadMimeType.Gif
          ? X_MAX_GIF_BYTES
          : X_MAX_IMAGE_BYTES;
        const image = await readImageWithSizeLimit(response, maxBytes);
        const mediaId = await client.readWrite.v2.uploadMedia(image, {
          media_type: mimeType,
        });
        mediaIds.push(mediaId);
        attachedMimeTypes.push(mimeType);

        if (mimeType === EUploadMimeType.Gif) {
          break;
        }
      } catch (error) {
        console.error(
          `Failed to upload thumbnail: ${thumbnailUrl}`,
          error,
        );
      }
    }

    return mediaIds;
  }
}
