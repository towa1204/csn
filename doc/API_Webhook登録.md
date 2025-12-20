# API仕様: Webhook ID登録

## エンドポイント

```
POST /api/admin/webhooks
```

## 概要

webhookIdをDeno
KVに登録するための管理用APIです。登録されたwebhookIdのみが、`/api/webhooks/:webhookId/slack`
エンドポイントでWebhookを受信できます。

## 認証

**必須**: 環境変数 `ADMIN_API_KEY` の設定が必要です。

リクエストボディに `apiKey` フィールドを含め、環境変数 `ADMIN_API_KEY`
と一致する値を指定する必要があります。

## リクエスト

### ヘッダー

```
Content-Type: application/json
```

### ボディ

| フィールド | 型     | 必須 | 説明                                                           |
| ---------- | ------ | ---- | -------------------------------------------------------------- |
| webhookId  | string | ✅   | 登録するwebhookID（英数字、ハイフン、アンダースコアのみ）      |
| apiKey     | string | ✅   | 管理用APIキー（環境変数 `ADMIN_API_KEY` と一致する必要がある） |

### リクエスト例

```bash
curl -X POST https://your-domain.deno.dev/api/admin/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": "my-project-webhook",
    "apiKey": "your-secret-api-key"
  }'
```

## レスポンス

### 成功: 新規登録 (201 Created)

```json
{
  "status": "registered",
  "webhookId": "my-project-webhook"
}
```

### 成功: 既に登録済み (200 OK)

```json
{
  "status": "already_registered",
  "webhookId": "my-project-webhook",
  "message": "This webhook ID is already registered"
}
```

### エラー: webhookId未指定 (400 Bad Request)

```
webhookId is required
```

### エラー: apiKey未指定 (400 Bad Request)

```
apiKey is required
```

### エラー: 無効なwebhookId形式 (400 Bad Request)

```
webhookId must contain only alphanumeric characters, hyphens, and underscores
```

### エラー: 認証失敗 (401 Unauthorized)

```
Unauthorized
```

### エラー: サーバー設定エラー (500 Internal Server Error)

環境変数 `ADMIN_API_KEY` が設定されていない場合：

```
Server configuration error
```

## バリデーションルール

### webhookId

- **必須フィールド**
- **形式**: 英数字 (a-z, A-Z, 0-9)、ハイフン (-)、アンダースコア (_) のみ
- **例**: `my-webhook-123`, `project_webhook`, `webhook-001`
- **NGケース**: スペース、特殊文字を含む

### apiKey

- **必須フィールド**
- 環境変数 `ADMIN_API_KEY` に設定された値と完全一致する必要がある

## 環境変数設定

### 本番環境（Deno Deploy）

1. Deno Deployダッシュボードにアクセス
2. プロジェクトの "Settings" → "Environment Variables" を開く
3. 以下を追加:
   - Key: `ADMIN_API_KEY`
   - Value: 任意の安全な文字列（推奨: 32文字以上のランダムな文字列）

### ローカル開発環境

`.env` ファイルに記載:

```env
ADMIN_API_KEY=your-development-api-key
```

実行時:

```bash
deno task start --env
```

## セキュリティ考慮事項

1. **APIキーの管理**
   - APIキーは環境変数で管理し、コードにハードコーディングしない
   - 本番環境では強力なAPIキーを使用する（推奨: 32文字以上）
   - 定期的にAPIキーをローテーションする

2. **アクセス制御**
   - このAPIは管理者専用です
   - 公開されたクライアント側のコードには含めない
   - サーバーサイドまたはCI/CDパイプラインからのみ呼び出す

3. **監査ログ**
   - 登録リクエストはコンソールログに記録される
   - 本番環境では適切なログ管理システムで監視を推奨

## 使用例

### シナリオ1: 新しいプロジェクト用のwebhookIdを登録

```bash
# APIキーを環境変数から取得
API_KEY=$(cat .env | grep ADMIN_API_KEY | cut -d '=' -f2)

# webhookIdを登録
curl -X POST https://your-app.deno.dev/api/admin/webhooks \
  -H "Content-Type: application/json" \
  -d "{
    \"webhookId\": \"new-project-webhook\",
    \"apiKey\": \"$API_KEY\"
  }"
```

### シナリオ2: スクリプトで複数のwebhookIdを一括登録

```typescript
// register-webhooks.ts
const ADMIN_API_KEY = Deno.env.get("ADMIN_API_KEY");
const API_URL = "https://your-app.deno.dev/api/admin/webhooks";

const webhookIds = [
  "project-a-webhook",
  "project-b-webhook",
  "project-c-webhook",
];

for (const webhookId of webhookIds) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ webhookId, apiKey: ADMIN_API_KEY }),
  });

  const result = await response.json();
  console.log(`${webhookId}: ${result.status}`);
}
```

実行:

```bash
deno run --allow-net --allow-env register-webhooks.ts
```

## 関連API

- [Webhook受信API](./API_Webhook受信.md) - 登録したwebhookIdでWebhookを受信
- [メッセージ送信API](./API_メッセージ送信.md) - 登録したwebhookIdのデータを通知

## トラブルシューティング

### Q: "Server configuration error" エラーが発生する

**A**: 環境変数 `ADMIN_API_KEY` が設定されていません。Deno
Deployの設定またはローカルの `.env` ファイルを確認してください。

### Q: "Unauthorized" エラーが発生する

**A**: リクエストの `apiKey` が環境変数 `ADMIN_API_KEY`
と一致していません。APIキーを確認してください。

### Q: webhookIdの登録確認方法は？

**A**: 同じwebhookIdでもう一度登録リクエストを送信すると、`already_registered`
ステータスが返されます。

### Q: 登録したwebhookIdを削除するには？

**A**: 現在、削除APIは未実装です。Deno KV
Viewerまたは直接KVデータベースから削除する必要があります。

## 変更履歴

- **2025-12-20**: 初版作成
  - APIキー認証を必須化
  - バリデーション機能追加
  - 重複チェック機能追加
