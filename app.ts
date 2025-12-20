import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { CosenseWebhookRequest, MessageSendRequest, Page } from "./types.ts";
import { dateJSTTimeFormat } from "./utils.ts";
import { PageRepository } from "./kv.ts";
import { NotificationFactory } from "./notification.ts";

/**
 * プロジェクト名をURLから抽出
 */
export function extractProjectName(titleLink: string): string {
  return new URL(titleLink).pathname.split("/")[1];
}

/**
 * Honoアプリケーションを作成（テスト可能）
 */
export function createApp(pageRepo: PageRepository) {
  const api = new Hono().basePath("/api");
  api.use("*", logger());

  // エラーハンドリングミドルウェア
  api.onError((err, c) => {
    console.error("Error:", err);
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    return c.json(
      { status: "error", message: err.message || "Internal Server Error" },
      500,
    );
  });

  /**
   * CosenseのWebhookを処理してKVに保存
   */
  api.post("/webhooks/:webhookId/slack", async (c) => {
    const { webhookId } = c.req.param();
    const body = await c.req.json() as CosenseWebhookRequest;

    console.log("Body:", body);
    console.log(`Received Slack webhook for ID: ${webhookId}`);

    if (!body.attachments || body.attachments.length === 0) {
      throw new HTTPException(400, { message: "No attachments" });
    }

    const projectName = extractProjectName(body.attachments[0].title_link);

    // 各添付ファイルを処理してKVに保存
    for (const attachment of body.attachments) {
      const page: Page = {
        projectName,
        name: attachment.title,
        link: attachment.title_link,
        authors: [attachment.author_name],
        updatedAt: dateJSTTimeFormat(new Date()),
      };

      await pageRepo.savePage(webhookId, projectName, page);
      console.log("Saved page:", page);
    }

    // 一週間以上前のデータを削除
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const deletedCount = await pageRepo.deleteOldPages(webhookId, oneWeekAgo);
    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} old pages`);
    }

    return c.json({ status: "received", count: body.attachments.length });
  });

  /**
   * 外部サービスへメッセージを送信
   */
  api.post("/message", async (c) => {
    const body = await c.req.json() as MessageSendRequest;

    console.log("Message send request:", body);

    // バリデーション
    if (!body.webhookId || !body.notification || !body.from_timestamp) {
      throw new HTTPException(400, {
        message: "webhookId, notification, and from_timestamp are required",
      });
    }

    if (body.notification !== "Discord" && body.notification !== "X") {
      throw new HTTPException(400, {
        message: "notification must be 'Discord' or 'X'",
      });
    }

    // from_timestampの日付フォーマット検証
    try {
      new Date(body.from_timestamp);
    } catch {
      throw new HTTPException(400, {
        message: "Invalid from_timestamp format. Expected ISO 8601 format",
      });
    }

    // 指定時刻以降のページを取得
    const pages = await pageRepo.listPagesSince(
      body.webhookId,
      body.from_timestamp,
    );

    console.log(
      `Found ${pages.length} pages updated since ${body.from_timestamp}`,
    );

    // 通知サービスを作成してメッセージを送信
    const notificationService = NotificationFactory.create(body.notification);
    await notificationService.send(pages);

    return c.json({
      status: "sent",
      service: body.notification,
      pageCount: pages.length,
    });
  });

  return api;
}
