import { assertEquals, assertRejects } from "@std/assert";
import { EUploadMimeType } from "twitter-api-v2";
import {
  canAttachXMedia,
  readImageWithSizeLimit,
  selectThumbnailUrls,
} from "../services/notification/x.service.ts";
import { Page } from "../types.ts";

Deno.test("X通知 - サムネイルURLを重複なしで4件まで選ぶ", () => {
  const pages: Page[] = [
    "one",
    "two",
    "one",
    "three",
    "four",
    "five",
  ].map((name) => ({
    projectName: "test-project",
    name,
    link: `https://scrapbox.io/test-project/${name}`,
    thumbnailUrl: `https://example.com/${name}.png`,
    authors: ["TestAuthor"],
    updatedAt: "2026-08-09T12:00:00+09:00",
  }));

  assertEquals(selectThumbnailUrls(pages), [
    "https://example.com/one.png",
    "https://example.com/two.png",
    "https://example.com/three.png",
    "https://example.com/four.png",
  ]);
});

Deno.test("X通知 - GIFと他の画像を混在させない", () => {
  assertEquals(canAttachXMedia([], EUploadMimeType.Gif), true);
  assertEquals(
    canAttachXMedia([EUploadMimeType.Gif], EUploadMimeType.Png),
    false,
  );
  assertEquals(
    canAttachXMedia([EUploadMimeType.Png], EUploadMimeType.Gif),
    false,
  );
  assertEquals(
    canAttachXMedia([EUploadMimeType.Png], EUploadMimeType.Jpeg),
    true,
  );
  assertEquals(
    canAttachXMedia(
      [
        EUploadMimeType.Png,
        EUploadMimeType.Jpeg,
        EUploadMimeType.Png,
        EUploadMimeType.Webp,
      ],
      EUploadMimeType.Jpeg,
    ),
    false,
  );
});

Deno.test("X通知 - Content-Lengthが上限を超える画像を拒否する", async () => {
  const response = new Response(new Uint8Array([1]), {
    headers: { "Content-Length": "6" },
  });

  await assertRejects(
    () => readImageWithSizeLimit(response, 5),
    Error,
    "Image exceeds size limit of 5 bytes",
  );
});

Deno.test("X通知 - Content-Lengthがなくても読み込み中に上限を検査する", async () => {
  const response = new Response(new Uint8Array([1, 2, 3, 4, 5, 6]));

  await assertRejects(
    () => readImageWithSizeLimit(response, 5),
    Error,
    "Image exceeds size limit of 5 bytes",
  );
});

Deno.test("X通知 - 空の画像を拒否する", async () => {
  const response = new Response(new Uint8Array());

  await assertRejects(
    () => readImageWithSizeLimit(response, 5),
    Error,
    "Image response body is empty",
  );
});
