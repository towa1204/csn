import { assertEquals } from "@std/assert";
import { createApp } from "../app.ts";
import { PageRepository } from "../kv.ts";
import { MessageSendRequest } from "../types.ts";

Deno.test("POST /api/message - Discord通知の送信", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // テストデータを準備
  const now = new Date();
  const recentPageKey = [
    "webhookId",
    "test-webhook",
    "projectName",
    "test-project",
    "pageName",
    "RecentPage",
  ] as const;
  await kv.set(recentPageKey, {
    projectName: "test-project",
    name: "RecentPage",
    link: "https://scrapbox.io/test-project/RecentPage",
    authors: ["RecentAuthor"],
    updatedAt: now.toISOString(),
  });

  const oneHourAgo = new Date(now);
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const messageRequest: MessageSendRequest = {
    webhookId: "test-webhook",
    notification: "Discord",
    from_timestamp: oneHourAgo.toISOString(),
  };

  const res = await app.request(
    "/api/message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageRequest),
    },
  );

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.status, "sent");
  assertEquals(json.service, "Discord");
  assertEquals(json.pageCount, 1);

  kv.close();
});

Deno.test("POST /api/message - X通知の送信", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // テストデータを準備
  const now = new Date();
  const pageKey = [
    "webhookId",
    "test-webhook",
    "projectName",
    "test-project",
    "pageName",
    "TestPage",
  ] as const;
  await kv.set(pageKey, {
    projectName: "test-project",
    name: "TestPage",
    link: "https://scrapbox.io/test-project/TestPage",
    authors: ["Author1", "Author2"],
    updatedAt: now.toISOString(),
  });

  const messageRequest: MessageSendRequest = {
    webhookId: "test-webhook",
    notification: "X",
    from_timestamp: new Date(now.getTime() - 3600000).toISOString(),
  };

  const res = await app.request(
    "/api/message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageRequest),
    },
  );

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.status, "sent");
  assertEquals(json.service, "X");
  assertEquals(json.pageCount, 1);

  kv.close();
});

Deno.test("POST /api/message - 必須パラメータが不足している場合", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const messageRequest = {
    webhookId: "test-webhook",
  };

  const res = await app.request(
    "/api/message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageRequest),
    },
  );

  assertEquals(res.status, 400);

  kv.close();
});

Deno.test("POST /api/message - 無効な通知サービス名", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const messageRequest = {
    webhookId: "test-webhook",
    notification: "InvalidService",
    from_timestamp: new Date().toISOString(),
  };

  const res = await app.request(
    "/api/message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageRequest),
    },
  );

  assertEquals(res.status, 400);

  kv.close();
});

Deno.test("POST /api/message - データが空の場合（Discord）", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // データを追加しない、または範囲外のデータのみ追加
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const oldPageKey = [
    "webhookId",
    "test-webhook",
    "projectName",
    "test-project",
    "pageName",
    "OldPage",
  ] as const;
  await kv.set(oldPageKey, {
    projectName: "test-project",
    name: "OldPage",
    link: "https://scrapbox.io/test-project/OldPage",
    authors: ["OldAuthor"],
    updatedAt: twoDaysAgo.toISOString(),
  });

  // 1時間前以降のデータを要求（データは2日前なので該当なし）
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const messageRequest: MessageSendRequest = {
    webhookId: "test-webhook",
    notification: "Discord",
    from_timestamp: oneHourAgo.toISOString(),
  };

  const res = await app.request(
    "/api/message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageRequest),
    },
  );

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.status, "sent");
  assertEquals(json.service, "Discord");
  assertEquals(json.pageCount, 0); // データが0件

  kv.close();
});

Deno.test("POST /api/message - データが空の場合（X）", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // webhookIdが異なるため該当データなし
  const messageRequest: MessageSendRequest = {
    webhookId: "non-existent-webhook",
    notification: "X",
    from_timestamp: new Date().toISOString(),
  };

  const res = await app.request(
    "/api/message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageRequest),
    },
  );

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.status, "sent");
  assertEquals(json.service, "X");
  assertEquals(json.pageCount, 0); // データが0件

  kv.close();
});
