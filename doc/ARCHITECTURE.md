# プロジェクト構造

このドキュメントはプロジェクトの構造とベストプラクティスについて説明します。

## ディレクトリ構造

```
ssn/
├── config/              # 設定関連
│   └── env.ts          # 環境変数管理
├── services/           # ビジネスロジック
│   └── notification/   # 通知サービス
│       ├── types.ts            # 型定義
│       ├── discord.service.ts  # Discord実装
│       ├── x.service.ts        # X/Twitter実装
│       ├── factory.ts          # ファクトリーパターン
│       └── index.ts            # エクスポート
├── tests/              # テストファイル
│   ├── webhook.test.ts # Webhook関連テスト
│   ├── message.test.ts # メッセージ送信テスト
│   └── utils.test.ts   # ユーティリティテスト
├── doc/                # ドキュメント
├── app.ts              # アプリケーションロジック
├── main.ts             # エントリーポイント
├── kv.ts               # データアクセス層
├── types.ts            # 共通型定義
└── utils.ts            # ユーティリティ関数
```

## アーキテクチャパターン

### 1. レイヤードアーキテクチャ

- **プレゼンテーション層**: app.ts (Honoルーター)
- **ビジネスロジック層**: services/ (通知サービス)
- **データアクセス層**: kv.ts (PageRepository)

### 2. 依存性注入 (DI)

- コンストラクタインジェクション
- 環境変数をconfig層で管理
- テスタビリティの向上

### 3. ファクトリーパターン

- NotificationFactory: 通知サービスの生成を一元管理
- 拡張性の確保（新しい通知サービスの追加が容易）

### 4. リポジトリパターン

- PageRepository: KVへのアクセスを抽象化
- データソースの切り替えが容易

## ベストプラクティス

### コーディング規約

1. **不変性**: `readonly`の活用
2. **型安全性**: TypeScript型定義の徹底
3. **単一責任の原則**: 各クラス・関数は1つの責任のみ
4. **関心の分離**: 各層の責任を明確に分離

### テスト戦略

1. **ユニットテスト**: 各機能単位でテスト
2. **統合テスト**: エンドポイント単位でテスト
3. **モックDB**: インメモリKVでテスト実行
4. **カバレッジ**: 重要なビジネスロジックは100%を目標

### ファイル命名規則

- サービスクラス: `*.service.ts`
- テストファイル: `*.test.ts`
- 型定義: `types.ts`
- ファクトリー: `factory.ts`

## 拡張方法

### 新しい通知サービスの追加

1. `services/notification/`に新しいサービスファイルを作成
2. `NotificationServiceHandler`インターフェースを実装
3. `factory.ts`にケースを追加
4. `types.ts`に型定義を追加
5. テストファイルを作成

例:

```typescript
// services/notification/slack.service.ts
export class SlackService implements NotificationServiceHandler {
  constructor(private readonly config: SlackConfig) {}

  async send(pages: Page[]): Promise<void> {
    // 実装
  }
}
```

## 環境変数

必要な環境変数は`.env`ファイルに記載:

```env
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# X/Twitter
API_KEY=your_api_key
API_KEY_SECRET=your_api_key_secret
ACCESS_TOKEN=your_access_token
ACCESS_TOKEN_SECRET=your_access_token_secret
```
