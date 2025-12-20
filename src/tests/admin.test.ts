import { assertEquals } from "@std/assert";
import { createApp } from "../app.ts";
import { PageRepository } from "../kv.ts";

Deno.test("POST /api/admin/webhooks - webhookIdを自動生成", async () => {
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
        apiKey: "test-secret-key",
      }),
    },
  );

  assertEquals(res.status, 201);
  const json = await res.json();
  assertEquals(json.status, "registered");
  // UUIDフォーマットの確認
  assertEquals(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(json.webhookId),
    true,
  );

  // 実際に登録されたか確認
  const isValid = await pageRepo.isValidWebhookId(json.webhookId);
  assertEquals(isValid, true);

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
      body: JSON.stringify({}),
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
        apiKey: "wrong-key",
      }),
    },
  );
  assertEquals(res2.status, 401);

  // 環境変数をクリーンアップ
  Deno.env.delete("ADMIN_API_KEY");

  kv.close();
});
