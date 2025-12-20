import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { MessageSendRequest } from "../types.ts";
import { PageRepository } from "../kv.ts";
import { NotificationFactory } from "../services/notification/index.ts";
import { getDiscordConfig, getXConfig } from "../config/env.ts";

/**
 * メッセージ送信エンドポイントハンドラー
 */
export async function handleMessageSend(c: Context, pageRepo: PageRepository) {
  const body = await c.req.json() as MessageSendRequest;

  console.log("Message send request:", body);

  // バリデーション
  validateMessageRequest(body);

  // 指定時刻以降のページを取得
  const pages = await pageRepo.listPagesSince(
    body.webhookId,
    body.from_timestamp,
  );

  console.log(
    `Found ${pages.length} pages updated since ${body.from_timestamp}`,
  );

  // 環境変数から設定を取得
  const config = body.notification === "Discord"
    ? getDiscordConfig()
    : getXConfig();

  // 通知サービスを作成してメッセージを送信
  const notificationService = NotificationFactory.create(
    body.notification,
    config,
  );
  await notificationService.send(pages);

  return c.json({
    status: "sent",
    service: body.notification,
    pageCount: pages.length,
  });
}

/**
 * メッセージリクエストのバリデーション
 */
function validateMessageRequest(body: MessageSendRequest): void {
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
}
