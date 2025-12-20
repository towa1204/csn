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
   * KVからすべてのエントリを取得する
   */
  async listAll() {
    const entries = [];
    for await (const entry of this.kv.list<Page>({ prefix: [] })) {
      entries.push({
        key: entry.key,
        value: entry.value,
        versionstamp: entry.versionstamp,
      });
    }
    return entries;
  }

  /**
   * 特定のwebhookIdのページを取得する
   */
  async listByWebhookId(webhookId: string) {
    const entries = [];
    const prefix: Deno.KvKey = ["webhookId", webhookId];
    for await (const entry of this.kv.list<Page>({ prefix })) {
      entries.push({
        key: entry.key,
        value: entry.value,
        versionstamp: entry.versionstamp,
      });
    }
    return entries;
  }

  /**
   * 特定のprojectのページを取得する
   */
  async listByProject(webhookId: string, projectName: string) {
    const entries = [];
    const prefix: Deno.KvKey = [
      "webhookId",
      webhookId,
      "projectName",
      projectName,
    ];
    for await (const entry of this.kv.list<Page>({ prefix })) {
      entries.push({
        key: entry.key,
        value: entry.value,
        versionstamp: entry.versionstamp,
      });
    }
    return entries;
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
}
