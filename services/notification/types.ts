import { Page } from "../../types.ts";

/**
 * 通知サービスの基底インターフェース
 */
export interface NotificationServiceHandler {
  send(pages: Page[]): Promise<void>;
}

/**
 * Discord通知サービスの設定
 */
export interface DiscordConfig {
  webhookUrl?: string;
}

/**
 * X通知サービスの設定
 */
export interface XConfig {
  apiKey?: string;
  apiKeySecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}

/**
 * 通知設定の型
 */
export type NotificationConfig = DiscordConfig | XConfig;
