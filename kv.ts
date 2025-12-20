import { Page, PageKey } from "./types.ts";

export class PageRepository {
  private kv: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }

  /**
   * ページをKVに保存する
   */
  async savePage(
    webhookId: string,
    projectName: string,
    page: Page,
  ): Promise<void> {
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
