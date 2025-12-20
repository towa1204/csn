import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { CosenseWebhookRequest, Page } from "./types.ts";
import { dateJSTTimeFormat } from "./utils.ts";
import { PageRepository } from "./kv.ts";

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

  return api;
}
