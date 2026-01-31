# AIチャット：送信リクエスト方針メモ

## 現状（2026-01-31）
- 送信先: `POST https://j81fg03kb7.execute-api.ap-northeast-1.amazonaws.com/ai/chat`
  - 定義: `constants/ai-config.ts`
- アプリから送っている内容:
  - `text`: ユーザー入力テキスト
  - `history`（任意）: 直近の会話履歴（最大10件、`failed` は除外）
  - 実装: `app/(tabs)/chat/[threadId].tsx`（`buildHistory` / `sendToApi`）

## 目的
- AIの回答を「安全で」「ブレにくく」「アプリUIで扱いやすい」形にする。
- ユーザーごとにパーソナライズ（目的、制約、痛み、器具、直近の状況）できるようにする。
- 送信する情報は必要最小限（プライバシー/コスト/レイテンシ配慮）。

## 方針（考え方）
追加する内容は次の2系統に分けて検討する。

1) **出力を安定させるための固定情報（毎回付与してよい）**
- 安全注意（医療助言をしない、危険行為の回避）
- 口調/言語（日本語、丁寧/簡潔）
- 出力フォーマット（Markdown or JSON、見出し、箇条書きなど）

2) **判断材料（状況依存で必要なときだけ付与）**
- プロフィール（変化しにくい）
- 履歴サマリ（直近4週間など）
- 今回のコンテキスト（今日の目的/時間/疲労/痛み）
- 選択中の種目（今見ている種目ID/名称/注意点）

## 追加候補（リクエスト項目案）
### A. 固定（system 相当）
- `system`（string）: 毎回付与する指示文（安全・出力形式・禁止事項）
- `outputFormat`（`"markdown" | "json"`）: UI都合で固定しやすい

#### system テンプレ（叩き台）
まずは Markdown 出力で固定し、UI側の表示も安定させる。
送信時はこのテンプレをそのまま `system` に入れる想定。

```
あなたは筋トレの安全なフォーム改善とトレーニング提案を行うアシスタントです。
以下のルールを必ず守ってください。

# 安全（最優先）
- 危険なフォーム、無理な高重量、痛みを我慢する提案はしない。
- 痛み・しびれ・めまい・鋭い痛み・悪化傾向がある場合は中止を提案し、必要に応じて医療機関の受診を促す。
- 医療行為ではないことを明記する。

# 禁止事項
- 診断、治療、投薬、リハビリの指示などの医療助言はしない。
- 「必ず治る」「絶対に安全」など断定しない。

# 言語・トーン
- 日本語で、簡潔に、箇条書き中心。
- 断定ではなく、観察ポイントと試す手順を優先する。

# 出力フォーマット（Markdown）
次の見出し順で出力する（該当がなければ省略可）:
## 重要（安全）
## 改善ポイント（優先度順）
## 次に試すこと（手順）
## 補足（注意・代替案）
```

### B. ユーザー前提（profile）
- `profile`（object）例
  - `goal`（筋肥大/減量/パフォーマンス等）
  - `frequencyPerWeek`, `sessionDurationMin`
  - `equipment`（自宅/ジム、使える器具）
  - `injuryOrPain`（痛み/違和感、禁止動作）
  - `experienceLevel`（初心者/中級/上級）
  - `age`（任意・自己申告）
  - `heightCm`, `weightKg`（任意・自己申告）
  - `avoidExercises`（任意・避けたい/できない種目。例: ベンチプレス、スクワット など）

### C. 履歴（trainingSummary）
※ 現状の履歴は **`history`（会話履歴）** のみ送信している。 （直近10件のみ送信）
`trainingSummary`（トレーニング履歴サマリ）は **未実装**。

まずは `trainingSummary` を **テキスト1本**（string）で始めるのが現実的（API側/モデル側の自由度が高い）。
将来、必要になったら構造化（object）に移行。

例（テキスト）:
- 直近4週間サマリ（頻度、上位種目、ボリューム、疲労シグナル）
- 直近2〜3回のセッション抜粋

### D. 今回の文脈（currentContext）
- `currentContext`（object）例
  - `todayGoal`
  - `timeLimitMin`
  - `notes`（眠気/疲労/痛み）
  - `constraints`（避けたい種目/動作）

### E. 選択中の種目（selectedExercise）
- `selectedExerciseId`（string）: 画面で開いてる種目のID
- `selectedExerciseName`（string）: 表示名
- `exerciseNotes`（string）: 注意点（痛みが出る等）

### F. 運用メタ
- `locale`（例: `ja-JP`）
- `timezone`（例: `Asia/Tokyo`）
- `appVersion`（ログ/解析用）

## まず決めたいこと（質問）
- 返答の主目的はどれ？
  - フォーム指導（安全/改善ポイント）
  - メニュー提案（種目/セット/回数/重量）
  - 両方（優先順位は？）
- 出力はどっちで固定する？
  - Markdown（実装が楽、柔軟）
  - JSON（UIが安定、API/プロンプト設計が必要）
- 個人情報（身長体重等）を毎回送る方針でOK？
  - 送信最小化したい場合は、API側で「ユーザーID→プロフィール参照」に寄せる設計も検討。

## 実装メモ（編集ポイント）
- リクエスト型/ビルダー:
  - `constants/ai-config.ts`（`AiChatRequest` / `buildAiChatRequest`）
- 履歴の取り方:
  - `app/(tabs)/chat/[threadId].tsx`（`buildHistory`）
- 送信処理:
  - `app/(tabs)/chat/[threadId].tsx`（`sendToApi`）

## 次のTODO（候補）
1. `system`（固定指示）と `outputFormat` を追加して、回答のブレをまず減らす
2. `profile` の最小セットを決める（goal / equipment / injuryOrPain / frequency）
3. `trainingSummary` を「テキスト」でまず送る（SQLiteから作るのは後続）
4. API側が受け取れる形（スキーマ/最大文字数）を確認して調整
