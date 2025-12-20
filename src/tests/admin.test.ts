import { assertEquals } from "@std/assert";
import { createApp } from "../app.ts";
import { PageRepository } from "../kv.ts";

Deno.test("POST /api/admin/webhooks - 正常な登録", async () => {
  // 環境変数を設定
  Deno.env.set("ADMIN_API_KEY", "test-secret-key");

  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const res = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookId: "new-webhook-123",
        apiKey: "test-secret-key",
      }),
    },
  );

  assertEquals(res.status, 201);
  const json = await res.json();
  assertEquals(json.status, "registered");
  assertEquals(json.webhookId, "new-webhook-123");

  // 実際に登録されたか確認
  const isValid = await pageRepo.isValidWebhookId("new-webhook-123");
  assertEquals(isValid, true);

  // 環境変数をクリーンアップ
  Deno.env.delete("ADMIN_API_KEY");

  kv.close();
});

Deno.test("POST /api/admin/webhooks - webhookIdが未指定", async () => {
  // 環境変数を設定
  Deno.env.set("ADMIN_API_KEY", "test-secret-key");

  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const res = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "test-secret-key" }),
    },
  );

  assertEquals(res.status, 400);
  const text = await res.text();
  assertEquals(text, "webhookId is required");

  // 環境変数をクリーンアップ
  Deno.env.delete("ADMIN_API_KEY");

  kv.close();
});

Deno.test("POST /api/admin/webhooks - 無効な文字を含むwebhookId", async () => {
  // 環境変数を設定
  Deno.env.set("ADMIN_API_KEY", "test-secret-key");

  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const res = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookId: "invalid webhook!",
        apiKey: "test-secret-key",
      }),
    },
  );

  assertEquals(res.status, 400);
  const text = await res.text();
  assertEquals(
    text,
    "webhookId must contain only alphanumeric characters, hyphens, and underscores",
  );

  // 環境変数をクリーンアップ
  Deno.env.delete("ADMIN_API_KEY");

  kv.close();
});

Deno.test("POST /api/admin/webhooks - 既に登録済みのwebhookId", async () => {
  // 環境変数を設定
  Deno.env.set("ADMIN_API_KEY", "test-secret-key");

  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // 事前に登録
  await pageRepo.registerWebhookId("existing-webhook");

  const res = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookId: "existing-webhook",
        apiKey: "test-secret-key",
      }),
    },
  );

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.status, "already_registered");
  assertEquals(json.webhookId, "existing-webhook");

  // 環境変数をクリーンアップ
  Deno.env.delete("ADMIN_API_KEY");

  kv.close();
});

Deno.test("POST /api/admin/webhooks - APIキーが未指定", async () => {
  // 環境変数を設定
  Deno.env.set("ADMIN_API_KEY", "test-secret-key");

  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const res = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId: "test-webhook" }),
    },
  );

  assertEquals(res.status, 400);
  const text = await res.text();
  assertEquals(text, "apiKey is required");

  // 環境変数をクリーンアップ
  Deno.env.delete("ADMIN_API_KEY");

  kv.close();
});

Deno.test("POST /api/admin/webhooks - ADMIN_API_KEY環境変数が未設定", async () => {
  // 環境変数が設定されていないことを確認
  Deno.env.delete("ADMIN_API_KEY");

  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const res = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookId: "test-webhook",
        apiKey: "some-key",
      }),
    },
  );

  assertEquals(res.status, 500);
  const text = await res.text();
  assertEquals(text, "Server configuration error");

  kv.close();
});

Deno.test("POST /api/admin/webhooks - APIキー認証（正しいキーと間違ったキー）", async () => {
  // 環境変数を設定
  Deno.env.set("ADMIN_API_KEY", "test-secret-key");

  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // 正しいAPIキー
  const res1 = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookId: "auth-webhook",
        apiKey: "test-secret-key",
      }),
    },
  );
  assertEquals(res1.status, 201);

  // 間違ったAPIキー
  const res2 = await app.request(
    "/api/admin/webhooks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookId: "auth-webhook-2",
        apiKey: "wrong-key",
      }),
    },
  );
  assertEquals(res2.status, 401);

  // 環境変数をクリーンアップ
  Deno.env.delete("ADMIN_API_KEY");

  kv.close();
});
