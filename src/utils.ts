/**
 * 日本時間（JST）のISO 8601形式の日時文字列を返す
 * 例: 2025-12-20T15:56:31+09:00
 * new Date()でパース可能
 */
export function dateJSTTimeFormat(date: Date): string {
  // JSTに変換してISO 8601形式で出力
  const jstDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
  );

  // ISO形式の文字列を生成（タイムゾーンオフセット +09:00 を付与）
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, "0");
  const day = String(jstDate.getDate()).padStart(2, "0");
  const hours = String(jstDate.getHours()).padStart(2, "0");
  const minutes = String(jstDate.getMinutes()).padStart(2, "0");
  const seconds = String(jstDate.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}
