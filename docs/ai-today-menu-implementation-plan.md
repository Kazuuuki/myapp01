# AI「今日の筋トレメニュー提案」機能 実装計画（このまま実装できる版）

このドキュメントは「設計のたたき台」ではなく、**必要な変更箇所・型・データフロー・疑似コード・エッジケース**まで書き切って、これだけで実装着手できることを目的にしています。

---

## 0. 既存実装の前提（この機能が乗る場所）
- Today は `app/(tabs)/index.tsx` → `src/ui/SessionDayScreen.tsx` で表示している。
- Today のデータ操作は `src/state/todaySession.ts`（hook）経由で `src/usecases/today.ts` → `src/repo/*` を使う構造。
- AI呼び出しはチャット側 `app/(tabs)/chat/[threadId].tsx` が `constants/ai-config.ts` の `buildAiChatRequest()` と `AI_CHAT_ENDPOINT` を使用。
- ユーザープロフィールは `src/usecases/userProfile.ts` の `formatUserProfileForPrompt(profile)` を利用可能。

---

## 1. 仕様（MVP）
### 1.1 ユーザー体験
1) Today 画面に `AI提案` ボタンがある  
2) 押すとモーダルが開き、以下を選べる
   - 部位（BodyPart Picker）
   - 今日の目的（任意: 例 筋肥大 / 強度 / 軽め / フォーム）
   - 時間上限（任意: 30/45/60）
   - 追加方法（append / replace）
3) `生成` でAIに問い合わせ → 提案メニューがプレビュー表示
4) `今日に追加` を押すと、提案が **今日のセッションに反映**（種目追加 + セット作成）される

### 1.2 プロフィール未設定時
- `getUserProfile()` が null なら、モーダル内で
  - `プロフィールを設定`（`/profile`へ遷移）
  - `プロフィールなしで生成`（続行）
を選べるようにする（チャット画面と同じ思想）。

### 1.3 履歴が無い/少ない時
- 履歴サマリが空でも生成可能（AIへの文脈は「履歴なし」と明示）。

---

## 2. AI出力フォーマット（必須: JSON固定）
フロントで壊れずに扱うため、**必ず JSON だけ**を返させる（Markdownやコードフェンス禁止）。

### 2.1 JSONスキーマ（MVP用に“DBに落としやすい”形へ最小化）
AIが返す JSON は以下の形（必須項目は `*`）。

```json
{
  "version": 1,
  "title": "今日の背中（45分）",
  "warnings": ["痛みがある場合は中止/軽減", "医療行為ではありません"],
  "rationale": ["直近で背中の頻度が低め", "回復を見てボリュームは中程度"],
  "items": [
    {
      "bodyPart": "背中",
      "exerciseName": "ラットプルダウン",
      "sets": [
        { "reps": 12, "weight": null, "rpe": 7, "restSec": 90, "memo": "可動域を優先" },
        { "reps": 12, "weight": null, "rpe": 8, "restSec": 90, "memo": null },
        { "reps": 12, "weight": null, "rpe": 8, "restSec": 90, "memo": null }
      ],
      "note": "肩に痛みが出るならグリップを変更"
    }
  ],
  "cooldown": ["広背筋ストレッチ 2分"]
}
```

#### フィールドの意味 / 実装上の扱い
- `items[]` が「今日に追加」対象（この配列だけDB反映すればMVP成立）
- `exerciseName` は **アプリ内の種目名**として保存される（`createExerciseAndAddToToday` が同名を拾う）
- `sets[]`
  - `reps` は **数値必須**（DBにそのまま入る）
  - `weight` は `number | null`（MVPでは null 推奨。後述の自動補完で埋める）
  - `memo` はセットのメモに入れる（`set_records.memo`）
- `note` は種目単位のメモ（MVPではセットの `memo` に付与するか、無視しても良い）

---

## 3. AIプロンプト（systemExtra）— そのままコピペで使う版
`systemExtra` は **モード切替**に使う。下記の文をそのまま文字列として利用する。

要件:
- **JSONのみ**返す
- **必ず上のスキーマ**（キー名固定）に従う
- `reps` は数値のみ（"8-12"禁止）
- `weight` は原則 null（履歴が明確な場合だけ数値を入れても良いが、MVPは null 運用推奨）

systemExtra（案）:
```
あなたはトレーニングメニュー作成アシスタントです。出力は必ずJSONのみ（先頭と末尾が { }）で、追加の文章・コードフェンス・Markdownは一切出力しないでください。

次のJSONスキーマに厳密に従ってください（キー名を変えない）:
- version: number (1)
- title: string
- warnings: string[]
- rationale: string[]
- items: { bodyPart: string, exerciseName: string, sets: { reps: number, weight: number|null, rpe?: number, restSec?: number, memo?: string|null }[], note?: string|null }[]
- cooldown: string[]

制約:
- reps は必ず整数（例 8, 10, 12）。範囲表現は禁止。
- weight は原則 null（ユーザーの履歴が明確にあり、推奨重量を述べる合理性がある場合のみ数値でも可）。
- 痛み/違和感の情報がある場合、安全を優先し回避・代替・ボリューム調整を行う。
- 医療行為ではない旨を warnings に必ず含める。
```

