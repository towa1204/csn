/**
 * CosenseからDiscordにWebhook送信するときのJSONスキーマ
 */
export type CosenseWebhookRequest = {
  "text": string;
  "mrkdown": boolean;
  "username": string;
  "attachments": {
    "title": string;
    "title_link": string;
    "text": string;
    "rawText": string;
    "mrkdwn_in": string[];
    "author_name": string;
    "thumb_url"?: string;
  }[];
};

/**
 * Deno KVに格納するPageのKey
 */
export type PageKey = [
  "webhookId",
  string,
  "projectName",
  string,
  "pageName",
  string,
];

/**
 * Deno KVに格納するPageのValue
 */
export type Page = {
  projectName: string;
  name: string;
  link: string;
  authors: string[];
  updatedAt: string;
};

/**
 * メッセージ送信APIのリクエスト
 */
export type MessageSendRequest = {
  webhookId: string;
  notification: "Discord" | "X";
  from_timestamp: string;
};

/**
 * 通知サービスの種類
 */
export type NotificationService = "Discord" | "X";
