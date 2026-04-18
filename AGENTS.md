# Repository Guidelines

## プロジェクト構成
アプリ本体は `src/` 配下に置きます。実行エントリポイントは `src/main.ts`、Hono アプリの組み立ては `src/app.ts`、Deno KV へのアクセスは `src/kv.ts` が担当します。HTTP ハンドラは `src/routes/`、通知ロジックは `src/services/notification/` のように関心ごとごとに分離します。テストは `src/tests/` に集約し、`utils.test.ts` のように対象が分かる名前を付けてください。リポジトリ設定は `deno.json`、依存関係の固定は `deno.lock` で管理します。

## ビルド・テスト・開発コマンド
リポジトリ直下で Deno タスクを実行します。

- `deno task start`: 環境変数と KV を有効にして API を起動します。
- `deno task test`: `src/tests/` 配下のテストを一括実行します。
- `deno task test:watch`: 開発中にテストを監視実行します。
- `deno task test:coverage`: カバレッジを生成し、結果を表示します。
- `deno fmt`: ソースを Deno 標準フォーマットで整えます。
- `deno lint`: 静的解析で基本的な問題を検出します。

## コーディング規約と命名
TypeScript は Deno 流儀に合わせ、ローカル import では `.ts` 拡張子を明示してください。インデントや改行は `deno fmt` の出力をそのまま採用します。変数・関数は `camelCase`、クラスは `PascalCase` を使い、`PageRepository` のように役割が伝わる名前にします。ファイル名は `webhook.route.ts`、`x.service.ts` のように責務を含めてください。`src/app.ts` には配線だけを残し、処理本体は route や service に寄せます。

## テスト方針
テストファイルは `src/tests/` に置き、`*.test.ts` で命名します。Webhook 処理、通知メッセージ生成、KV を使う永続化まわりは正常系と異常系の両方を確認してください。コミット前に `deno task test` を実行し、挙動変更が大きい場合は `deno task test:coverage` も確認します。

## コミットと Pull Request
コミットメッセージは現状どおり Conventional Commits を基本にし、`feat: ...`、`fix: ...` の形式を使います。件名は短く、1コミット1目的を意識してください。Pull Request には変更概要、影響するエンドポイントやサービス、実行したテスト、API の挙動変更がある場合はサンプル payload を含めてください。

## セキュリティと設定
秘密情報や環境依存の値はコミットしないでください。設定が必要な場合は環境変数を使い、例示はダミー値に置き換えます。`--env` や Deno KV 権限が必要な変更を入れる場合は、`deno.json` の task 定義もあわせて見直してください。
