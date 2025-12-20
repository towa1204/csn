import { Page, PageKey } from "./types.ts";

export class PageRepository {
  private kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }

  /**
   * webhookIdが登録されているか確認する
   */
  async isValidWebhookId(webhookId: string): Promise<boolean> {
    const key = ["webhooks", webhookId];
    const entry = await this.kv.get(key);
    return entry.value !== null;
  }

  /**
   * webhookIdを登録する
   */
  async registerWebhookId(webhookId: string): Promise<void> {
    const key = ["webhooks", webhookId];
    await this.kv.set(key, {
      registered: true,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * ページをKVに保存する
   */
  async savePage(
    webhookId: string,
    projectName: string,
    page: Page,
  ): Promise<void> {
    // デバッグ用：値の検証
    if (!webhookId || !projectName || !page.name) {
      console.error("Invalid KV key values:", {
        webhookId,
        projectName,
        pageName: page.name,
      });
      throw new Error(
        `Invalid KV key: webhookId=${webhookId}, projectName=${projectName}, pageName=${page.name}`,
      );
    }

    const pageKey: PageKey = [
      "webhookId",
      webhookId,
      "projectName",
      projectName,
      "pageName",
      page.name,
    ];

    // 既存のページがあれば、著者をマージする
    const entry = await this.kv.get<Page>(pageKey);
    if (entry.value != null) {
      page.authors = [...new Set([...page.authors, ...entry.value.authors])];
    }

    await this.kv.set(pageKey, page);
  }

  /**
   * 一週間以上前のページを削除する
   */
  async deleteOldPages(webhookId: string, cutoffDate: Date): Promise<number> {
    const prefix: Deno.KvKey = ["webhookId", webhookId];
    let deletedCount = 0;

    for await (const entry of this.kv.list<Page>({ prefix })) {
      if (entry.value && entry.value.updatedAt) {
        const updatedAt = new Date(entry.value.updatedAt);
        if (updatedAt < cutoffDate) {
          await this.kv.delete(entry.key);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  /**
   * 指定した時刻以降に更新されたページを取得する
   */
  async listPagesSince(
    webhookId: string,
    fromTimestamp: string,
  ): Promise<Page[]> {
    const prefix: Deno.KvKey = ["webhookId", webhookId];
    const pages: Page[] = [];
    const fromDate = new Date(fromTimestamp);

    for await (const entry of this.kv.list<Page>({ prefix })) {
      if (entry.value && entry.value.updatedAt) {
        const updatedAt = new Date(entry.value.updatedAt);
        if (updatedAt >= fromDate) {
          pages.push(entry.value);
        }
      }
    }

    return pages;
  }
}
