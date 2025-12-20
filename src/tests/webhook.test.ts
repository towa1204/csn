import { assertEquals } from "@std/assert";
import { createApp } from "../app.ts";
import { PageRepository } from "../kv.ts";
import { CosenseWebhookRequest } from "../types.ts";

Deno.test("POST /api/webhooks/:webhookId/slack - 正常なリクエスト", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const webhookBody: CosenseWebhookRequest = {
    text: "test",
    mrkdown: true,
    username: "testuser",
    attachments: [
      {
        title: "TestPage",
        title_link: "https://scrapbox.io/test-project/TestPage",
        text: "Test content",
        rawText: "Test raw",
        mrkdwn_in: [],
        author_name: "TestAuthor",
      },
    ],
  };

  const res = await app.request(
    "/api/webhooks/test-webhook/slack",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    },
  );

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.status, "received");
  assertEquals(json.count, 1);

  kv.close();
});

Deno.test("POST /api/webhooks/:webhookId/slack - attachmentsが空", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const webhookBody = {
    text: "test",
    mrkdown: true,
    username: "testuser",
    attachments: [],
  };

  const res = await app.request(
    "/api/webhooks/test-webhook/slack",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    },
  );

  assertEquals(res.status, 400);
  const text = await res.text();
  assertEquals(text, "No attachments");

  kv.close();
});

Deno.test("POST /api/webhooks/:webhookId/slack - 同じページを複数回更新（著者マージ）", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  const createWebhookBody = (author: string): CosenseWebhookRequest => ({
    text: "test",
    mrkdown: true,
    username: "testuser",
    attachments: [
      {
        title: "SharedPage",
        title_link: "https://scrapbox.io/test-project/SharedPage",
        text: "Test content",
        rawText: "Test raw",
        mrkdwn_in: [],
        author_name: author,
      },
    ],
  });

  // 1回目：Author1
  await app.request(
    "/api/webhooks/test-webhook/slack",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createWebhookBody("Author1")),
    },
  );

  // 2回目：Author2
  await app.request(
    "/api/webhooks/test-webhook/slack",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createWebhookBody("Author2")),
    },
  );

  // 著者がマージされていることを確認
  const pageKey = [
    "webhookId",
    "test-webhook",
    "projectName",
    "test-project",
    "pageName",
    "SharedPage",
  ] as const;
  const entry = await kv.get(pageKey);
  assertEquals(entry.value !== null, true);
  assertEquals((entry.value as any).authors.sort(), ["Author1", "Author2"]);

  kv.close();
});

Deno.test("POST /api/webhooks/:webhookId/slack - 一週間以上前のデータを削除", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // 一週間以上前のデータを手動で作成
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
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
    updatedAt: eightDaysAgo.toISOString(),
  });

  // 6日前のデータ（削除されない）
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
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
    updatedAt: sixDaysAgo.toISOString(),
  });

  // 新しいデータを追加（これにより古いデータが削除される）
  const webhookBody: CosenseWebhookRequest = {
    text: "test",
    mrkdown: true,
    username: "testuser",
    attachments: [
      {
        title: "NewPage",
        title_link: "https://scrapbox.io/test-project/NewPage",
        text: "New content",
        rawText: "New raw",
        mrkdwn_in: [],
        author_name: "NewAuthor",
      },
    ],
  };

  await app.request(
    "/api/webhooks/test-webhook/slack",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    },
  );

  // 保存後の確認（一週間以上前のデータは削除されている）
  const oldPageAfter = await kv.get(oldPageKey);
  assertEquals(oldPageAfter.value, null);

  const recentPageAfter = await kv.get(recentPageKey);
  assertEquals(recentPageAfter.value !== null, true);

  const newPageKey = [
    "webhookId",
    "test-webhook",
    "projectName",
    "test-project",
    "pageName",
    "NewPage",
  ] as const;
  const newPageAfter = await kv.get(newPageKey);
  assertEquals(newPageAfter.value !== null, true);

  kv.close();
});
