import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { CosenseWebhookRequest, Page } from "./types.ts";
import { dateJSTTimeFormat } from "./utils.ts";
import { PageRepository } from "./kv.ts";

const kv = await Deno.openKv();
const pageRepo = new PageRepository(kv);

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
 * プロジェクト名をURLから抽出
 */
function extractProjectName(titleLink: string): string {
  return new URL(titleLink).pathname.split("/")[1];
}

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

  return c.json({ status: "received", count: body.attachments.length });
});

/**
 * KVに保存されたページを取得
 */
api.get("/pages/:webhookId", async (c) => {
  const { webhookId } = c.req.param();
  const entries = await pageRepo.listByWebhookId(webhookId);
  return c.json({ count: entries.length, entries });
});

/**
 * KVに保存された全データを取得（デバッグ用）
 */
api.get("/kv/dump", async (c) => {
  const entries = await pageRepo.listAll();
  console.log("=== KV Dump ===");
  console.log(JSON.stringify(entries, null, 2));
  return c.json({ count: entries.length, entries });
});

Deno.serve(api.fetch);
