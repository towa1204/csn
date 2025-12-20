import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { PageRepository } from "../kv.ts";

export interface RegisterWebhookRequest {
  webhookId: string;
  apiKey: string;
}

/**
 * webhookIdを登録するエンドポイントハンドラー
 */
export async function handleRegisterWebhook(
  c: Context,
  pageRepo: PageRepository,
) {
  const body = await c.req.json() as RegisterWebhookRequest;

  console.log("Register webhook request:", body);

  // バリデーション
  if (!body.webhookId) {
    throw new HTTPException(400, { message: "webhookId is required" });
  }

  // webhookIdの形式チェック（英数字とハイフンのみ）
  if (!/^[a-zA-Z0-9-_]+$/.test(body.webhookId)) {
    throw new HTTPException(400, {
      message:
        "webhookId must contain only alphanumeric characters, hyphens, and underscores",
    });
  }

  // APIキーのバリデーション
  if (!body.apiKey) {
    throw new HTTPException(400, { message: "apiKey is required" });
  }

  // 環境変数のADMIN_API_KEYを確認
  const adminApiKey = Deno.env.get("ADMIN_API_KEY");
  if (!adminApiKey) {
    console.error("ADMIN_API_KEY environment variable is not set");
    throw new HTTPException(500, { message: "Server configuration error" });
  }

  // APIキー認証
  if (body.apiKey !== adminApiKey) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  // 既に登録されているかチェック
  const isRegistered = await pageRepo.isValidWebhookId(body.webhookId);
  if (isRegistered) {
    return c.json({
      status: "already_registered",
      webhookId: body.webhookId,
      message: "This webhook ID is already registered",
    });
  }

  // webhookIdを登録
  await pageRepo.registerWebhookId(body.webhookId);

  console.log(`Registered webhook ID: ${body.webhookId}`);

  return c.json({
    status: "registered",
    webhookId: body.webhookId,
  }, 201);
}
