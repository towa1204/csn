import { DiscordConfig, XConfig } from "../services/notification/index.ts";

/**
 * Discord設定を環境変数から取得
 */
export function getDiscordConfig(): DiscordConfig {
  return {
    webhookUrl: Deno.env.get("DISCORD_WEBHOOK_URL"),
  };
}

/**
 * X設定を環境変数から取得
 */
export function getXConfig(): XConfig {
  return {
    apiKey: Deno.env.get("API_KEY"),
    apiKeySecret: Deno.env.get("API_KEY_SECRET"),
    accessToken: Deno.env.get("ACCESS_TOKEN"),
    accessTokenSecret: Deno.env.get("ACCESS_TOKEN_SECRET"),
  };
}
