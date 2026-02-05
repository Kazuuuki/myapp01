export const schemaStatements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    body_part TEXT,
    memo TEXT,
    image_uris TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS body_parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_preset INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS session_exercises (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS set_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    memo TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY,
    goal TEXT,
    frequency_per_week INTEGER,
    session_duration_min INTEGER,
    equipment TEXT,
    injury_or_pain TEXT,
    experience_level TEXT,
    age INTEGER,
    sex TEXT,
    height_cm REAL,
    weight_kg REAL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_set_records_session_exercise ON set_records(session_id, exercise_id);`,
  `CREATE INDEX IF NOT EXISTS idx_session_exercises_session_position ON session_exercises(session_id, position);`,
  `CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_body_parts_name ON body_parts(name);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_name_body_part ON exercises(name, body_part);`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON chat_threads(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_user_profile_updated_at ON user_profile(updated_at);`,
];
