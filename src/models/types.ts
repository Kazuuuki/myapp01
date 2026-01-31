export type WeightUnit = 'kg' | 'lb';

export type WorkoutSession = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO string
};

export type Exercise = {
  id: string;
  name: string;
  bodyPart: string | null;
  memo: string | null;
};

export type BodyPart = {
  id: string;
  name: string;
};

export type SessionExercise = {
  id: string;
  sessionId: string;
  exerciseId: string;
  position: number;
};

export type SetRecord = {
  id: string;
  sessionId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  createdAt: string; // ISO string
};

export type ExerciseWithSets = {
  exercise: Exercise;
  sets: SetRecord[];
  lastSet: SetRecord | null;
  position: number;
};

export type SessionWithStats = {
  id: string;
  date: string;
  startTime: string;
  exerciseCount: number;
  setCount: number;
};

export type SessionDateSummary = {
  date: string;
  sessionId: string;
  exerciseCount: number;
  setCount: number;
};

export type SessionDetail = {
  session: WorkoutSession;
  items: {
    exercise: Exercise;
    sets: SetRecord[];
    position: number;
  }[];
};

export type ExerciseHistoryItem = {
  set: SetRecord;
  sessionDate: string;
};

export type ExerciseSummary = {
  exercise: Exercise;
  recent: ExerciseHistoryItem[];
  bestVolume: number | null;
  maxWeight: number | null;
  maxReps: number | null;
};
