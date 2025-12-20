import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { PageRepository } from "../kv.ts";

export interface RegisterWebhookRequest {
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

  // 安全なwebhookIdを自動生成
  const webhookId = crypto.randomUUID();
  console.log(`Generated webhook ID: ${webhookId}`);

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
  const isRegistered = await pageRepo.isValidWebhookId(webhookId);
  if (isRegistered) {
    return c.json({
      status: "already_registered",
      webhookId: webhookId,
      message: "This webhook ID is already registered",
    });
  }

  // webhookIdを登録
  await pageRepo.registerWebhookId(webhookId);

  console.log(`Registered webhook ID: ${webhookId}`);

  return c.json({
    status: "registered",
    webhookId: webhookId,
  }, 201);
}
