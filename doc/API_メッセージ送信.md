# メッセージ送信

## エンドポイント

```
POST /api/message
```

## 説明

本APIが呼び出されると、外部サービス(Discord, X)へメッセージを送信する。
リクエストボディで、webhookId, 外部サービス, from_timstampを指定する。
webhookIDに紐づくプロジェクトからfrom_timestampで指定した時刻以降のページ更新履歴を取得し、指定した外部サービスで送信する。

## リクエスト

### リクエストボディ

```json
{
  "webhookId": "test-webhook",
  "notification": "Discord",
  "from_timestamp": "2025-12-20T16:05:06+09:00"
}
```

#### ボディパラメータ

| パラメータ名   | 型     | 必須 | 説明                                                         |
| -------------- | ------ | ---- | ------------------------------------------------------------ |
| webhookId      | string | はい | Webhook識別子                                                |
| notification   | string | はい | 通知サービス名(Discord or X)                                 |
| from_timestamp | string | はい | 時刻(ISO 8601)、指定した時刻以降に更新されたページが取得対象 |

### バリデーション仕様

| 項目           | 検証内容                                      | エラー時のHTTPステータス | エラーメッセージ                                         |
| -------------- | --------------------------------------------- | ------------------------ | -------------------------------------------------------- |
| 必須パラメータ | webhookId, notification, from_timestampが存在 | 400                      | webhookId, notification, and from_timestamp are required |
| notification   | 値が'Discord'または'X'                        | 400                      | notification must be 'Discord' or 'X'                    |
| from_timestamp | ISO 8601形式の日付文字列として有効            | 400                      | Invalid from_timestamp format. Expected ISO 8601 format  |

## レスポンス

### 成功時 (200 OK)

```json
{
  "status": "sent",
  "service": "Discord",
  "pageCount": 3
}
```

| フィールド名 | 型     | 説明                           |
| ------------ | ------ | ------------------------------ |
| status       | string | 送信ステータス（常に"sent"）   |
| service      | string | 送信先サービス（Discord or X） |
| pageCount    | number | 送信したページ数               |

### エラー時

- **400 Bad Request**: バリデーションエラー
  ```json
  {
    "message": "webhookId, notification, and from_timestamp are required"
  }
  ```

## 使用例

### Discord通知の送信

```bash
curl -X POST http://localhost:8000/api/message \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": "my-webhook",
    "notification": "Discord",
    "from_timestamp": "2025-12-20T00:00:00+09:00"
  }'
```

### X(Twitter)通知の送信

```bash
curl -X POST http://localhost:8000/api/message \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": "my-webhook",
    "notification": "X",
    "from_timestamp": "2025-12-19T12:00:00+09:00"
  }'
```
