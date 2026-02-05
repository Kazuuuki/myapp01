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
  images: string[];
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
  memo: string | null;
  createdAt: string; // ISO string
};

export type ExerciseWithSets = {
  exercise: Exercise;
  sets: SetRecord[];
  lastSet: SetRecord | null;
  lastSessionDate: string | null;
  lastSessionSets: SetRecord[];
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

export type ChatMessageRole = 'user' | 'bot';

export type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: ChatMessageRole;
  text: string;
  createdAt: string;
};

export type ChatThreadSummary = ChatThread & {
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastMessageRole: ChatMessageRole | null;
};

export type UserProfileExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type UserProfileSex = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type UserProfile = {
  id: string;
  goal: string | null;
  frequencyPerWeek: number | null;
  sessionDurationMin: number | null;
  equipment: string | null;
  injuryOrPain: string | null;
  experienceLevel: UserProfileExperienceLevel | null;
  age: number | null;
  sex: UserProfileSex | null;
  heightCm: number | null;
  weightKg: number | null;
  updatedAt: string; // ISO string
};
