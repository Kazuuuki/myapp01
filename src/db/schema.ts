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
    memo TEXT
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
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_set_records_session_exercise ON set_records(session_id, exercise_id);`,
  `CREATE INDEX IF NOT EXISTS idx_session_exercises_session_position ON session_exercises(session_id, position);`,
  `CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);`,
];
