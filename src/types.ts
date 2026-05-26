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

