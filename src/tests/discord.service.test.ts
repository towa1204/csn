import { assertEquals, assertRejects } from "@std/assert";
import {
  buildDiscordWebhookPayload,
  DiscordService,
} from "../services/notification/discord.service.ts";
import { Page } from "../types.ts";

Deno.test("Discord通知 - サムネイルをembedに含める", () => {
  const pages: Page[] = [{
    projectName: "test-project",
    name: "TestPage",
    link: "https://scrapbox.io/test-project/TestPage",
    thumbnailUrl: "https://example.com/thumbnail.png",
    authors: ["TestAuthor"],
    updatedAt: "2026-08-09T12:00:00+09:00",
  }];

  const payload = buildDiscordWebhookPayload(pages);

  assertEquals(payload.embeds, [{
    title: "TestPage",
    url: "https://scrapbox.io/test-project/TestPage",
    thumbnail: { url: "https://example.com/thumbnail.png" },
  }]);
});

Deno.test("Discord通知 - サムネイルがない場合はembedを省略する", () => {
  const pages: Page[] = [{
    projectName: "test-project",
    name: "TestPage",
    link: "https://scrapbox.io/test-project/TestPage",
    authors: ["TestAuthor"],
    updatedAt: "2026-08-09T12:00:00+09:00",
  }];

  const payload = buildDiscordWebhookPayload(pages);

  assertEquals(payload.embeds, undefined);
});

Deno.test("Discord通知 - embedタイトルを256文字に制限する", () => {
  const pages: Page[] = [{
    projectName: "test-project",
    name: "あ".repeat(257),
    link: "https://scrapbox.io/test-project/TestPage",
    thumbnailUrl: "https://example.com/thumbnail.png",
    authors: ["TestAuthor"],
    updatedAt: "2026-08-09T12:00:00+09:00",
  }];

  const payload = buildDiscordWebhookPayload(pages);

  assertEquals([...payload.embeds![0].title].length, 256);
});

Deno.test("Discord通知 - WebhookのHTTPエラーを送信失敗として扱う", async () => {
  const service = new DiscordService(
    { webhookUrl: "https://discord.example/webhook" },
    () => Promise.resolve(new Response(null, { status: 400 })),
  );
  const pages: Page[] = [{
    projectName: "test-project",
    name: "TestPage",
    link: "https://scrapbox.io/test-project/TestPage",
    authors: ["TestAuthor"],
    updatedAt: "2026-08-09T12:00:00+09:00",
  }];

  await assertRejects(
    () => service.send(pages),
    Error,
    "Discord webhook request failed: HTTP 400",
  );
});
