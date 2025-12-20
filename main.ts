import { Hono } from "hono";
import { logger } from "hono/logger";
import { CosenseWebhookRequest, Page, PageKey } from "./types.ts";
import { dateJSTTimeFormat } from "./utils.ts";

const kv = await Deno.openKv();
const api = new Hono().basePath("/api");

api.use("*", logger());

api.post("/webhooks/:webhookId/slack", async (c) => {
  const { webhookId } = c.req.param();

  const body = await c.req.json() as CosenseWebhookRequest;
  console.log("Body:", body);

  const projectName = new URL(body.attachments[0].title_link)
    .pathname.split("/")[1];

  console.log(`Received Slack webhook for ID: ${webhookId}`);

  /**
   * Scrapboxから受け取った情報をDeno KVに書き込む
   */
  for (const attachment of body.attachments) {
    const page: Page = {
      projectName: projectName,
      name: attachment.title,
      link: attachment.title_link,
      authors: [attachment.author_name],
      updatedAt: dateJSTTimeFormat(new Date()),
    };
    const pageKey: PageKey = [
      "webhookId",
      webhookId,
      "projectName",
      projectName,
      "pageName",
      page.name,
    ];

    // 同じページが更新済で異なるユーザであればユーザ追記
    const entry = await kv.get<Page>(pageKey);
    if (entry.value != null) {
      const oldPage = entry.value;
      page.authors = [...new Set([...page.authors, ...oldPage.authors])];
    }
    // KVに書き込む
    await kv.set(pageKey, page);
    console.log(page);
  }

  return c.json({ status: "received" });
});

Deno.serve(api.fetch);
