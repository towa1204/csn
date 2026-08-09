import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  CosenseWebhookAttachment,
  CosenseWebhookRequest,
  Page,
} from "../types.ts";
import { dateJSTTimeFormat } from "../utils.ts";
import { PageRepository } from "../kv.ts";

/**
 * プロジェクト名をURLから抽出
 */
export function extractProjectName(titleLink: string): string {
  return new URL(titleLink).pathname.split("/")[1];
}

function normalizeImageUrl(url?: string): string | undefined {
  return url?.trim() || undefined;
}

/**
 * ページattachmentと、それに続く画像専用attachmentからサムネイルを取得する
 */
export function extractThumbnailUrl(
  attachments: CosenseWebhookAttachment[],
  pageAttachmentIndex: number,
): string | undefined {
  const pageAttachment = attachments[pageAttachmentIndex];
  const directImageUrl = normalizeImageUrl(pageAttachment.thumb_url) ??
    normalizeImageUrl(pageAttachment.image_url);
  if (directImageUrl) {
    return directImageUrl;
  }

  for (let i = pageAttachmentIndex + 1; i < attachments.length; i++) {
    const attachment = attachments[i];
    if (attachment.title?.trim()) {
      break;
    }

    const imageUrl = normalizeImageUrl(attachment.thumb_url) ??
      normalizeImageUrl(attachment.image_url);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return undefined;
}

/**
 * Webhookエンドポイントハンドラー
 */
export async function handleWebhook(c: Context, pageRepo: PageRepository) {
  const { webhookId } = c.req.param();
  const body = await c.req.json() as CosenseWebhookRequest;

  console.log("Body:", body);
  console.log(`Received Slack webhook for ID: ${webhookId}`);

  // webhookIdの存在チェック
  const isValid = await pageRepo.isValidWebhookId(webhookId);
  if (!isValid) {
    throw new HTTPException(400, { message: "Invalid webhook ID" });
  }

  if (!body.attachments || body.attachments.length === 0) {
    throw new HTTPException(400, { message: "No attachments" });
  }

  const firstPageAttachment = body.attachments.find((attachment) =>
    attachment.title?.trim() && attachment.title_link
  );
  if (!firstPageAttachment?.title_link) {
    throw new HTTPException(400, { message: "No page attachments" });
  }

  const projectName = extractProjectName(firstPageAttachment.title_link);
  let savedCount = 0;

  // 各添付ファイルを処理してKVに保存
  for (let i = 0; i < body.attachments.length; i++) {
    const attachment = body.attachments[i];

    // 画像専用attachmentはページ情報として保存しない
    if (!attachment.title || !attachment.title.trim()) {
      if (!attachment.image_url && !attachment.thumb_url) {
        console.warn("Skipping attachment with empty title:", attachment);
      }
      continue;
    }

    if (!attachment.title_link || !attachment.author_name) {
      console.warn("Skipping invalid page attachment:", attachment);
      continue;
    }

    const page: Page = {
      projectName,
      name: attachment.title,
      link: attachment.title_link,
      thumbnailUrl: extractThumbnailUrl(body.attachments, i),
      authors: [attachment.author_name],
      updatedAt: dateJSTTimeFormat(new Date()),
    };

    await pageRepo.savePage(webhookId, projectName, page);
    savedCount++;
    console.log("Saved page:", page);
  }

  // 一週間以上前のデータを削除
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const deletedCount = await pageRepo.deleteOldPages(webhookId, oneWeekAgo);
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} old pages`);
  }

  return c.json({ status: "received", count: savedCount });
}
