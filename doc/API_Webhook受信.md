# Cosense Webhook受信

## エンドポイント

```
POST /api/webhooks/{webhookId}/slack
```

## 説明

CosenseからのWebhookを受信し、ページ情報をDeno KVに保存する。
同一ページが複数回更新された場合は著者情報をマージし、一週間以上前の古いデータは自動的に削除される。

## リクエスト

### パスパラメータ

| パラメータ名 | 型     | 必須 | 説明          | 例           |
| ------------ | ------ | ---- | ------------- | ------------ |
| webhookId    | string | はい | Webhook識別子 | test-webhook |

### リクエストボディ

```json
{
  "text": "更新通知テキスト",
  "mrkdown": true,
  "username": "Scrapbox",
  "attachments": [
    {
      "title": "ページタイトル",
      "title_link": "https://scrapbox.io/project-name/PageName",
      "text": "ページ本文の抜粋",
      "rawText": "ページの生テキスト",
      "mrkdwn_in": ["text"],
      "author_name": "更新者名",
      "thumb_url": "https://example.com/thumbnail.jpg"
    }
  ]
}
```

#### ボディパラメータ

| パラメータ名              | 型       | 必須   | 説明                           |
| ------------------------- | -------- | ------ | ------------------------------ |
| text                      | string   | はい   | 更新通知のテキスト             |
| mrkdown                   | boolean  | はい   | Markdown形式かどうか           |
| username                  | string   | はい   | 送信元ユーザー名               |
| attachments               | array    | はい   | ページ情報の配列（空配列不可） |
| attachments[].title       | string   | はい   | ページ名                       |
| attachments[].title_link  | string   | はい   | ページURL                      |
| attachments[].text        | string   | はい   | ページ本文                     |
| attachments[].rawText     | string   | はい   | 生テキスト                     |
| attachments[].mrkdwn_in   | string[] | はい   | Markdown適用対象               |
| attachments[].author_name | string   | はい   | 更新者名                       |
| attachments[].thumb_url   | string   | いいえ | サムネイルURL                  |

### バリデーション仕様

| 項目        | 検証内容           | エラー時のHTTPステータス |
| ----------- | ------------------ | ------------------------ |
| attachments | 配列が存在すること | 400                      |
| attachments | 空配列でないこと   | 400                      |

## レスポンス

### 成功時 (200 OK)

```json
{
  "status": "received",
  "count": 1
}
```

| フィールド名 | 型     | 説明                                 |
| ------------ | ------ | ------------------------------------ |
| status       | string | 処理ステータス（固定値: "received"） |
| count        | number | 処理されたページ数                   |

### エラー時

#### 400 Bad Request

attachmentsが空または存在しない場合

```json
No attachments
```

#### 500 Internal Server Error

予期しないエラーが発生した場合

```json
{
  "status": "error",
  "message": "エラーの詳細メッセージ"
}
```

## 使用例

### 例1: 単一ページの更新通知

```bash
POST /api/webhooks/my-webhook/slack
Content-Type: application/json

{
  "text": "ページが更新されました",
  "mrkdown": true,
  "username": "Scrapbox",
  "attachments": [
    {
      "title": "プロジェクト概要",
      "title_link": "https://scrapbox.io/my-project/ProjectOverview",
      "text": "プロジェクトの概要ページです",
      "rawText": "プロジェクトの概要ページです",
      "mrkdwn_in": ["text"],
      "author_name": "田中太郎"
    }
  ]
}
```

**レスポンス**

```json
{
  "status": "received",
  "count": 1
}
```

### 例2: 複数ページの更新通知

```bash
POST /api/webhooks/my-webhook/slack
Content-Type: application/json

{
  "text": "複数ページが更新されました",
  "mrkdown": true,
  "username": "Scrapbox",
  "attachments": [
    {
      "title": "技術メモ",
      "title_link": "https://scrapbox.io/my-project/TechNote",
      "text": "技術的なメモ",
      "rawText": "技術的なメモ",
      "mrkdwn_in": ["text"],
      "author_name": "佐藤花子"
    },
    {
      "title": "議事録",
      "title_link": "https://scrapbox.io/my-project/Minutes",
      "text": "会議の議事録",
      "rawText": "会議の議事録",
      "mrkdwn_in": ["text"],
      "author_name": "鈴木一郎"
    }
  ]
}
```

**レスポンス**

```json
{
  "status": "received",
  "count": 2
}
```
