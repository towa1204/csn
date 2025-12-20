import { assertEquals } from "@std/assert";
import { extractProjectName } from "../app.ts";

Deno.test("extractProjectName - URLからプロジェクト名を抽出", () => {
  const url = "https://scrapbox.io/my-project/SomePage";
  const projectName = extractProjectName(url);
  assertEquals(projectName, "my-project");
});