---

## 4. AIに渡す入力（text）の作り方（そのまま実装できる構成）
`text` は **「選択条件 + プロフィール + 最近履歴」** を連結したプレーンテキストでOK。

### 4.1 textテンプレ
```
<<TODAY_MENU_REQUEST>>
date: YYYY-MM-DD
selected_body_part: 背中
time_limit_min: 45
today_goal: 筋肥大
apply_strategy: append
locale: ja-JP
timezone: Asia/Tokyo
<</TODAY_MENU_REQUEST>>

<<USER_PROFILE>>
... formatUserProfileForPrompt(profile) ...
<</USER_PROFILE>>

<<RECENT_TRAINING_SUMMARY>>
... 下の 4.2 のサマリ ...
<</RECENT_TRAINING_SUMMARY>>
```

### 4.2 最近履歴サマリ（MVPの実装方法）
目的は「過不足なく短く」。以下の情報だけ出せば十分。

- 直近 `N=5` セッション（今日より前）の「日付 + 種目名の列挙（最大6個）」  
  - 取得: `getRecentSessions(8)` を呼び、`session.date < todayDate` のものから5件  
  - 各セッションの種目名: `getExercisesBySession(session.id)`（`src/repo/workoutRepo.ts` 既存）
- 選択部位に関連する “最近やった感”  
  - 上の5セッションの中で、`exercise.bodyPart === selectedBodyPart` が含まれる最新日付があれば `last_done_for_part: YYYY-MM-DD` を書く
  - 無ければ `last_done_for_part: unknown`

サマリ例（フォーマット固定で実装）:
```
recent_sessions:
- 2026-02-03: ベンチプレス, インクラインDB, ケーブルフライ
- 2026-02-01: スクワット, レッグプレス, レッグカール
- 2026-01-30: ラットプルダウン, シーテッドロー, アームカール

last_done_for_selected_part: 2026-01-30
note: 履歴が少ない場合は初心者向け・安全寄りに提案してください
```

---

## 5. 実装するファイル一覧（ここに書いた通りに作業すれば通る）
### 5.1 `constants/ai-config.ts`（変更）
目的: Todayメニュー用に `outputFormat: 'json'` を指定できるようにする（現状は常に `'markdown'` 固定）。

変更内容:
- `BuildAiChatRequestOptions` に `outputFormat?: 'markdown' | 'json'` を追加
- `buildAiChatRequest()` 内で `outputFormat` を options から受け取れるようにする（デフォルトは `'markdown'` のまま）

期待する最終シグネチャ:
- `buildAiChatRequest(text, history?, { systemExtra?, outputFormat? })`

### 5.2 `src/usecases/aiTodayMenu.ts`（新規）
責務:
1) 送信用 `text`（4章のテンプレ）生成
2) `fetch(AI_CHAT_ENDPOINT)` で問い合わせ
3) 返ってきた `data.text` から JSON を抽出・パース・軽いバリデーション
4) パース結果を “今日に追加” できる形へ正規化
5) Todayセッションへ反映（DB書き込み）

#### 5.2.1 型（このファイル内で定義でOK）
```ts
export type TodayMenuRequestOptions = {
  selectedBodyPart: string;
  timeLimitMin?: number;
  todayGoal?: string;
  applyStrategy: 'append' | 'replace';
};

export type AiTodayMenu = {
  version: 1;
  title: string;
  warnings: string[];
  rationale: string[];
  items: {
    bodyPart: string;
    exerciseName: string;
    note?: string | null;
    sets: {
      reps: number;
      weight: number | null;
      rpe?: number;
      restSec?: number;
      memo?: string | null;
    }[];
  }[];
  cooldown: string[];
};
```

#### 5.2.2 関数（疑似コード）
`buildTodayMenuText(date, profileBlock, recentSummary, options)`:
- 4.1テンプレに当てはめて文字列を返す

`requestAiTodayMenu(text, history?)`:
- `payload = buildAiChatRequest(text, history, { systemExtra: TODAY_MENU_SYSTEM_EXTRA, outputFormat: 'json' })`
- `fetch(AI_CHAT_ENDPOINT)` して `data.text` を取る
- `parseAiTodayMenuFromText(data.text)` で `AiTodayMenu` にする（次項）

`parseAiTodayMenuFromText(text)`:
- まず `JSON.parse(text)` を試す
- 失敗したら、テキスト内の最初の `{` と最後の `}` の間を切り出して `JSON.parse`（AIが余計な文字を付けた場合の救済）
- パース結果のバリデーション（最低限）
  - `version === 1`
  - `items` は配列、各 item に `exerciseName` と `sets[]`
  - `sets[].reps` が finite な number
- 不正なら例外を投げ、UIでエラー表示

