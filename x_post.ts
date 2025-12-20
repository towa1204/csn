import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: Deno.env.get("API_KEY")!,
  appSecret: Deno.env.get("API_KEY_SECRET")!,
  accessToken: Deno.env.get("ACCESS_TOKEN")!,
  accessSecret: Deno.env.get("ACCESS_TOKEN_SECRET")!,
});

const rwClient = client.readWrite;

const tweet = await rwClient.v2.tweet("Hello World from Deno!");

console.log("Tweeted:", tweet.data);
