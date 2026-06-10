/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Sentence {
  french: string;
  english: string;
}

export type StoryLevel = "beginner" | "easy" | "intermediate";

export interface Story {
  id: string;
  title: string;
  level: StoryLevel;
  sentences: Sentence[];
  createdAt: number;
  isBuiltIn: boolean;
  fullTranslation?: string;
  glossary?: GlossaryEntry[];
}

export interface SessionAttempt {
  id: string;
  storyId: string;
  storyTitle: string;
  date: number; // Unix timestamp
  wpm: number;
  accuracy: number;
  errors: number;
  duration: number; // Duration in seconds
  hardestWords: string[];
}

export interface AppSettings {
  audioSpeed: "normal" | "slow";
  ttsApiKey: string; // Optional (e.g., ElevenLabs / OpenAI)
  theme: "light" | "dark";
  soundEffects: boolean;
  lettersComplete?: boolean;
  accentsComplete?: boolean;
  calibrationComplete?: boolean;
  bannerDismissed?: boolean;
  streakCount?: number;
  lastLessonDate?: string; // YYYY-MM-DD format
}

export interface GlossaryEntry {
  french: string;
  english: string;
  example?: string;
  raw?: string;
}

export interface Lesson {
  id: string;
  title: string;
  date: number; // Unix timestamp
  words: string[];
  sentences: string[];
  paragraph: string;
  translation: string;
  completed: boolean;
  glossary?: GlossaryEntry[];
}

export interface DrillSessionAttempt {
  id: string;
  date: number;
  duration: number; // in seconds
  totalTyped: number;
  accuracy: number;
  errors: number;
  errorsByChar: { [key: string]: number };
  wpm: number;
}

export type PracticeType = 
  | "story"
  | "letters"
  | "accents"
  | "calibration"
  | "free"
  | "flow"
  | "wordsShort"
  | "wordsLong"
  | "phrases"
  | "dictation"
  | "lesson"
  | "video-dictee";

export interface SrtCue {
  index: number;
  start: number;
  end: number;
  text: string;
}


