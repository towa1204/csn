import { assertEquals } from "@std/assert";
import { createApp, extractProjectName } from "./app.ts";
import { PageRepository } from "./kv.ts";
import { CosenseWebhookRequest } from "./types.ts";

Deno.test("extractProjectName - URLからプロジェクト名を抽出", () => {
  const url = "https://scrapbox.io/my-project/SomePage";
  const projectName = extractProjectName(url);
  assertEquals(projectName, "my-project");
});

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

  // KVに保存されたことを確認
  const entries = await pageRepo.listByWebhookId("test-webhook");
  assertEquals(entries.length, 1);
  assertEquals(entries[0].value.name, "TestPage");
  assertEquals(entries[0].value.projectName, "test-project");
  assertEquals(entries[0].value.authors, ["TestAuthor"]);

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
  const entries = await pageRepo.listByWebhookId("test-webhook");
  assertEquals(entries.length, 1);
  assertEquals(entries[0].value.authors.sort(), ["Author1", "Author2"]);

  kv.close();
});

Deno.test("GET /api/pages/:webhookId - ページ一覧取得", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // テストデータを準備
  const webhookBody: CosenseWebhookRequest = {
    text: "test",
    mrkdown: true,
    username: "testuser",
    attachments: [
      {
        title: "Page1",
        title_link: "https://scrapbox.io/test-project/Page1",
        text: "Content1",
        rawText: "Raw1",
        mrkdwn_in: [],
        author_name: "Author1",
      },
      {
        title: "Page2",
        title_link: "https://scrapbox.io/test-project/Page2",
        text: "Content2",
        rawText: "Raw2",
        mrkdwn_in: [],
        author_name: "Author2",
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

  // ページ一覧を取得
  const res = await app.request("/api/pages/test-webhook");

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.count, 2);
  assertEquals(json.entries.length, 2);

  kv.close();
});

Deno.test("GET /api/kv/dump - 全データ取得", async () => {
  const kv = await Deno.openKv(":memory:");
  const pageRepo = new PageRepository(kv);
  const app = createApp(pageRepo);

  // テストデータを準備
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

  await app.request(
    "/api/webhooks/test-webhook/slack",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    },
  );

  // 全データを取得
  const res = await app.request("/api/kv/dump");

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.count, 1);
  assertEquals(json.entries.length, 1);

  kv.close();
});
