# トレーニングログ MVP 実装ガイド

## 0. 目的と前提
- **目的**: 今日のトレーニング記録を素早く追加・編集し、過去履歴を確認できるアプリを MVP として完成させる。
- **技術**: Expo（iPhone/Expo Go 想定）/ React Native / expo-sqlite。
- **設計方針**: UI はシンプルで即操作できること。データは SQLite に保存し、ローカル完結。

---

## 1. プロジェクト構成（主要フォルダ）
- `src/db/` SQLite 接続・初期化
- `src/models/` 型定義
- `src/repo/` SQL を発行するリポジトリ層
- `src/usecases/` 画面ロジック（ユースケース）
- `src/ui/` 再利用 UI コンポーネント
- `src/state/` 状態管理（Undo など）

**主要ファイル**
- `src/models/types.ts`
- `src/db/schema.ts`
- `src/db/client.ts`
- `src/repo/workoutRepo.ts`
- `src/repo/exerciseRepo.ts`
- `src/repo/setRepo.ts`
- `src/usecases/today.ts`
- `src/usecases/history.ts`
- `src/usecases/exerciseDetail.ts`
- `src/state/todaySession.ts`
- `src/ui/SetChip.tsx`
- `src/ui/ExerciseCard.tsx`
- `src/ui/NumberStepper.tsx`

---

## 2. DB スキーマ（SQLite）
### 2.1 テーブル
- `workout_sessions`
  - `id` TEXT PRIMARY KEY
  - `date` TEXT (YYYY-MM-DD)
  - `start_time` TEXT (ISO)
- `exercises`
  - `id` TEXT PRIMARY KEY
  - `name` TEXT
  - `memo` TEXT NULL
- `session_exercises`
  - `id` TEXT PRIMARY KEY
  - `session_id` TEXT
  - `exercise_id` TEXT
  - `position` INTEGER
- `set_records`
  - `id` TEXT PRIMARY KEY
  - `session_id` TEXT
  - `exercise_id` TEXT
  - `weight` REAL
  - `reps` INTEGER
  - `created_at` TEXT

### 2.2 インデックス
- `set_records(session_id, exercise_id)`
- `session_exercises(session_id, position)`
- `workout_sessions(date)`

---

## 3. Repository 層（SQL ラッパ）
### 3.1 workoutRepo
- `createSession(date, startTime)`
- `getSessionByDate(date)`
- `getRecentSessions(limit)`
- `deleteAll()`

### 3.2 exerciseRepo
- `createExercise(name)`
- `updateExerciseMemo(id, memo)`
- `getAllExercises()`
- `getExerciseById(id)`

### 3.3 setRepo
- `addSet(sessionId, exerciseId, weight, reps)`
- `updateSet(id, weight, reps)`
- `deleteSet(id)`
- `getSetsBySession(sessionId)`
- `getLastSetByExercise(exerciseId)`
- `getLastSessionByExercise(exerciseId)`
- `getRecentHistoryByExercise(exerciseId, limit)`

---

## 4. Usecase 層（画面ロジック）
### 4.1 today.ts
- `getOrCreateTodaySession(date)`
  - 日付に紐づくセッションを取得。なければ作成。
- `addExerciseToToday(sessionId, exerciseId)`
- `addSetQuick(sessionId, exerciseId)`
  - 直近の重量/回数をデフォルト値として追加。
- `updateSetQuick(setId, weight, reps)`
- `undoLastAction()`

### 4.2 history.ts
- `listSessionsWithStats()`
  - 日付順にセッションを取得し、種目数・セット数を集計。
- `getSessionDetail(sessionId)`
  - セッションの種目とセット一覧を取得。

### 4.3 exerciseDetail.ts
- `getExerciseSummary(exerciseId)`
  - 最近の履歴、最大重量/回数/ボリュームを取得。

---

## 5. 画面構成と挙動
### 5.1 Today（`app/(tabs)/index.tsx`）
1. `getOrCreateTodaySession` で当日セッションを取得
2. 種目カード一覧表示
3. 種目追加 / セット追加 / セット更新
4. Undo ボタンで直前の操作を取り消し

使用 UI: `ExerciseCard`, `SetChip`, `NumberStepper`

### 5.2 種目詳細（`app/exercise/[id].tsx`）
1. `getExerciseSummary` で集計
2. 直近履歴の表示
3. メモ更新

### 5.3 履歴一覧（`app/(tabs)/explore.tsx`）
1. `listSessionsWithStats` で履歴取得
2. 日付別に表示
3. セッション詳細へ遷移

### 5.4 セッション詳細（`app/session/[id].tsx`）
1. `getSessionDetail` で詳細取得
2. 種目・セットの閲覧

### 5.5 設定（`app/(tabs)/settings.tsx`）
1. 単位設定（kg/lb）
2. JSON/CSV エクスポート
3. 全削除

---

## 6. Undo 仕様
- `src/state/lastAction` に直前操作を保存
- 対象操作
  - set 追加
  - set 更新
  - set 削除
- Undo は 1 回分のみ

---

## 7. エクスポート
- JSON: 全テーブルを出力
- CSV: `set_records` を出力（主に分析用）

---

## 8. 実装順（推奨）
1. DB schema & repo
2. today usecase + Today 画面
3. セッション詳細・履歴一覧
4. 種目詳細
5. 設定/エクスポート
6. Undo

---

## 9. QA チェック
- 追加/更新/削除が保存される
- Undo が期待通り動作する
- 履歴一覧・セッション詳細の整合性が取れている
- 種目詳細の集計値が正しい

---

## 10. 注意点
- 日付はローカル日付（YYYY-MM-DD）で一貫させる
- 1日1セッション前提（複数にするなら設計変更が必要）
- 初回起動時の DB 初期化タイミングに注意