`applyAiTodayMenuToSession(sessionId, menu, options)`:
- `replace` の場合:
  - Today 画面側で `useTodaySession(date).exercises` を持っているので、UIから `removeExercise(exerciseId)` を全件呼ぶ（削除確認を挟む）
  - もしくは usecase 側で `getTodayExercises(sessionId, date)` を呼んで削除（どちらでも良いが、MVPはUIからでOK）
- `menu.items` を順に適用:
  1) `exercise = await createExerciseAndAddToToday(sessionId, item.exerciseName, item.bodyPart)`
  2) 各 set について:
     - `weight = set.weight ?? (await getLastSetByExercise(exercise.id))?.weight ?? 0`
     - `memo` は `set.memo` に加えて `item.note` や `rpe/restSec` を1行で追記しても良い（例: `RPE8 rest90`）
     - `await addSet(sessionId, exercise.id, weight, set.reps, memo)`

使う既存関数:
- `createExerciseAndAddToToday()` は `src/usecases/today.ts` に既存
- `addSet()` と `getLastSetByExercise()` は `src/repo/setRepo.ts` に既存

### 5.3 `src/ui/SessionDayScreen.tsx`（変更）
目的: Today画面にUI導線を実装する。

追加する state（例）:
- `isAiOpen: boolean`（モーダル）
- `aiGenerating: boolean`
- `aiError: string | null`
- `aiMenu: AiTodayMenu | null`
- フォーム state（選択値）
  - `aiBodyPart: string`（Picker）
  - `aiTimeLimitMin: number | null`
  - `aiGoal: string`
  - `aiApplyStrategy: 'append' | 'replace'`

ボタン配置:
- 既存の「Add exercise」導線（`addTrigger`）の近くに、同じスタイルで `AI提案` ボタンを追加

モーダル内のボタン:
- `生成`（aiGenerating のとき disable）
- `今日に追加`（aiMenu が存在するときのみ有効）
- `閉じる`

生成処理（UI側でやること）:
- `profile = await getUserProfile()`（既存）
- `profileBlock = profile ? formatUserProfileForPrompt(profile) : ''`
- `recentSummary = await buildRecentTrainingSummary(date, selectedBodyPart)`（usecaseに置く）
- `text = buildTodayMenuText(...)`
- `menu = await requestAiTodayMenu(text)`（usecase）
- UI に `menu` を保持してプレビュー表示

追加処理（UI側でやること）:
- `replace` を選んでいたら、確認ダイアログの後に `removeExercise(exerciseId)` を `exercises` 分ループ
- `await applyAiTodayMenuToSession(session.id, menu, options)`
- `await refresh()`（`useTodaySession(date).refresh`）
- 成功アラートを出してモーダルを閉じる

---

## 6. 画面プレビュー表示（最小の表示仕様）
`aiMenu` があるとき、モーダルに以下を表示すれば十分。
- `menu.title`
- `warnings` を箇条書き（赤 or muted）
- `items[]` をカード表示
  - 種目名
  - `sets.length` と reps の列（例: `12, 12, 12`）
  - note があれば表示
- `今日に追加` ボタン

---

## 7. エラー処理（実装で迷わないためのルール）
### 7.1 AIリクエスト失敗
- `fetch` が失敗 / `response.ok` でない / JSONパース不可 → `aiError` にメッセージを入れてモーダル内に表示
- `Retry`（生成ボタンの再押下）で再試行できること

### 7.2 AIのJSONが壊れている
- `parseAiTodayMenuFromText()` が投げた例外は UI 側でキャッチして `aiError = "AIの返答を読み取れませんでした。もう一度お試しください。"` に統一してよい
- __DEV__ のときは raw text をログに出す（チャット画面の実装に寄せる）

### 7.3 replace時の削除確認
- `Alert.alert` で「今日の種目を全削除して置き換えますか？」を必須にする

---

## 8. 受け入れ条件（Doneの定義）
- Today画面に `AI提案` ボタンがあり、部位を選んで `生成` できる
- 生成された提案がモーダル内に表示される（タイトル + items）
- `今日に追加` で、提案の種目が今日に追加され、各 set が `set_records` に作成される
- プロフィール未設定でも、ユーザーが選べば生成できる（または `/profile` へ誘導できる）
- AI応答が壊れていてもアプリが落ちず、エラー表示 + リトライできる

---

## 9. 実装順（迷わない最短手順）
1) `constants/ai-config.ts` を拡張して `outputFormat: 'json'` を指定可能にする  
2) `src/usecases/aiTodayMenu.ts` を作り、`requestAiTodayMenu()` と `parseAiTodayMenuFromText()` まで通す（UI無しでもログで確認）  
3) `src/ui/SessionDayScreen.tsx` に `AI提案` ボタンとモーダルを追加し、「生成→プレビュー」まで繋ぐ  
4) `applyAiTodayMenuToSession()` を実装して `今日に追加` を繋ぐ（appendのみでもまずOK）  
5) replace戦略とエラーUXを整える（確認ダイアログ、リトライ）  
