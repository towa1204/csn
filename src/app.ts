import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { PageRepository } from "./kv.ts";
import { handleWebhook } from "./routes/webhook.route.ts";
import { handleMessageSend } from "./routes/message.route.ts";
import { handleRegisterWebhook } from "./routes/admin.route.ts";

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
      { status: "error", message: "Internal Server Error" },
      500,
    );
  });

  // ルート登録
  api.post("/webhooks/:webhookId/slack", (c) => handleWebhook(c, pageRepo));
  api.post("/message", (c) => handleMessageSend(c, pageRepo));
  api.post("/admin/webhooks", (c) => handleRegisterWebhook(c, pageRepo));

  return api;
}
