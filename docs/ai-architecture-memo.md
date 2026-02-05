# AI 構成・役割メモ（現状）

## 全体像
- クライアント（Expoアプリ）→ API Gateway → Lambda → Amazon Bedrock（Converse）→ 返信
- AI用途は 2系統
  - **チャット（自由文/Markdown中心）**: `/ai/chat`
  - **今日メニュー提案（JSON厳守）**: `/ai/today-menu`

---

## エンドポイント別の役割

### 1) `/ai/chat`（AIチャット）
- 目的: フォーム改善、トレーニング相談、注意喚起などを **会話形式**で返す
- 出力: 文字列（Markdown想定）を `{ text: string }` で返す
- 入力（フロント→API）:
  - `text: string`（ユーザー入力）
  - `history?: { role: 'user'|'bot', text: string }[]`（任意）
  - `system?: string`（フロントが組み立てた system を渡せるようにする想定）
  - `systemExtra?: string`（プロフィール等の追記用。最終的に `system` に結合される想定）
  - `outputFormat?: 'markdown'|'json'`（現状は主にフロント都合の指定。バックエンド側での強制は任意）
- system の扱い（推奨）:
  - `body.system` があればそれを優先（なければデフォルト system）
  - 追加文脈（プロフィール）は `systemExtra` として付与（本文 `text` はユーザー入力のまま）
- 実装の起点（フロント）:
  - `app/(tabs)/chat/[threadId].tsx`（送信・履歴・UI）
  - `constants/ai-config.ts`（`AI_CHAT_ENDPOINT`, `buildAiChatRequest`）

### 2) `/ai/today-menu`（AI 今日メニュー提案）
- 目的: Today画面の「AI提案」から **今日のメニュー(JSON)** を返す（プレビュー→今日に追加）
- 出力: 原則 `{ menu: AiTodayMenu }`（パース済みJSONを返す）
  - `AiTodayMenu`（フロント側の期待）
    - `version: 1`
    - `title: string`
    - `warnings: string[]`
    - `rationale: string[]`
    - `items: { bodyPart, exerciseName, sets: { reps:number, weight:null, rpe?, restSec?, memo? }[], note? }[]`
    - `cooldown: string[]`
- 入力（フロント→API）:
  - `text: string`（タグ付きの統一フォーマット）
    - `<<TODAY_MENU_REQUEST>>`（date, selected_body_part, time_limit_min, today_goal, apply_strategy など）
    - `<<USER_PROFILE>>`（任意）
    - `<<RECENT_TRAINING_SUMMARY>>`（任意）
  - `history?: []`（基本未使用）
- system の扱い:
  - **バックエンド固定推奨**（JSON厳守・件数上限・weight=null・selected_body_part一致等）
  - JSONが壊れた場合の **再生成/修復リトライ**をバックエンドで実施（安定化）
- 実装の起点（フロント）:
  - `src/ui/SessionDayScreen.tsx`（AI提案モーダル、Generate/Add to Today）
  - `src/usecases/aiTodayMenu.ts`（リクエスト/パース/適用）
  - `constants/ai-config.ts`（`AI_TODAY_MENU_ENDPOINT`）

---

## フロント側の責務
- `/ai/chat`
  - `text` はユーザー入力をそのまま
  - プロフィールは `systemExtra` として渡す（本文に埋め込まない）
- `/ai/today-menu`
  - タグ付き `text` を生成して送る
  - 返ってきた `menu` をプレビュー表示
  - 「今日に追加」で `createExerciseAndAddToToday` + `addSet` に落とし込む
  - `weight: null` は直近重量（lastSet）で補完（なければ 0）

---

## バックエンド側の責務（推奨）
- `/ai/chat`
  - `body.system` / `body.systemExtra` を反映して Bedrock の `system` に渡す
  - 履歴を `messages` に変換して Converse を呼ぶ
- `/ai/today-menu`
  - system 固定（JSON厳守・短い出力・selected_body_part一致・weight=null）
  - JSONパース/バリデーション、失敗時の再生成/修復を実施
  - `{ menu: object }` を返してフロントのパース負担を減らす

---

## 設定/環境変数（例）
- `REGION`: `ap-northeast-1`
- `MODEL_ID`: `anthropic.claude-3-haiku-20240307-v1:0`

---

## ログ
- フロント（開発時）:
  - `src/usecases/aiTodayMenu.ts` で request/response/failure を `console.*`
- ローカルDB（アプリ内）:
  - `ai_logs` テーブルに today-menu の request/response/error を保存（デバッグ用）
  - `src/db/schema.ts`（`ai_logs` 作成）
  - `src/repo/aiLogRepo.ts`（保存）

