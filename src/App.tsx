/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, 
  Settings, 
  RotateCcw, 
  BookOpen, 
  Volume2, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  X, 
  ChevronRight, 
  FileText, 
  ChevronDown, 
  TrendingUp, 
  AlertTriangle,
  History,
  Sparkles,
  Search,
  Check,
  Languages,
  ArrowRight,
  Keyboard,
  Video,
  Eye,
  EyeOff
} from "lucide-react";
import { Sentence, Story, StoryLevel, SessionAttempt, AppSettings, DrillSessionAttempt, Lesson, GlossaryEntry, SrtCue, PracticeType } from "./types";
import { 
  initDB, 
  getStories, 
  saveStory, 
  deleteStory, 
  getSessions, 
  saveSession, 
  getSettings, 
  saveSettings, 
  clearAllData, 
  dbExportJSON, 
  dbImportJSON,
  saveDrillSession,
  getDrillSessions,
  getLessons,
  saveLesson,
  deleteLesson
} from "./utils/db";
import { playSuccessSound, playErrorSound } from "./utils/sound";
import { FR_SHORT, FR_MEDIUM, FR_LONG } from "./data/frenchWords";
import { generateSentence } from "./data/sentenceGenerator";
import { GlossaryPanel, parseGlossaryStr } from "./components/GlossaryPanel";
import { ErrorModeToggle } from "./components/ErrorModeToggle";

const Fleuron: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`}>
    <span className="h-px w-16 bg-burgundy/30" />
    <svg viewBox="0 0 24 24" width="14" height="14" className="text-burgundy/60 fill-current animate-none">
      <path d="M12 2 L13 10 L21 11 L13 12 L12 22 L11 12 L3 11 L11 10 Z" />
    </svg>
    <span className="h-px w-16 bg-burgundy/30" />
  </div>
);

// Accent typing QWERTY combinations lookup helper
const ACCENT_HINTS: { [key: string]: { char: string; qwerty: string } } = {
  "é": { char: "é", qwerty: "Type: ' then e (or click 'é' icon)" },
  "è": { char: "è", qwerty: "Type: ` then e (or click 'è' icon)" },
  "à": { char: "à", qwerty: "Type: ` then a (or click 'à' icon)" },
  "ç": { char: "ç", qwerty: "Type: ' then c (or click 'ç' icon)" },
  "ù": { char: "ù", qwerty: "Type: ` then u (or click 'ù' icon)" },
  "ê": { char: "ê", qwerty: "Type: ^ (Shift+6) then e (or click 'ê' icon)" },
  "î": { char: "î", qwerty: "Type: ^ (Shift+6) then i (or click 'î' icon)" },
  "ô": { char: "ô", qwerty: "Type: ^ (Shift+6) then o (or click 'ô' icon)" },
  "ë": { char: "ë", qwerty: "Type: \" (Shift+') then e (or click 'ë' icon)" },
  "ï": { char: "ï", qwerty: "Type: \" (Shift+') then i (or click 'ï' icon)" },
  "œ": { char: "œ", qwerty: "Click the 'œ' key below (or substitute as needed)" },
  "æ": { char: "æ", qwerty: "Click the 'æ' key below" },
  "É": { char: "É", qwerty: "Type: Shift+' then E" },
  "È": { char: "È", qwerty: "Type: Shift+` then E" },
  "À": { char: "À", qwerty: "Type: Shift+` then A" },
  "Ç": { char: "Ç", qwerty: "Type: Shift+' then C" }
};

const AZERTY_ROWS = [
  // Row 1
  [
    { main: "²", sub: "" },
    { main: "&", sub: "1" },
    { main: "é", sub: "2" },
    { main: "\"", sub: "3" },
    { main: "'", sub: "4" },
    { main: "(", sub: "5" },
    { main: "-", sub: "6" },
    { main: "è", sub: "7" },
    { main: "_", sub: "8" },
    { main: "ç", sub: "9" },
    { main: "à", sub: "0" },
    { main: ")", sub: "°" },
    { main: "=", sub: "+" },
    { isSpecial: true, label: "RET. ARRIÈRE", width: "w-20 sm:w-24" }
  ],
  // Row 2
  [
    { isSpecial: true, label: "TAB", width: "w-10 sm:w-12" },
    { main: "a", sub: "A" },
    { main: "z", sub: "Z" },
    { main: "e", sub: "E" },
    { main: "r", sub: "R" },
    { main: "t", sub: "T" },
    { main: "y", sub: "Y" },
    { main: "u", sub: "U" },
    { main: "i", sub: "I" },
    { main: "o", sub: "O" },
    { main: "p", sub: "P" },
    { main: "^", sub: "¨" },
    { main: "$", sub: "£" }
  ],
  // Row 3
  [
    { isSpecial: true, label: "VERR. MAJ.", width: "w-12 sm:w-14" },
    { main: "q", sub: "Q" },
    { main: "s", sub: "S" },
    { main: "d", sub: "D" },
    { main: "f", sub: "F" },
    { main: "g", sub: "G" },
    { main: "h", sub: "H" },
    { main: "j", sub: "J" },
    { main: "k", sub: "K" },
    { main: "l", sub: "L" },
    { main: "m", sub: "M" },
    { main: "ù", sub: "%" },
    { main: "*", sub: "µ" },
    { isSpecial: true, label: "ENTRÉE", width: "w-16 sm:w-20" }
  ],
  // Row 4
  [
    { isSpecial: true, label: "MAJ.", width: "w-14 sm:w-18" },
    { main: "<", sub: ">" },
    { main: "w", sub: "W" },
    { main: "x", sub: "X" },
    { main: "c", sub: "C" },
    { main: "v", sub: "V" },
    { main: "b", sub: "B" },
    { main: "n", sub: "N" },
    { main: ",", sub: "?" },
    { main: ";", sub: "." },
    { main: ":", sub: "/" },
    { main: "!", sub: "§" },
    { isSpecial: true, label: "MAJ.", width: "w-16 sm:w-20" }
  ]
];

function getKeyMainForChar(char: string): string {
  if (!char) return "";
  const lower = char.toLowerCase();
  if (lower === "a") return "a";
  if (lower === "z") return "z";
  if (lower === "q") return "q";
  if (lower === "w") return "w";
  if (lower === "m") return "m";
  if (char === "é") return "é";
  if (char === "è") return "è";
  if (char === "ç") return "ç";
  if (char === "à") return "à";
  if (char === "ù") return "ù";
  if (["â", "ê", "î", "ô", "û", "ë", "ï"].includes(lower)) return "^";
  return lower;
}

function getKeysForChar(char: string): string[] {
  if (!char) return [];
  const lower = char.toLowerCase();
  if (lower === "é") return ["é"];
  if (lower === "è") return ["è"];
  if (lower === "ç") return ["ç"];
  if (lower === "à") return ["à"];
  if (lower === "ù") return ["ù"];
  
  if (lower === "â") return ["^", "a"];
  if (lower === "ê") return ["^", "e"];
  if (lower === "î") return ["^", "i"];
  if (lower === "ô") return ["^", "o"];
  if (lower === "û") return ["^", "u"];
  
  if (lower === "ë") return ["¨", "e"];
  if (lower === "ï") return ["¨", "i"];
  
  return [lower];
}

function getFingerHint(expectedKey: string): { hand: "left" | "right"; finger: string } {
  const k = expectedKey.toLowerCase();
  if (["a", "q", "1", "&", "²", "<"].includes(k)) return { hand: "left", finger: "Auriculaire (Pinky)" };
  if (["z", "w", "2", "é"].includes(k)) return { hand: "left", finger: "Annulaire (Ring)" };
  if (["e", "s", "x", "3", '"'].includes(k)) return { hand: "left", finger: "Majeur (Middle)" };
  if (["r", "d", "c", "t", "f", "v", "b", "4", "5", "'", "("].includes(k)) return { hand: "left", finger: "Index" };
  
  if (k === " ") return { hand: "left", finger: "Pouce (Thumb)" };
  
  if (["y", "g", "h", "n", "u", "j", "6", "7", "è"].includes(k)) return { hand: "right", finger: "Index" };
  if (["i", "k", ",", "8", "_"].includes(k)) return { hand: "right", finger: "Majeur (Middle)" };
  if (["o", "l", ";", "9", "ç"].includes(k)) return { hand: "right", finger: "Annulaire (Ring)" };
  return { hand: "right", finger: "Auriculaire (Pinky)" };
}

const ACCENT_TOUR = [
  { char: "é", hint: "Touche 2" },
  { char: "è", hint: "Touche 7" },
  { char: "à", hint: "Touche 0" },
  { char: "ç", hint: "Touche 9" },
  { char: "ù", hint: "Touche ù (à droite de M)" },
  { char: "â", hint: "Touche ^ puis a" },
  { char: "ê", hint: "Touche ^ puis e" },
  { char: "î", hint: "Touche ^ puis i" },
  { char: "ô", hint: "Touche ^ puis o" },
  { char: "û", hint: "Touche ^ puis u" },
  { char: "ë", hint: "Touche ¨ (Maj+^) puis e" },
  { char: "ï", hint: "Touche ¨ (Maj+^) puis i" }
];

const ACCENT_WORDS_DRILL_SENTENCES: Sentence[] = [
  { french: "été été été", english: "" },
  { french: "ça ça ça", english: "" },
  { french: "là où à", english: "" },
  { french: "fenêtre", english: "" },
  { french: "naïf", english: "" },
  { french: "cœur", english: "" }
];

function generateLettersDrill(): Sentence[] {
  const letters = ["a", "z", "q", "w", "m"];
  const sentences: Sentence[] = [];
  for (let s = 0; s < 15; s++) {
    const parts: string[] = [];
    for (let p = 0; p < 3; p++) {
      const shuffled = [...letters].sort(() => Math.random() - 0.5);
      parts.push(shuffled.join(""));
    }
    sentences.push({
      french: parts.join(" "),
      english: ""
    });
  }
  return sentences;
}

function parseTime(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const ms = parseInt(match[4], 10);
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

export function parseSRT(text: string): SrtCue[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const rawBlocks = normalized.split(/\n\n+/);
  const cues: SrtCue[] = [];

  for (const block of rawBlocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 3) {
      const index = parseInt(lines[0], 10);
      const timeLine = lines[1];
      if (isNaN(index) || !timeLine.includes("-->")) continue;

      const parts = timeLine.split("-->").map(p => p.trim());
      if (parts.length < 2) continue;

      const start = parseTime(parts[0]);
      const end = parseTime(parts[1]);
      const cueTxt = lines.slice(2).join(" ");

      cues.push({ index, start, end, text: cueTxt });
    }
  }
  return cues;
}

export function cleanOuterPunctuation(str: string): string {
  const s = str.trim().toLowerCase();
  return s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export default function App() {
  // Navigation & Screens
  // "library" | "learn" | "practice" | "results"
  const [currentScreen, setCurrentScreen] = useState<"library" | "learn" | "practice" | "results" | "lesson-setup">("library");

  // Custom Training state
  const [practiceType, setPracticeType] = useState<PracticeType>("story");
  const [accentsPhase, setAccentsPhase] = useState<1 | 2>(1);
  const [accentTourIdx, setAccentTourIdx] = useState(0);
  const [tourFeedback, setTourFeedback] = useState<"success" | "error" | null>(null);
  const [calibrationPart, setCalibrationPart] = useState<1 | 2>(1);
  const [showCalibrationTransition, setShowCalibrationTransition] = useState(false);
  
  // Free Mode paste and active state variables
  const [freeModeText, setFreeModeText] = useState("");
  const [freeModeActive, setFreeModeActive] = useState(false);
  const [freeModeGlossary, setFreeModeGlossary] = useState<GlossaryEntry[]>([]);
  const [freeModeTranslation, setFreeModeTranslation] = useState<string>("");
  const [freeModeTranslationExpanded, setFreeModeTranslationExpanded] = useState<boolean>(false);
  
  // DB Loaded States
  const [stories, setStories] = useState<Story[]>([]);
  const [sessions, setSessions] = useState<SessionAttempt[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    audioSpeed: "normal",
    ttsApiKey: "",
    theme: "dark",
    soundEffects: true,
    lettersComplete: false,
    accentsComplete: false,
    calibrationComplete: false,
    bannerDismissed: false,
    streakCount: 0,
    lastLessonDate: ""
  });

  // Daily Lesson State
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [pastLessons, setPastLessons] = useState<Lesson[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonText, setLessonText] = useState("");
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [glossaryExpanded, setGlossaryExpanded] = useState(true);

  // Current Working Session State
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [sentenceErrorFlash, setSentenceErrorFlash] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [currentStoryErrorChar, setCurrentStoryErrorChar] = useState<string | null>(null);
  const [isFullStoryVisible, setIsFullStoryVisible] = useState(false);

  // Video Dictation States
  const [videoDicteeFile, setVideoDicteeFile] = useState<File | string | null>(null);
  const [videoDicteeUrl, setVideoDicteeUrl] = useState<string>("");
  const [videoDicteeCues, setVideoDicteeCues] = useState<SrtCue[]>([]);
  const [videoDicteeCueIndex, setVideoDicteeCueIndex] = useState(0);
  const [videoDicteeSubtitleVisible, setVideoDicteeSubtitleVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoDicteeFile) {
      setVideoDicteeUrl("");
      return;
    }
    if (typeof videoDicteeFile === "string") {
      setVideoDicteeUrl(videoDicteeFile);
      return;
    }
    const url = URL.createObjectURL(videoDicteeFile);
    setVideoDicteeUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoDicteeFile]);

  // Error Mode settings & temporary visual flag state
  const [errorMode, setErrorMode] = useState<"strict" | "doux">(
    () => (localStorage.getItem("echo-error-mode") as "strict" | "doux") || "strict"
  );
  const [douxErrorActive, setDouxErrorActive] = useState<boolean>(false);
  const douxTimeoutRef = useRef<any>(null);

  const handleToggleErrorMode = (mode: "strict" | "doux") => {
    setErrorMode(mode);
    localStorage.setItem("echo-error-mode", mode);
    // Focus typing input after toggling
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (douxTimeoutRef.current) clearTimeout(douxTimeoutRef.current);
    };
  }, []);

  // Autofocus typing input in video dictation mode
  useEffect(() => {
    if (practiceType === "video-dictee" && videoDicteeFile && videoDicteeCues.length > 0) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 150);
    }
  }, [practiceType, videoDicteeCueIndex, videoDicteeFile, videoDicteeCues.length]);

  // Sync state values to refs so that the async voice looping callback can read the most up-to-date state
  const currentScreenRef = useRef(currentScreen);
  const selectedStoryRef = useRef(selectedStory);
  const currentSentenceIndexRef = useRef(currentSentenceIndex);
  const practiceTypeRef = useRef(practiceType);
  const freeModeActiveRef = useRef(freeModeActive);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
    selectedStoryRef.current = selectedStory;
    currentSentenceIndexRef.current = currentSentenceIndex;
    practiceTypeRef.current = practiceType;
    freeModeActiveRef.current = freeModeActive;

    // If we leave the practice screen, stop speaking immediately
    if (currentScreen !== "practice") {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [currentScreen, selectedStory, currentSentenceIndex, practiceType, freeModeActive]);

  // Active Typings Timing & Metrics tracking
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sentenceStartTime, setSentenceStartTime] = useState<number | null>(null);
  const [cursorLastMovedTime, setCursorLastMovedTime] = useState<number>(Date.now());
  const [sessionTotalCharsTyped, setSessionTotalCharsTyped] = useState(0);
  const [sessionTotalErrors, setSessionTotalErrors] = useState(0);
  const [activeSentenceErrors, setActiveSentenceErrors] = useState(0);
  
  // Track detailed word counters for calculating hardest words
  // Stores { "boulangère": { attempts: 5, errors: 2 } }
  const [wordMetrics, setWordMetrics] = useState<{ [word: string]: { errors: number } }>({});

  // TTS status
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [premiumTtsLoading, setPremiumTtsLoading] = useState(false);

  // UI state overlays
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAzertyKeyboardOpen, setIsAzertyKeyboardOpen] = useState(false);
  const [accentsBarExpanded, setAccentsBarExpanded] = useState(false);
  const [storyTranslationExpanded, setStoryTranslationExpanded] = useState(false);
  
  // Dictée (dictation) game mode states
  const [dictationHintLevel, setDictationHintLevel] = useState<"easy" | "medium" | "expert">("easy");
  const [dictationScope, setDictationScope] = useState<"words" | "progressive">("progressive");
  const [isDictationConfigOpen, setIsDictationConfigOpen] = useState(false);
  const [dictationHintActive, setDictationHintActive] = useState(false);
  const [dictationHintText, setDictationHintText] = useState("");
  
  // Settings Import/Export Log
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Search/Filter matching story library
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("all");

  // User input focus reference
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Add Custom Story workflow states
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryLevel, setNewStoryLevel] = useState<StoryLevel>("beginner");
  const [newStoryRawText, setNewStoryRawText] = useState("");
  const [newStoryGlossary, setNewStoryGlossary] = useState("");
  const [newStoryTranslation, setNewStoryTranslation] = useState("");
  const [addStoryError, setAddStoryError] = useState("");

  // Calculated session stats for result card saved
  const [completedSessionDetails, setCompletedSessionDetails] = useState<SessionAttempt | null>(null);

  // Dynamic feedback hints variables
  const [showAccentTooltip, setShowAccentTooltip] = useState<string | null>(null);

  // Typing Master Letters Drill States
  const [drillStage, setDrillStage] = useState<1 | 2 | 3 | 4>(1);
  const [drillRound, setDrillRound] = useState<number>(1);
  const [drillItemIndex, setDrillItemIndex] = useState<number>(0);
  const [drillItems, setDrillItems] = useState<string[]>([]);
  const [drillTotalTyped, setDrillTotalTyped] = useState<number>(0);
  const [drillTotalErrors, setDrillTotalErrors] = useState<number>(0);
  const [drillStartTime, setDrillStartTime] = useState<number | null>(null);
  const [drillErrorsByChar, setDrillErrorsByChar] = useState<Record<string, number>>({});
  const [drillShowHandsHint, setDrillShowHandsHint] = useState<boolean>(true);
  const [drillFlashKey, setDrillFlashKey] = useState<string | null>(null);
  const [drillFlashStatus, setDrillFlashStatus] = useState<"success" | "error" | null>(null);
  const [drillIsFinished, setDrillIsFinished] = useState<boolean>(false);
  const [stageFlashMessage, setStageFlashMessage] = useState<string | null>(null);
  const [drillTargetFlash, setDrillTargetFlash] = useState<boolean>(false);
  const [completedDrillDetails, setCompletedDrillDetails] = useState<DrillSessionAttempt | null>(null);

  const showStageFlash = (msg: string) => {
    setStageFlashMessage(msg);
    setTimeout(() => {
      setStageFlashMessage(null);
    }, 2500);
  };

  // ---------------------------------------------------------------------------
  // 1. Core Bootstrapping & DB Synch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadAppDB() {
      try {
        await initDB();
        const loadedStories = await getStories();
        const loadedSessions = await getSessions();
        const loadedSettings = await getSettings();
        const loadedLessons = await getLessons();
        
        // Sort stories: built-in first, then newly added
        setStories(loadedStories.sort((a, b) => b.createdAt - a.createdAt));
        setSessions(loadedSessions.sort((a, b) => b.date - a.date));
        setSettings(loadedSettings);
        setPastLessons(loadedLessons.sort((a, b) => b.date - a.date));

        // Sync dark/light theme to document element
        applyTheme(loadedSettings.theme);
      } catch (err) {
        console.error("Failed to initialize system state IndexedDB:", err);
      }
    }
    loadAppDB();
  }, []);

  // Theme Sync UI modifier
  function applyTheme(themeMode: "light" | "dark") {
    if (themeMode === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    applyTheme(newSettings.theme);
    await saveSettings(newSettings);
  };

  const handleLessonCompleted = async (lesson: Lesson) => {
    const completedLesson = { ...lesson, completed: true };
    try {
      await saveLesson(completedLesson);
      const loadedLessons = await getLessons();
      setPastLessons(loadedLessons.sort((a, b) => b.date - a.date));
    } catch (err) {
      console.error("Failed to save or load lessons:", err);
    }

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    let newStreak = settings.streakCount || 0;
    if (settings.lastLessonDate === todayStr) {
      // Already finished today, stay same
    } else if (settings.lastLessonDate === yesterdayStr) {
      newStreak = (settings.streakCount || 0) + 1;
    } else {
      newStreak = 1;
    }

    const updatedSettings = {
      ...settings,
      streakCount: newStreak,
      lastLessonDate: todayStr
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const parseLessonText = (title: string, pastedText: string): { lesson: Omit<Lesson, "id" | "date" | "completed"> | null; error?: string } => {
    if (!title.trim()) {
      return { lesson: null, error: "Le titre de la leçon ne doit pas être vide." };
    }

    const wordsIndex = pastedText.indexOf("#WORDS");
    const sentencesIndex = pastedText.indexOf("#SENTENCES");
    const paragraphIndex = pastedText.indexOf("#PARAGRAPH");
    const translationIndex = pastedText.indexOf("#TRANSLATION");
    const glossaryIndex = pastedText.indexOf("#GLOSSARY");

    if (wordsIndex === -1) {
      return { lesson: null, error: "La section #WORDS est manquante dans le texte collé." };
    }
    if (sentencesIndex === -1) {
      return { lesson: null, error: "La section #SENTENCES est manquante dans le texte collé." };
    }
    if (paragraphIndex === -1) {
      return { lesson: null, error: "La section #PARAGRAPH est manquante dans le texte collé." };
    }

    const markers = [
      { label: "#WORDS", index: wordsIndex },
      { label: "#SENTENCES", index: sentencesIndex },
      { label: "#PARAGRAPH", index: paragraphIndex }
    ];
    if (translationIndex !== -1) {
      markers.push({ label: "#TRANSLATION", index: translationIndex });
    }
    if (glossaryIndex !== -1) {
      markers.push({ label: "#GLOSSARY", index: glossaryIndex });
    }

    markers.sort((a, b) => a.index - b.index);

    const sections: { [key: string]: string } = {};

    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index + markers[i].label.length;
      const end = (i + 1 < markers.length) ? markers[i + 1].index : pastedText.length;
      sections[markers[i].label] = pastedText.substring(start, end).trim();
    }

    const wordsStr = sections["#WORDS"] || "";
    const sentencesStr = sections["#SENTENCES"] || "";
    const paragraph = sections["#PARAGRAPH"] || "";
    const translation = sections["#TRANSLATION"] || "";
    const glossaryStr = sections["#GLOSSARY"] || "";

    const words = wordsStr
      .split(/,|\n/)
      .map(w => w.trim())
      .filter(w => w.length > 0);

    const sentences = sentencesStr
      .split(/\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const glossary = parseGlossaryStr(glossaryStr);

    if (words.length === 0) {
      return { lesson: null, error: "La section #WORDS est vide ou mal formatée." };
    }
    if (sentences.length === 0) {
      return { lesson: null, error: "La section #SENTENCES est vide ou mal formatée." };
    }
    if (!paragraph) {
      return { lesson: null, error: "La section #PARAGRAPH est vide." };
    }

    return {
      lesson: {
        title: title.trim(),
        words,
        sentences,
        paragraph,
        translation,
        glossary: glossaryIndex !== -1 ? glossary : []
      }
    };
  };

  const parsePastedContent = (rawText: string): { glossary: GlossaryEntry[]; paragraph: string; translation: string } => {
    let glossary: GlossaryEntry[] = [];
    let paragraph = rawText;
    let translation = "";

    const glossaryIndex = rawText.indexOf("#GLOSSARY");
    const paragraphIndex = rawText.indexOf("#PARAGRAPH");
    const sentencesIndex = rawText.indexOf("#SENTENCES");
    const translationIndex = rawText.indexOf("#TRANSLATION");

    const markers: { label: string; index: number }[] = [];
    if (glossaryIndex !== -1) markers.push({ label: "#GLOSSARY", index: glossaryIndex });
    if (paragraphIndex !== -1) markers.push({ label: "#PARAGRAPH", index: paragraphIndex });
    if (sentencesIndex !== -1) markers.push({ label: "#SENTENCES", index: sentencesIndex });
    if (translationIndex !== -1) markers.push({ label: "#TRANSLATION", index: translationIndex });

    if (markers.length > 0) {
      markers.sort((a, b) => a.index - b.index);
      const sections: { [key: string]: string } = {};
      for (let i = 0; i < markers.length; i++) {
        const start = markers[i].index + markers[i].label.length;
        const end = (i + 1 < markers.length) ? markers[i + 1].index : rawText.length;
        sections[markers[i].label] = rawText.substring(start, end).trim();
      }

      if (sections["#GLOSSARY"]) {
        glossary = parseGlossaryStr(sections["#GLOSSARY"]);
      }
      
      if (sections["#PARAGRAPH"]) {
        paragraph = sections["#PARAGRAPH"];
      } else if (sections["#SENTENCES"]) {
        paragraph = sections["#SENTENCES"];
      } else {
        paragraph = rawText;
      }

      if (sections["#TRANSLATION"]) {
        translation = sections["#TRANSLATION"];
      }
    }

    return { glossary, paragraph, translation };
  };

  // Helper utility to reload library list
  const refreshLibraryData = async () => {
    const freshStories = await getStories();
    const freshSessions = await getSessions();
    setStories(freshStories.sort((a, b) => b.createdAt - a.createdAt));
    setSessions(freshSessions.sort((a, b) => b.date - a.date));
  };

  // ---------------------------------------------------------------------------
  // 2. Audio Speak System (Web Speech / Custom Key Proxy fallback)
  // ---------------------------------------------------------------------------
  const playSentenceAudio = async (text: string) => {
    if (!text) return;
    
    // Determine target rate matching user guidelines (slow: 0.62, normal: 0.78)
    const targetSpeed = settings.audioSpeed === "slow" ? 0.62 : 0.78;

    // Check if user has premium Web Speech / OpenAI TTS configure key
    if (settings.ttsApiKey && settings.ttsApiKey.trim().length > 10) {
      setPremiumTtsLoading(true);
      try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${settings.ttsApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: "alloy",
            speed: targetSpeed
          })
        });
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.play();
        setPremiumTtsLoading(false);
        return;
      } catch (err) {
        console.warn("Premium TTS key failed, falling back to Web Speech API:", err);
        setPremiumTtsLoading(false);
      }
    }

    // Default Web Speech API
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      // At startup/play, run this logic to pick the best available French voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Thomas'))  // macOS male
        || voices.find(v => v.name.includes('Amélie'))               // macOS female  
        || voices.find(v => v.name.includes('Google français'))      // Chrome
        || voices.find(v => v.lang === 'fr-FR')                      // any fr-FR
        || voices.find(v => v.lang.startsWith('fr'));                 // any French

      // Split on clause boundaries keeping the delimiter to insert small silence pacing breaths between chunks
      const chunks = text.match(/[^,;:!?\.]+[,;:!?\.]+/g) || [text];

      // Keep tracking variables of current sentence & story state we are starting
      const storyIdAtStart = selectedStoryRef.current ? selectedStoryRef.current.id : "";
      const sentenceIndexAtStart = currentSentenceIndexRef.current;

      const shouldContinue = () => {
        if (practiceTypeRef.current === "free") {
          return (
            currentScreenRef.current === "practice" &&
            practiceTypeRef.current === "free" &&
            freeModeActiveRef.current
          );
        }
        return (
          currentScreenRef.current === "practice" &&
          selectedStoryRef.current &&
          selectedStoryRef.current.id === storyIdAtStart &&
          currentSentenceIndexRef.current === sentenceIndexAtStart
        );
      };

      // Periodic Chrome Keep-Alive timer to avoid cut-off during long audio loops (every 10 seconds)
      const keepAlive = setInterval(() => {
        if (!shouldContinue()) {
          clearInterval(keepAlive);
          return;
        }
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          setTimeout(() => {
            if (shouldContinue()) window.speechSynthesis.resume();
          }, 50);
        }
      }, 10000);

      const playChunks = (index: number) => {
        if (!shouldContinue()) {
          clearInterval(keepAlive);
          setIsSpeaking(false);
          return;
        }

        if (index >= chunks.length) {
          // All sentence chunks read back. Take a brief pause (1.2 seconds) and replay for continuous immersion
          setIsSpeaking(false);
          setTimeout(() => {
            if (shouldContinue()) {
              playChunks(0);
            } else {
              clearInterval(keepAlive);
            }
          }, 1200);
          return;
        }

        const chunkText = chunks[index].trim();
        if (!chunkText) {
          playChunks(index + 1);
          return;
        }

        const utt = new SpeechSynthesisUtterance(chunkText);
        utt.lang = 'fr-FR';
        utt.rate = targetSpeed;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        if (preferred) {
          utt.voice = preferred;
        }

        utt.onstart = () => {
          if (shouldContinue()) {
            setIsSpeaking(true);
          }
        };

        const handleEnded = () => {
          if (shouldContinue()) {
            playChunks(index + 1);
          } else {
            clearInterval(keepAlive);
            setIsSpeaking(false);
          }
        };

        utt.onend = handleEnded;
        utt.onerror = handleEnded;

        window.speechSynthesis.speak(utt);
      };

      playChunks(0);
    } else {
      console.warn("Web Speech API is unsupported in this browser.");
    }
  };

  // Ensure window speech voices are fully mounted/cached
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Typing Master letters drill helpers and workflow triggers
  // ---------------------------------------------------------------------------
  const generateDrillStage1 = () => {
    const keys = ["a", "z", "q", "w", "m"];
    const items: string[] = [];
    for (let i = 0; i < 20; i++) {
      items.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    return items;
  };

  const generateDrillStage2 = (roundNum: number) => {
    const keys = ["a", "z", "q", "w", "m"];
    const items: string[] = [];
    const len = Math.min(2 + (roundNum - 1), 5);
    for (let i = 0; i < 20; i++) {
      let combo = "";
      for (let j = 0; j < len; j++) {
        combo += keys[Math.floor(Math.random() * keys.length)];
      }
      items.push(combo);
    }
    return items;
  };

  const generateDrillStage3 = (roundNum: number) => {
    const keys = ["a", "z", "q", "w", "m"];
    const items: string[] = [];
    const len = Math.min(3 + (roundNum - 1), 6);
    for (let i = 0; i < 20; i++) {
      let combo = "";
      for (let j = 0; j < len; j++) {
        combo += keys[Math.floor(Math.random() * keys.length)];
      }
      items.push(combo);
    }
    return items;
  };

  const generateDrillStage4 = () => {
    const words = ["avec", "maison", "Quiz", "wagon", "zèle", "azur", "mazout"];
    const items: string[] = [];
    for (let i = 0; i < 15; i++) {
      items.push(words[Math.floor(Math.random() * words.length)]);
    }
    return items;
  };

  const generateAccentStage1 = () => {
    const keys = ["é", "è", "à", "ç", "ù"];
    const items: string[] = [];
    for (let i = 0; i < 20; i++) {
      items.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    return items;
  };

  const generateAccentStage2 = (roundNum: number) => {
    const keys = ["é", "è", "à", "ç", "ù"];
    const items: string[] = [];
    const len = Math.min(2 + (roundNum - 1), 4);
    for (let i = 0; i < 20; i++) {
      let combo = "";
      for (let j = 0; j < len; j++) {
        combo += keys[Math.floor(Math.random() * keys.length)];
      }
      items.push(combo);
    }
    return items;
  };

  const generateAccentStage3 = () => {
    const keys = ["â", "ê", "î", "ô", "û", "ë", "ï"];
    const items: string[] = [];
    for (let i = 0; i < 20; i++) {
      items.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    return items;
  };

  const generateAccentStage4 = () => {
    const words = ["été", "ça", "là", "où", "fenêtre", "naïf", "cœur", "élève", "père", "hôte", "frère", "mère", "crème", "noël"];
    const items: string[] = [];
    for (let i = 0; i < 15; i++) {
      items.push(words[Math.floor(Math.random() * words.length)]);
    }
    return items;
  };

  const generateFlowStage = (round: number, stage: number): string[] => {
    const items: string[] = [];
    for (let i = 0; i < 12; i++) {
      if (stage === 1) {
        const count = Math.min(1 + Math.floor(round / 2), 3);
        const parts: string[] = [];
        for (let j = 0; j < count; j++) {
          parts.push(FR_SHORT[Math.floor(Math.random() * FR_SHORT.length)]);
        }
        items.push(parts.join(" "));
      } else if (stage === 2) {
        items.push(FR_MEDIUM[Math.floor(Math.random() * FR_MEDIUM.length)]);
      } else if (stage === 3) {
        items.push(FR_LONG[Math.floor(Math.random() * FR_LONG.length)]);
      } else if (stage === 4) {
        items.push(generateSentence(round));
      }
    }
    return items;
  };

  const generateWordsShort = (round: number): string[] => {
    const items: string[] = [];
    const wordCount = Math.min(1 + Math.floor((round - 1) / 2), 4);
    for (let i = 0; i < 12; i++) {
      const parts: string[] = [];
      for (let j = 0; j < wordCount; j++) {
        parts.push(FR_SHORT[Math.floor(Math.random() * FR_SHORT.length)]);
      }
      items.push(parts.join(" "));
    }
    return items;
  };

  const generateWordsLong = (round: number): string[] => {
    const items: string[] = [];
    const mixProb = Math.min(0.15 * (round - 1), 0.75);
    for (let i = 0; i < 12; i++) {
      const useLong = Math.random() < mixProb;
      const pool = useLong ? FR_LONG : FR_MEDIUM;
      items.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return items;
  };

  const generatePhrases = (round: number): string[] => {
    const items: string[] = [];
    for (let i = 0; i < 12; i++) {
      items.push(generateSentence(round));
    }
    return items;
  };

  const speakDrillTargetText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Thomas"))
        || voices.find(v => v.name.includes("Amélie"))
        || voices.find(v => v.name.includes("Google français"))
        || voices.find(v => v.lang === "fr-FR")
        || voices.find(v => v.lang.startsWith("fr"));
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.78;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startDrillSession = (type: "letters" | "accents" | "calibration" | "flow" | "wordsShort" | "wordsLong" | "phrases" | "dictation" | "lesson", roundNum: number = 1, customLessonToPlay?: Lesson) => {
    setPracticeType(type);
    setDrillStage(1);
    setDrillRound(roundNum);
    setDrillItemIndex(0);
    if (type === "calibration") {
      setCalibrationPart(1);
    }
    
    let items: string[] = [];
    if (type === "letters" || type === "calibration") {
      items = generateDrillStage1();
    } else if (type === "accents") {
      items = generateAccentStage1();
    } else if (type === "flow") {
      items = generateFlowStage(roundNum, 1);
    } else if (type === "wordsShort") {
      items = generateWordsShort(roundNum);
    } else if (type === "wordsLong") {
      items = generateWordsLong(roundNum);
    } else if (type === "phrases") {
      items = generatePhrases(roundNum);
    } else if (type === "dictation") {
      if (dictationScope === "words") {
        items = generateWordsShort(roundNum);
      } else {
        items = generateFlowStage(roundNum, 1);
      }
    } else if (type === "lesson") {
      const lessonToUse = customLessonToPlay || activeLesson;
      if (lessonToUse) {
        setActiveLesson(lessonToUse);
        const itemsStage1: string[] = [];
        lessonToUse.words.forEach(w => {
          itemsStage1.push(w, w);
        });
        const shuffle = (array: string[]) => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };
        items = shuffle(itemsStage1);
      }
    }

    setDrillItems(items);
    setTypedText("");
    setDrillTotalTyped(0);
    setDrillTotalErrors(0);
    setDrillStartTime(Date.now());
    setDrillErrorsByChar({});
    setDrillFlashKey(null);
    setDrillFlashStatus(null);
    setDrillIsFinished(false);
    setCompletedDrillDetails(null);
    
    setTimeout(() => {
      if (items[0]) {
        speakDrillTargetText(items[0]);
      }
    }, 100);

    setCurrentScreen("practice");
  };

  const handleStopLettersDrill = async () => {
    if (drillStartTime === null) return;
    const duration = Math.max(1, Math.round((Date.now() - drillStartTime) / 1000));
    
    const min = duration / 60;
    const correctChars = Math.max(0, drillTotalTyped - drillTotalErrors);
    const wpm = Math.max(1, Math.round((correctChars / 5) / min));
    
    const accuracy = drillTotalTyped > 0 
      ? Math.max(0, Math.min(100, Math.round(((drillTotalTyped - drillTotalErrors) / drillTotalTyped) * 100)))
      : 100;

    const session: DrillSessionAttempt = {
      id: `drill-attempt-${Date.now()}`,
      date: Date.now(),
      duration,
      totalTyped: drillTotalTyped,
      accuracy,
      errors: drillTotalErrors,
      errorsByChar: drillErrorsByChar,
      wpm
    };

    try {
      await saveDrillSession(session);
    } catch (e) {
      console.error("Failed to save drill session:", e);
    }

    setCompletedDrillDetails(session);
    setDrillIsFinished(true);
    setCurrentScreen("results");
  };

  // ---------------------------------------------------------------------------
  // 3. Typing Logic Engine
  // ---------------------------------------------------------------------------
  const currentSentence: Sentence | null = useMemo(() => {
    if (!selectedStory || !selectedStory.sentences[currentSentenceIndex]) return null;
    return selectedStory.sentences[currentSentenceIndex];
  }, [selectedStory, currentSentenceIndex]);

  // Dynamic selector for current target word being typed across all practice modes
  const currentTargetWord = useMemo(() => {
    if (practiceType === "lesson") {
      return drillItems[drillItemIndex] || "";
    }
    if (practiceType === "story" && currentSentence) {
      const text = currentSentence.french;
      const idx = typedText.length;
      const words = text.split(/\s+/);
      let charCount = 0;
      for (const word of words) {
        const start = text.indexOf(word, charCount);
        const end = start + word.length;
        if (idx >= start && idx <= end + 1) {
          return word;
        }
        charCount = end;
      }
      return "";
    }
    if (practiceType === "free" && freeModeText) {
      const idx = typedText.length;
      const words = freeModeText.split(/\s+/);
      let charCount = 0;
      for (const word of words) {
        const start = freeModeText.indexOf(word, charCount);
        const end = start + word.length;
        if (idx >= start && idx <= end + 1) {
          return word;
        }
        charCount = end;
      }
      return "";
    }
    return "";
  }, [practiceType, drillItems, drillItemIndex, currentSentence, freeModeText, typedText]);

  const computedFullTranslation = useMemo(() => {
    if (!selectedStory) return "";
    if (selectedStory.fullTranslation) return selectedStory.fullTranslation;
    return selectedStory.sentences
      .map((s) => s.english)
      .filter(Boolean)
      .join(" ");
  }, [selectedStory]);

  // Keep input focused
  const focusInputZone = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Focus on entry
  useEffect(() => {
    if (currentScreen === "practice") {
      setTimeout(() => focusInputZone(), 120);
    }
  }, [currentScreen, currentSentenceIndex]);

  // 3s Stuck Accent Key hint checker running in background active session
  useEffect(() => {
    if (currentScreen !== "practice" || !currentSentence) {
      setShowAccentTooltip(null);
      return;
    }

    const intervalId = setInterval(() => {
      const expectedChar = currentSentence.french[typedText.length];
      if (expectedChar && ACCENT_HINTS[expectedChar]) {
        const timeIdle = Date.now() - cursorLastMovedTime;
        if (timeIdle > 3000) {
          setShowAccentTooltip(ACCENT_HINTS[expectedChar].qwerty);
          return;
        }
      }
      setShowAccentTooltip(null);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentScreen, typedText, cursorLastMovedTime, currentSentence]);

  // Main typing keyboard stroke listener
  const processTypedChar = (typedCharRaw: string) => {
    setDouxErrorActive(false);
    if (douxTimeoutRef.current) {
      clearTimeout(douxTimeoutRef.current);
      douxTimeoutRef.current = null;
    }

    const typedChar = typedCharRaw.normalize('NFC');

    if (practiceType === "letters" || practiceType === "accents" || practiceType === "calibration" || practiceType === "flow" || practiceType === "wordsShort" || practiceType === "wordsLong" || practiceType === "phrases" || practiceType === "dictation" || practiceType === "lesson") {
      if (drillIsFinished) return;

      const targetWord = drillItems[drillItemIndex];
      if (!targetWord) return;
      
      const expectedChar = (targetWord[typedText.length] || "").normalize('NFC');

      if (typedChar === expectedChar) {
        if (settings.soundEffects) playSuccessSound();
        
        const newTyped = typedText + typedChar;
        setTypedText(newTyped);
        setDrillTotalTyped(prev => prev + 1);
        
        setDrillFlashKey(getKeyMainForChar(typedChar));
        setDrillFlashStatus("success");
        setTimeout(() => {
          setDrillFlashKey(null);
          setDrillFlashStatus(null);
        }, 150);

        if (newTyped === targetWord) {
          setDrillTargetFlash(true);
          setTimeout(() => setDrillTargetFlash(false), 200);

          const nextIdx = drillItemIndex + 1;
          setTypedText("");
          if (inputRef.current) {
            inputRef.current.value = "";
          }

          if (nextIdx < drillItems.length) {
            setDrillItemIndex(nextIdx);
            speakDrillTargetText(drillItems[nextIdx]);
          } else {
            if (practiceType === "lesson") {
              if (drillStage === 1) {
                setDrillStage(2);
                if (activeLesson) {
                  setDrillItems(activeLesson.sentences);
                  setDrillItemIndex(0);
                  showStageFlash("Phrases !");
                  speakDrillTargetText(activeLesson.sentences[0]);
                }
              } else if (drillStage === 2) {
                setDrillStage(3);
                if (activeLesson) {
                  const getParagraphSentences = (p: string) => {
                    return p.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 0) || [p];
                  };
                  const s3 = getParagraphSentences(activeLesson.paragraph);
                  setDrillItems(s3);
                  setDrillItemIndex(0);
                  showStageFlash("Paragraphe !");
                  speakDrillTargetText(s3[0]);
                }
              } else if (drillStage === 3) {
                setDrillStage(4);
                if (activeLesson) {
                  setDrillItems(activeLesson.sentences);
                  setDrillItemIndex(0);
                  showStageFlash("Dictée !");
                  speakDrillTargetText(activeLesson.sentences[0]);
                }
              } else if (drillStage === 4) {
                if (activeLesson) {
                  handleLessonCompleted(activeLesson);
                }
                handleStopLettersDrill();
              }
            } else if (practiceType === "flow") {
              if (drillStage === 1) {
                setDrillStage(2);
                const s2 = generateFlowStage(drillRound, 2);
                setDrillItems(s2);
                setDrillItemIndex(0);
                showStageFlash("Mots moyens !");
                speakDrillTargetText(s2[0]);
              } else if (drillStage === 2) {
                setDrillStage(3);
                const s3 = generateFlowStage(drillRound, 3);
                setDrillItems(s3);
                setDrillItemIndex(0);
                showStageFlash("Mots longs !");
                speakDrillTargetText(s3[0]);
              } else if (drillStage === 3) {
                setDrillStage(4);
                const s4 = generateFlowStage(drillRound, 4);
                setDrillItems(s4);
                setDrillItemIndex(0);
                showStageFlash("Phrases complètes !");
                speakDrillTargetText(s4[0]);
              } else if (drillStage === 4) {
                const nextRound = drillRound + 1;
                setDrillRound(nextRound);
                setDrillStage(1);
                const s1 = generateFlowStage(nextRound, 1);
                setDrillItems(s1);
                setDrillItemIndex(0);
                showStageFlash(`Ronde ${nextRound} - Mots courts !`);
                speakDrillTargetText(s1[0]);
              }
            } else if (practiceType === "dictation") {
              if (dictationScope === "words") {
                if (drillStage === 1) {
                  setDrillStage(2);
                  const s2 = [];
                  for (let i = 0; i < 12; i++) {
                    s2.push(FR_MEDIUM[Math.floor(Math.random() * FR_MEDIUM.length)]);
                  }
                  setDrillItems(s2);
                  setDrillItemIndex(0);
                  showStageFlash("Mots moyens !");
                  speakDrillTargetText(s2[0]);
                } else if (drillStage === 2) {
                  setDrillStage(3);
                  const s3 = generateWordsLong(drillRound);
                  setDrillItems(s3);
                  setDrillItemIndex(0);
                  showStageFlash("Mots longs !");
                  speakDrillTargetText(s3[0]);
                } else {
                  const nextRound = drillRound + 1;
                  setDrillRound(nextRound);
                  setDrillStage(1);
                  const s1 = generateWordsShort(nextRound);
                  setDrillItems(s1);
                  setDrillItemIndex(0);
                  showStageFlash(`Ronde ${nextRound} - Mots courts !`);
                  speakDrillTargetText(s1[0]);
                }
              } else { // progressive
                if (drillStage === 1) {
                  setDrillStage(2);
                  const s2 = generateFlowStage(drillRound, 2);
                  setDrillItems(s2);
                  setDrillItemIndex(0);
                  showStageFlash("Mots moyens !");
                  speakDrillTargetText(s2[0]);
                } else if (drillStage === 2) {
                  setDrillStage(3);
                  const s3 = generateFlowStage(drillRound, 3);
                  setDrillItems(s3);
                  setDrillItemIndex(0);
                  showStageFlash("Mots longs !");
                  speakDrillTargetText(s3[0]);
                } else if (drillStage === 3) {
                  setDrillStage(4);
                  const s4 = generateFlowStage(drillRound, 4);
                  setDrillItems(s4);
                  setDrillItemIndex(0);
                  showStageFlash("Phrases complètes !");
                  speakDrillTargetText(s4[0]);
                } else if (drillStage === 4) {
                  const nextRound = drillRound + 1;
                  setDrillRound(nextRound);
                  setDrillStage(1);
                  const s1 = generateFlowStage(nextRound, 1);
                  setDrillItems(s1);
                  setDrillItemIndex(0);
                  showStageFlash(`Ronde ${nextRound} - Mots courts !`);
                  speakDrillTargetText(s1[0]);
                }
              }
            } else if (practiceType === "wordsShort" || practiceType === "wordsLong" || practiceType === "phrases") {
              const nextRound = drillRound + 1;
              setDrillRound(nextRound);
              setDrillStage(1);
              let s1: string[] = [];
              if (practiceType === "wordsShort") {
                s1 = generateWordsShort(nextRound);
              } else if (practiceType === "wordsLong") {
                s1 = generateWordsLong(nextRound);
              } else {
                s1 = generatePhrases(nextRound);
              }
              setDrillItems(s1);
              setDrillItemIndex(0);
              showStageFlash(`Ronde ${nextRound} !`);
              speakDrillTargetText(s1[0]);
            } else {
              if (drillStage === 1) {
                setDrillStage(2);
                const s2 = practiceType === "accents" || (practiceType === "calibration" && calibrationPart === 2)
                  ? generateAccentStage2(drillRound)
                  : generateDrillStage2(drillRound);
                setDrillItems(s2);
                setDrillItemIndex(0);
                showStageFlash("Combos courts !");
                speakDrillTargetText(s2[0]);
              } else if (drillStage === 2) {
                setDrillStage(3);
                const s3 = practiceType === "accents" || (practiceType === "calibration" && calibrationPart === 2)
                  ? generateAccentStage3()
                  : generateDrillStage3(drillRound);
                setDrillItems(s3);
                setDrillItemIndex(0);
                showStageFlash("Combos longs !");
                speakDrillTargetText(s3[0]);
              } else if (drillStage === 3) {
                setDrillStage(4);
                const s4 = practiceType === "accents" || (practiceType === "calibration" && calibrationPart === 2)
                  ? generateAccentStage4()
                  : generateDrillStage4();
                setDrillItems(s4);
                setDrillItemIndex(0);
                showStageFlash("Mots réels !");
                speakDrillTargetText(s4[0]);
              } else if (drillStage === 4) {
                if (practiceType === "calibration" && calibrationPart === 1) {
                  setCalibrationPart(2);
                  setDrillStage(1);
                  const s1 = generateAccentStage1();
                  setDrillItems(s1);
                  setDrillItemIndex(0);
                  showStageFlash("Partie 2 : Accents !");
                  speakDrillTargetText(s1[0]);
                } else if (practiceType === "calibration" && calibrationPart === 2) {
                  // Save evaluation completed state
                  const updatedSettings = { ...settings, calibrationComplete: true };
                  setSettings(updatedSettings);
                  saveSettings(updatedSettings).catch(err => console.error(err));
                  
                  handleStopLettersDrill();
                } else {
                  const nextRound = drillRound + 1;
                  setDrillRound(nextRound);
                  setDrillStage(1);
                  const s1 = practiceType === "accents" ? generateAccentStage1() : generateDrillStage1();
                  setDrillItems(s1);
                  setDrillItemIndex(0);
                  showStageFlash(`Ronde ${nextRound} - Stage 1 !`);
                  speakDrillTargetText(s1[0]);
                }
              }
            }
          }
        }
      } else {
        if (settings.soundEffects) playErrorSound();
        
        setDrillTotalTyped(prev => prev + 1);
        setDrillTotalErrors(prev => prev + 1);
        if (expectedChar) {
          setDrillErrorsByChar(prev => ({
            ...prev,
            [expectedChar]: (prev[expectedChar] || 0) + 1
          }));
        }

        setDrillFlashKey(getKeyMainForChar(typedChar));
        setDrillFlashStatus("error");
        setTimeout(() => {
          setDrillFlashKey(null);
          setDrillFlashStatus(null);
        }, 150);

        if (errorMode === "strict") {
          setTypedText("");
        } else {
          setDouxErrorActive(true);
          if (douxTimeoutRef.current) clearTimeout(douxTimeoutRef.current);
          douxTimeoutRef.current = setTimeout(() => {
            setDouxErrorActive(false);
          }, 200);
        }

        if (inputRef.current) {
          inputRef.current.value = "";
        }

        if (practiceType === "dictation" || (practiceType === "lesson" && drillStage === 4)) {
          speakDrillTargetText(targetWord);
          const activeLevel = practiceType === "lesson" ? "easy" : dictationHintLevel;
          if (activeLevel === "easy") {
            setDictationHintText(targetWord);
            setDictationHintActive(true);
            const globalWin = window as any;
            if (globalWin.dictationHintTimeout) clearTimeout(globalWin.dictationHintTimeout);
            globalWin.dictationHintTimeout = setTimeout(() => {
              setDictationHintActive(false);
            }, 1000);
          } else if (activeLevel === "medium") {
            setDictationHintText(expectedChar || "");
            setDictationHintActive(true);
            const globalWin = window as any;
            if (globalWin.dictationHintTimeout) clearTimeout(globalWin.dictationHintTimeout);
            globalWin.dictationHintTimeout = setTimeout(() => {
              setDictationHintActive(false);
            }, 1000);
          }
        }
      }
      return;
    }
    
    if (practiceType === "free") {
      if (!freeModeActive) return;

      // Detect if this is the absolute first keypress of the story
      if (sessionStartTime === null) {
        setSessionStartTime(Date.now());
      }
      // Detect if first character of active text
      if (sentenceStartTime === null) {
        setSentenceStartTime(Date.now());
        // Trigger voice read aloud the moment typing begins for free text
        playSentenceAudio(freeModeText);
      }

      setCursorLastMovedTime(Date.now());

      const expectedChar = (freeModeText[typedText.length] || "").normalize('NFC');

      if (typedChar === expectedChar) {
        if (settings.soundEffects) playSuccessSound();
        setSessionTotalCharsTyped(prev => prev + 1);
        
        const newText = typedText + expectedChar;
        setTypedText(newText);
        setCurrentStoryErrorChar(null);

        if (newText === freeModeText) {
          handleCompleteFreeMode();
        }
      } else {
        if (settings.soundEffects) playErrorSound();
        setSessionTotalErrors(prev => prev + 1);
        setActiveSentenceErrors(prev => prev + 1);
        
        if (errorMode === "strict") {
          setCurrentStoryErrorChar(typedChar);
        } else {
          setDouxErrorActive(true);
          if (douxTimeoutRef.current) clearTimeout(douxTimeoutRef.current);
          douxTimeoutRef.current = setTimeout(() => {
            setDouxErrorActive(false);
          }, 200);
        }
      }
      return;
    }

    if (practiceType === "video-dictee") {
      const currentCue = videoDicteeCues[videoDicteeCueIndex];
      if (!currentCue) return;

      const expectedChar = (currentCue.text[typedText.length] || "").normalize('NFC');

      if (typedChar === expectedChar) {
        if (settings.soundEffects) playSuccessSound();
        setSessionTotalCharsTyped(prev => prev + 1);

        const newText = typedText + expectedChar;
        setTypedText(newText);

        if (newText === currentCue.text) {
          setVideoDicteeCueIndex(prev => prev + 1);
          setTypedText("");
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }
      } else {
        if (settings.soundEffects) playErrorSound();
        setSessionTotalErrors(prev => prev + 1);
        setActiveSentenceErrors(prev => prev + 1);

        setSentenceErrorFlash(true);
        setTimeout(() => setSentenceErrorFlash(false), 200);
      }
      return;
    }

    // Prevent typing further than sentence length
    if (!currentSentence) return;

    // Detect if this is the absolute first keypress of the story
    if (sessionStartTime === null) {
      setSessionStartTime(Date.now());
    }
    // Detect if first character of active sentence
    if (sentenceStartTime === null) {
      setSentenceStartTime(Date.now());
      // Trigger voice read aloud the moment typing begins for this sentence
      playSentenceAudio(currentSentence.french);
    }

    setCursorLastMovedTime(Date.now());

    // Evaluate typing metrics
    const expectedChar = (currentSentence.french[typedText.length] || "").normalize('NFC');

    if (typedChar === expectedChar) {
      // Success Click sound
      if (settings.soundEffects) playSuccessSound();
      setSessionTotalCharsTyped(prev => prev + 1);
      
      const newText = typedText + expectedChar;
      setTypedText(newText);
      setCurrentStoryErrorChar(null);

      // Auto Advance Sentence Trigger
      if (newText === currentSentence.french) {
        handleAdvanceNextSentence();
      }
    } else {
      // Error Buzz
      if (settings.soundEffects) playErrorSound();
      setSessionTotalErrors(prev => prev + 1);
      setActiveSentenceErrors(prev => prev + 1);

      // Identify the exact word that contains this error to count hardest words
      const frenchWordsList = currentSentence.french.split(/\s+/);
      // Find which word matches current character index (which is typedText.length)
      const addedCharIndex = typedText.length;
      let accumulatedLen = 0;
      let foundWord = "";
      for (const w of frenchWordsList) {
        const start = accumulatedLen;
        const end = accumulatedLen + w.length;
        if (addedCharIndex >= start && addedCharIndex <= end) {
          // Remove punctuation for clean keys
          foundWord = w.toLowerCase().replace(/[.,!?;:()"']/g, "");
          break;
        }
        accumulatedLen += w.length + 1; // account for spaces
      }

      if (foundWord) {
        setWordMetrics(prev => ({
          ...prev,
          [foundWord]: {
            errors: (prev[foundWord]?.errors || 0) + 1
          }
        }));
      }

      if (errorMode === "strict") {
        // Change 2: Reset the entire sentence typed progress on wrong letter
        setTypedText("");
        setCurrentStoryErrorChar(null);

        // Brief red flash on the whole sentence display for ~200ms
        setSentenceErrorFlash(true);
        setTimeout(() => setSentenceErrorFlash(false), 200);
      } else {
        setDouxErrorActive(true);
        if (douxTimeoutRef.current) clearTimeout(douxTimeoutRef.current);
        douxTimeoutRef.current = setTimeout(() => {
          setDouxErrorActive(false);
        }, 200);
      }
    }
  };

  const handleNativeInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    
    // Cast to get access to native InputEvent properties safely in TypeScript
    const nativeEvent = e.nativeEvent as InputEvent;

    // If the OS/browser is in the middle of composing a dead-key (like ¨ + a),
    // STOP here. Do not clear the textarea yet! Let it finish combining.
    if (nativeEvent.isComposing) {
      return;
    }

    const rawValue = el.value;
    if (!rawValue) return;

    // Normalize the fully formed character (e.g., "ä")
    const normalized = rawValue.normalize('NFC');

    // Process the completed character
    for (const ch of normalized) {
      processTypedChar(ch);
    }

    // Safely wipe the textarea buffer now that the character is processed
    el.value = "";
  };

  const handleAdvanceNextSentence = () => {
    if (!selectedStory) return;
    
    // Reset individual sentence tracking variables
    setTypedText("");
    setCurrentStoryErrorChar(null);
    setSentenceStartTime(null);
    setActiveSentenceErrors(0);
    setShowAccentTooltip(null);

    if (currentSentenceIndex + 1 < selectedStory.sentences.length) {
      // Advance to next
      setCurrentSentenceIndex(prev => prev + 1);
    } else {
      // All sentences completed! Finalize story stats
      if (practiceType === "calibration" && calibrationPart === 1) {
        setShowCalibrationTransition(true);
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } else {
        handleCompleteStorySession();
      }
    }
  };

  const handleSkipSentence = () => {
    if (!selectedStory) return;
    
    // Append sentence length to characters typed to mock progress
    const remainingCount = currentSentence ? currentSentence.french.length - typedText.length : 0;
    setSessionTotalCharsTyped(prev => prev + remainingCount);
    
    handleAdvanceNextSentence();
  };

  const handleCompleteStorySession = async () => {
    if (!selectedStory) return;

    const totalTimeSec = Math.max(1, Math.round(((Date.now() - (sessionStartTime || Date.now())) / 1000)));
    
    // Calculate final metrics
    // WPM is standard Formula: (correct characters typed / 5) / (minutes elapsed)
    const minutesElapsed = totalTimeSec / 60;
    const correctChars = Math.max(0, sessionTotalCharsTyped - sessionTotalErrors);
    const calculatedWpm = Math.max(1, Math.round((correctChars / 5) / minutesElapsed));
    
    // Accuracy %
    const calculatedAccuracy = sessionTotalCharsTyped > 0 
      ? Math.max(0, Math.min(100, Math.round(((sessionTotalCharsTyped - sessionTotalErrors) / sessionTotalCharsTyped) * 100)))
      : 100;

    // Pick 3 words with highest errors above 0
    const hardestWords = Object.entries(wordMetrics as Record<string, { errors: number }>)
      .filter(([_, data]) => data.errors > 0)
      .sort((a, b) => b[1].errors - a[1].errors)
      .slice(0, 3)
      .map(([word]) => word);

    const newAttempt: SessionAttempt = {
      id: `attempt-${Date.now()}`,
      storyId: selectedStory.id,
      storyTitle: selectedStory.title,
      date: Date.now(),
      wpm: calculatedWpm,
      accuracy: calculatedAccuracy,
      errors: sessionTotalErrors,
      duration: totalTimeSec,
      hardestWords
    };

    try {
      await saveSession(newAttempt);
      setCompletedSessionDetails(newAttempt);

      // Update learn screen completion statuses in state and database
      if (practiceType === "letters" || practiceType === "accents" || practiceType === "calibration") {
        const updatedSettings = { ...settings };
        if (practiceType === "letters") updatedSettings.lettersComplete = true;
        if (practiceType === "accents") updatedSettings.accentsComplete = true;
        if (practiceType === "calibration") updatedSettings.calibrationComplete = true;
        setSettings(updatedSettings);
        await saveSettings(updatedSettings);
      }

      await refreshLibraryData();
      setCurrentScreen("results");
    } catch (err) {
      console.error("Failed to save final performance session:", err);
    }
  };

  const handleCompleteFreeMode = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    const totalTimeSec = Math.max(1, Math.round(((Date.now() - (sessionStartTime || Date.now())) / 1000)));
    const minutesElapsed = totalTimeSec / 60;
    const correctChars = Math.max(0, sessionTotalCharsTyped - sessionTotalErrors);
    const calculatedWpm = Math.max(1, Math.round((correctChars / 5) / minutesElapsed));
    
    // Accuracy %
    const calculatedAccuracy = sessionTotalCharsTyped > 0 
      ? Math.max(0, Math.min(100, Math.round(((sessionTotalCharsTyped - sessionTotalErrors) / sessionTotalCharsTyped) * 100)))
      : 100;

    const dummyAttempt: SessionAttempt = {
      id: `free-attempt-${Date.now()}`,
      storyId: "free-mode",
      storyTitle: "Mode Libre",
      date: Date.now(),
      wpm: calculatedWpm,
      accuracy: calculatedAccuracy,
      errors: sessionTotalErrors,
      duration: totalTimeSec,
      hardestWords: []
    };

    setCompletedSessionDetails(dummyAttempt);
    setCurrentScreen("results");
  };

  const handleStartFreeMode = (recommence: boolean) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    
    // Reset active typing states
    setTypedText("");
    setCurrentStoryErrorChar(null);
    setSessionStartTime(null);
    setSentenceStartTime(null);
    setSessionTotalCharsTyped(0);
    setSessionTotalErrors(0);
    setActiveSentenceErrors(0);
    setPracticeType("free");
    setCompletedSessionDetails(null);
    setCurrentScreen("practice");

    if (recommence) {
      setFreeModeActive(true);
    } else {
      setFreeModeText("");
      setFreeModeActive(false);
    }
    
    // Auto focus
    setTimeout(() => {
      focusInputZone();
    }, 120);
  };

  const handleStartVideoDictee = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setTypedText("");
    setCurrentStoryErrorChar(null);
    setSessionStartTime(null);
    setSentenceStartTime(null);
    setSessionTotalCharsTyped(0);
    setSessionTotalErrors(0);
    setActiveSentenceErrors(0);
    setPracticeType("video-dictee");
    setVideoDicteeCueIndex(0);
    setCompletedSessionDetails(null);
    setCurrentScreen("practice");
  };

  // ---------------------------------------------------------------------------
  // 4. Manual on-screen click inserter accent keys
  // ---------------------------------------------------------------------------
  const handleInsertAccentChar = (accentChar: string) => {
    if (practiceType === "video-dictee") {
      processTypedChar(accentChar);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
      return;
    }

    // Session/sentence start timers and audio for story/free modes
    if (practiceType === "story" && currentSentence) {
      if (sessionStartTime === null) {
        setSessionStartTime(Date.now());
      }
      if (sentenceStartTime === null) {
        setSentenceStartTime(Date.now());
        playSentenceAudio(currentSentence.french);
      }
      setCursorLastMovedTime(Date.now());
    } else if (practiceType === "free") {
      if (sessionStartTime === null) {
        setSessionStartTime(Date.now());
      }
      if (sentenceStartTime === null) {
        setSentenceStartTime(Date.now());
        playSentenceAudio(freeModeText);
      }
      setCursorLastMovedTime(Date.now());
    }

    processTypedChar(accentChar);

    // Restore focus to main textarea zone immediately
    setTimeout(() => {
      focusInputZone();
    }, 40);
  };

  const renderCollapsibleAccentBar = () => {
    return (
      <div className="w-full flex flex-col items-center mb-4">
        <button
          onClick={() => {
            setAccentsBarExpanded(!accentsBarExpanded);
            setTimeout(() => focusInputZone(), 50);
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-full text-[11px] font-bold text-zinc-400 uppercase tracking-wider transition-all select-none cursor-pointer"
        >
          <span>Accents</span>
          <span className="text-[10px] text-zinc-500">{accentsBarExpanded ? "▲" : "▼"}</span>
        </button>
        {accentsBarExpanded && (
          <div className="w-full max-w-2xl mt-3 p-3 bg-zinc-950/40 border border-white/5 rounded-xl flex flex-wrap justify-center gap-1.5 animate-fadeIn">
            {["é", "è", "à", "ç", "ù", "â", "ê", "î", "ô", "û", "ë", "ï", "É", "È", "À", "Ç", "œ"].map((char) => (
              <button
                key={char}
                onClick={() => handleInsertAccentChar(char)}
                className="w-9 h-9 flex items-center justify-center bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-white/12 active:scale-95 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer font-sans"
              >
                {char}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Backspace key listener handled elegantly to enable correction
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log("KEYDOWN", JSON.stringify({ key: e.key, code: e.code }));
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      processTypedChar(" ");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const IGNORED_KEYS = [
      'Shift', 'Alt', 'AltGr', 'Control', 'CapsLock', 
      'Meta', 'Dead', 'Process', 'AltGraph'
    ];

    if (IGNORED_KEYS.includes(e.key)) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (practiceType === "story" || practiceType === "free" || practiceType === "video-dictee") {
        if (currentStoryErrorChar !== null) {
          setCurrentStoryErrorChar(null);
        } else if (typedText.length > 0) {
          setTypedText(prev => prev.slice(0, -1));
        }
      }
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Replay audio with custom keyboard shortcut Tab or Ctrl+Space
    if (e.key === "Tab") {
      e.preventDefault();
      if (["letters", "accents", "calibration", "flow", "wordsShort", "wordsLong", "phrases", "dictation"].includes(practiceType)) {
        const textToSpeak = drillItems[drillItemIndex];
        if (textToSpeak) {
          speakDrillTargetText(textToSpeak);
        }
      } else if (currentSentence) {
        playSentenceAudio(currentSentence.french);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Dashboard Calculations
  // ---------------------------------------------------------------------------
  // Personal Bests per Story Tracker
  const personalBestRecords = useMemo(() => {
    const pbs: { [storyId: string]: { wpm: number; accuracy: number } } = {};
    for (const s of sessions) {
      const existing = pbs[s.storyId];
      if (!existing || s.wpm > existing.wpm) {
        pbs[s.storyId] = { wpm: s.wpm, accuracy: s.accuracy };
      }
    }
    return pbs;
  }, [sessions]);

  // General Library Filter list
  const filteredStories = useMemo(() => {
    return stories.filter(s => {
      const matchSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.sentences.some(send => send.french.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchFilter = selectedLevelFilter === "all" || s.level === selectedLevelFilter;
      return matchSearch && matchFilter;
    });
  }, [stories, searchQuery, selectedLevelFilter]);

  // ---------------------------------------------------------------------------
  // 6. Action Triggers: Start Session, Retry, Next Story, etc.
  // ---------------------------------------------------------------------------
  const handleStartPractice = (story: Story) => {
    setPracticeType("story");
    setSelectedStory(story);
    setCurrentSentenceIndex(0);
    setTypedText("");
    setCurrentStoryErrorChar(null);
    setIsFullStoryVisible(false);
    
    // Reset Stats Counters
    setSessionStartTime(null);
    setSentenceStartTime(null);
    setSessionTotalCharsTyped(0);
    setSessionTotalErrors(0);
    setActiveSentenceErrors(0);
    setWordMetrics({});
    setShowAccentTooltip(null);
    
    setCurrentScreen("practice");
  };

  const handleNextStoryTrigger = () => {
    if (!selectedStory) return;
    // Find next story in library list
    const currentIndex = stories.findIndex(s => s.id === selectedStory.id);
    const nextIndex = (currentIndex + 1) % stories.length;
    handleStartPractice(stories[nextIndex]);
  };

  // ---------------------------------------------------------------------------
  // 7. Add Custom Story translating workspace (simplified)
  // ---------------------------------------------------------------------------
  const handleSaveCustomStory = async () => {
    // Validate
    if (!newStoryTitle.trim()) {
      setAddStoryError("Veuillez saisir un titre d'histoire.");
      return;
    }
    if (!newStoryRawText.trim()) {
      setAddStoryError("Veuillez coller le texte en Français.");
      return;
    }

    const parsed = parsePastedContent(newStoryRawText);
    const targetParagraph = parsed.paragraph;

    // Split text by punctuation marks . ! ?
    const segmentRegex = /(?<=[.!?])\s+/;
    const splitSentences = targetParagraph
      .split(segmentRegex)
      .map(s => s.trim())
      .filter(s => s.length > 2);

    if (splitSentences.length === 0) {
      setAddStoryError("Assurez-vous que le paragraphe contient des phrases complètes avec ponctuation.");
      return;
    }

    const sentences: Sentence[] = splitSentences.map(french => ({
      french,
      english: "" // Backward compatibility for built-in/old structures
    }));

    let glossaryEntries: GlossaryEntry[] | undefined = undefined;
    if (parsed.glossary && parsed.glossary.length > 0) {
      glossaryEntries = parsed.glossary;
    } else if (newStoryGlossary.trim()) {
      glossaryEntries = parseGlossaryStr(newStoryGlossary);
    }

    const createdStory: Story = {
      id: `custom-story-${Date.now()}`,
      title: newStoryTitle.trim(),
      level: newStoryLevel,
      sentences: sentences,
      createdAt: Date.now(),
      isBuiltIn: false,
      fullTranslation: newStoryTranslation.trim() || parsed.translation || undefined,
      glossary: glossaryEntries
    };

    try {
      await saveStory(createdStory);
      await refreshLibraryData();
      
      // Reset Modal Form
      setNewStoryTitle("");
      setNewStoryLevel("beginner");
      setNewStoryRawText("");
      setNewStoryGlossary("");
      setNewStoryTranslation("");
      setIsAddStoryOpen(false);
      setAddStoryError("");
    } catch (err) {
      console.error("Failed to commit user custom story to DB:", err);
      setAddStoryError("An error occurred while saving custom story.");
    }
  };

  const handleDeleteStoryTrigger = async (storyId: string) => {
    if (confirm("Are you sure you want to permanently delete this story from your device?")) {
      await deleteStory(storyId);
      await refreshLibraryData();
    }
  };

  // ---------------------------------------------------------------------------
  // 8. DB Backup Import / Export handler
  // ---------------------------------------------------------------------------
  const handleExportBackup = async () => {
    try {
      const dataStr = await dbExportJSON();
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `french-typing-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error("Backup build fail:", err);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (!e.target.files || e.target.files.length === 0) return;
    
    fileReader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const result = await dbImportJSON(json);
        setImportStatus({
          type: "success",
          msg: `Configuration restored successfully! Imported ${result.importedStories} custom stories and ${result.importedSessions} active attempts.`
        });
        await refreshLibraryData();
      } catch (err) {
        setImportStatus({
          type: "error",
          msg: "Failed to parse system configuration. Ensure standard French Typing backup file is uploaded."
        });
      }
    };
    fileReader.readAsText(e.target.files[0]);
  };

  const handleClearAllStorage = async () => {
    try {
      await clearAllData();
      await refreshLibraryData();
      setShowClearConfirm(false);
      setIsSettingsOpen(false);
      setCurrentScreen("library");
      alert("All system databases purged successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  // Active Realtime interactive state calculations inside typing zone
  const activeUnfinishedCharsCount = currentSentence 
    ? Math.max(0, currentSentence.french.length - typedText.length) 
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-[#e2e2e2] font-sans antialiased relative overflow-hidden select-none">
      
      {/* -----------------------------------------------------------------------
          TOP NAVIGATION HEADER
          ----------------------------------------------------------------------- */}
      <nav id="nav-top" className="h-14 min-h-[56px] border-b border-white/5 flex items-center justify-between px-6 sm:px-8 bg-[#111216]/90 relative z-10">
        <div className="flex items-baseline gap-4">
          <div className="flex items-baseline gap-2.5">
            <Languages className="w-4.5 h-4.5 text-burgundy relative top-[2px]" />
            <div className="flex flex-col select-none leading-none">
              <span 
                onClick={() => {
                  if ("speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  setCurrentScreen("library");
                }}
                className="text-2xl font-serif italic font-bold tracking-wide text-white cursor-pointer hover:opacity-85 border-b-2 border-double border-burgundy/30 pb-0.5 inline-block"
              >
                L'Écho de Paris
              </span>
              <span className="text-[9px] tracking-[0.25em] uppercase text-zinc-500 font-sans mt-0.5">Journal d'Apprentissage</span>
            </div>
          </div>
          

          {/* Navigation tabs between Bibliothèque and Apprendre */}
          {(currentScreen === "library" || currentScreen === "learn" || currentScreen === "lesson-setup" || (currentScreen === "practice" && practiceType === "free")) && (
            <div className="flex items-baseline gap-4 ml-6 border-l border-white/10 pl-6 h-full pb-0.5">
              <button
                onClick={() => {
                  if ("speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  setCurrentScreen("library");
                }}
                className={`px-1 pb-1 text-xs font-semibold border-b-2 bg-transparent rounded-none border-t-0 border-l-0 border-r-0 transition-all cursor-pointer ${
                  currentScreen === "library"
                    ? "border-[#7B1E2B] text-white"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Bibliothèque
              </button>
              <button
                onClick={() => handleStartFreeMode(false)}
                className={`px-1 pb-1 text-xs font-semibold border-b-2 bg-transparent rounded-none border-t-0 border-l-0 border-r-0 transition-all cursor-pointer ${
                  currentScreen === "practice" && practiceType === "free"
                    ? "border-[#7B1E2B] text-white"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Mode Libre
              </button>
              <button
                onClick={() => {
                  if ("speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  setCurrentScreen("learn");
                }}
                className={`px-1 pb-1 text-xs font-semibold border-b-2 bg-transparent rounded-none border-t-0 border-l-0 border-r-0 transition-all cursor-pointer relative ${
                  currentScreen === "learn" || currentScreen === "lesson-setup"
                    ? "border-[#7B1E2B] text-white"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Apprendre
                {!settings.calibrationComplete && !settings.lettersComplete && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-burgundy-hover rounded-full" />
                )}
              </button>
            </div>
          )}

          {currentScreen === "practice" && selectedStory && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ml-2 ${
              selectedStory.level === "beginner" ? "bg-burgundy-soft text-burgundy border-burgundy-border" :
              selectedStory.level === "easy" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            }`}>
              {selectedStory.level === "beginner" ? "Débutant" : 
               selectedStory.level === "easy" ? "Facile" : "Intermédiaire"}
            </span>
          )}
        </div>

        {/* Live Typing Run Stats Container */}
        <div className="flex items-center gap-4 sm:gap-10">
          {currentScreen === "practice" ? (
            <div className="flex gap-4 sm:gap-8 mr-2 sm:mr-6">
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">WPM</span>
                <span className="text-base sm:text-lg font-mono text-white leading-tight">
                  {(() => {
                    if (sessionStartTime === null) return "0";
                    const min = Math.max(1, Date.now() - sessionStartTime) / 1000 / 60;
                    const correctTypedStr = Math.max(0, sessionTotalCharsTyped - sessionTotalErrors);
                    return Math.max(0, Math.round((correctTypedStr / 5) / min));
                  })()}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Précision</span>
                <span className="text-base sm:text-lg font-mono text-white leading-tight">
                  {sessionTotalCharsTyped > 0 
                    ? `${Math.max(0, Math.min(100, Math.round(((sessionTotalCharsTyped - sessionTotalErrors) / sessionTotalCharsTyped) * 100)))}%`
                    : "100%"
                  }
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Erreurs</span>
                <span className="text-base sm:text-lg font-mono text-rose-500 leading-tight">
                  {sessionTotalErrors}
                </span>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex text-xs text-zinc-400 gap-2 items-center mr-4">
              <TrendingUp className="w-3.5 h-3.5 text-burgundy" />
              <span>{sessions.length} histoires complétées</span>
            </div>
          )}

          <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

          {/* Settings Trigger Icon */}
          <div className="flex items-center gap-3">
            <button 
              id="btn-settings"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-zinc-300 hover:text-white"
              title="Paramètres de l'application"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* -----------------------------------------------------------------------
          MAIN SCREENS ROUTING VIEWPORT
          ----------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col justify-start relative px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full z-10">
        
        {/* VIEW 1: PRE-SEEDED STORIES LIBRARY LIST & ACTIVITY STATS */}
        {currentScreen === "library" && (
          <div className="w-full animate-fade-in flex flex-col gap-6">

            {/* Onboarding Calibration Banner */}
            {!settings.calibrationComplete && !settings.bannerDismissed && (
              <div className="w-full bg-burgundy-soft border border-burgundy-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in mb-2 col-span-full">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-burgundy-soft flex items-center justify-center text-burgundy font-sans">
                    ✨
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white font-sans">Nouveau sur l'agencement AZERTY ?</h4>
                    <p className="text-xs text-zinc-400 mt-0.5 font-sans">Commencez par notre calibration des touches et des accents essentiels pour vous échauffer.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button 
                    onClick={async () => {
                      const updated = { ...settings, bannerDismissed: true };
                      setSettings(updated);
                      await saveSettings(updated);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer font-sans"
                  >
                    Ignorer
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentScreen("learn");
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-burgundy hover:bg-burgundy-hover rounded-lg shadow-lg flex items-center gap-1 transition-all hover:scale-105 cursor-pointer font-sans"
                  >
                    Aller à Apprendre <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Header Display Board */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div className="border-l-2 border-[#7B1E2B] pl-4">
                <h2 className="text-3xl sm:text-4xl font-serif text-white tracking-tight">Bibliothèque d'Exercices</h2>
                <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                  Pratiquez la dactylographie française avec des récits littéraires authentiques. Améliorez votre vitesse d'écriture et maîtrisez tous les accents orthographiques requis.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleStartFreeMode(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-hover active:bg-burgundy text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-all hover:scale-102 cursor-pointer shadow-lg"
                >
                  <Keyboard className="w-4 h-4" /> Mode Libre
                </button>

                <button 
                  id="btn-add-story"
                  onClick={() => {
                    setNewStoryTitle("");
                    setNewStoryRawText("");
                    setNewStoryTranslation("");
                    setAddStoryError("");
                    setIsAddStoryOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1f2026] hover:bg-zinc-800 text-zinc-350 border border-white/5 hover:text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Ajouter une histoire
                </button>
              </div>
            </div>

            <Fleuron className="my-4" />

            {/* Quick Summary Dashboard metrics row */}
            {sessions.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Vitesse Moyenne</span>
                  <span className="text-xl sm:text-2xl font-mono text-white mt-1">
                    {Math.round(sessions.reduce((acc, s) => acc + s.wpm, 0) / sessions.length)} <span className="text-xs text-zinc-500 font-sans">WPM</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Précision Moyenne</span>
                  <span className="text-xl sm:text-2xl font-mono text-burgundy mt-1">
                    {Math.round(sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Erreurs Totales</span>
                  <span className="text-xl sm:text-2xl font-mono text-rose-500 mt-1">
                    {sessions.reduce((acc, s) => acc + s.errors, 0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Temps de Frappe</span>
                  <span className="text-xl sm:text-2xl font-mono text-amber-400 mt-1">
                    {(() => {
                      const totalSec = sessions.reduce((acc, s) => acc + s.duration, 0);
                      const m = Math.floor(totalSec / 60);
                      const s = totalSec % 60;
                      return `${m}m ${s}s`;
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Stories Filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une histoire..."
                  className="bg-transparent text-sm w-full focus:outline-none text-white placeholder-zinc-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Niveau :</span>
                <div className="flex bg-white/5 border border-white/5 p-1 rounded-lg">
                  {[
                    { id: "all", label: "Tous" },
                    { id: "beginner", label: "Débutant" },
                    { id: "easy", label: "Facile" },
                    { id: "intermediate", label: "Intermédiaire" }
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      onClick={() => setSelectedLevelFilter(lvl.id)}
                      className={`px-3 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        selectedLevelFilter === lvl.id 
                          ? "bg-white/15 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Fleuron className="my-2" />

            {/* Custom Grid Layout display stories */}
            {filteredStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-[#1a1614] border border-[#d9c4b1]/15 rounded-2xl relative overflow-hidden"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.04 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`
                }}
              >
                <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1" className="text-burgundy/15 mb-4">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <p className="text-sm font-serif italic text-zinc-400">"Votre bibliothèque attend ses premiers récits."</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Visual Premium Injected Card for Mode Libre */}
                {searchQuery === "" && (
                  <div 
                    onClick={() => handleStartFreeMode(false)}
                    className="group flex flex-col justify-between bg-[#1a1614] border border-burgundy-border/40 hover:border-burgundy/40 rounded-2xl pl-8 pr-6 py-6 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_35px_rgba(123,30,43,0.1)]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`
                    }}
                  >
                    {/* Spine Left band */}
                    <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-burgundy group-hover:shadow-[2px_0_15px_rgba(123,30,43,0.5)] transition-all duration-300" />

                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <span className="text-[10px] uppercase tracking-wider text-burgundy font-sans block">
                          récit · niveau personnalisé
                        </span>

                        <div className="flex items-center gap-1.5 text-[11px] text-burgundy/80 font-mono">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                          <span>Sans limites</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-serif text-white leading-tight mb-2 group-hover:text-burgundy transition-colors flex items-center gap-2">
                        <Keyboard className="w-4 h-4 text-burgundy" /> Mode Libre Actif
                      </h3>

                      <p className="text-xs text-zinc-400 leading-relaxed italic pr-4 mb-4 font-serif">
                        "Collez n'importe quel contenu ou texte français personnalisé, écoutez la lecture audio complète en boucle et pratiquez librement."
                      </p>
                    </div>

                    <div className="pt-4 border-t border-burgundy-border/15 flex items-center justify-between mt-4">
                      <span className="text-[10px] tracking-wider text-zinc-500 uppercase font-sans">Option Intégrée</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartFreeMode(false);
                        }}
                        className="bg-burgundy hover:bg-burgundy-hover text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md"
                      >
                        Lire & Écrire <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Visual Premium Injected Card for Vidéo Dictée */}
                {searchQuery === "" && (
                  <div 
                    onClick={() => handleStartVideoDictee()}
                    className="group flex flex-col justify-between bg-[#1a1614] border border-burgundy-border/40 hover:border-burgundy/40 rounded-2xl pl-8 pr-6 py-6 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_35px_rgba(123,30,43,0.1)]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`
                    }}
                  >
                    {/* Spine Left band */}
                    <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-burgundy group-hover:shadow-[2px_0_15px_rgba(123,30,43,0.5)] transition-all duration-300" />

                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <span className="text-[10px] uppercase tracking-wider text-burgundy font-sans block">
                          dictée interactive · vidéo local
                        </span>

                        <div className="flex items-center gap-1.5 text-[11px] text-burgundy/80 font-mono">
                          <Video className="w-3.5 h-3.5" />
                          <span>Nouveau</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-serif text-white leading-tight mb-2 group-hover:text-burgundy transition-colors flex items-center gap-2">
                        <Video className="w-4 h-4 text-burgundy" /> Vidéo Dictée
                      </h3>

                      <p className="text-xs text-zinc-400 leading-relaxed italic pr-4 mb-4 font-serif">
                        "Téléversez votre vidéo (.mp4, .webm) et vos sous-titres (.srt). La vidéo s’arrête automatiquement à chaque phrase pour vous laisser saisir le texte."
                      </p>
                    </div>

                    <div className="pt-4 border-t border-burgundy-border/15 flex items-center justify-between mt-4">
                      <span className="text-[10px] tracking-wider text-zinc-500 uppercase font-sans">Fonctionnalité Locale</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartVideoDictee();
                        }}
                        className="bg-burgundy hover:bg-burgundy-hover text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md"
                      >
                        Pratiquer <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {filteredStories.map((story) => {
                  const pb = personalBestRecords[story.id];
                  const sentencesCount = story.sentences.length;
                  const totalWords = story.sentences.reduce((acc, sent) => acc + sent.french.split(/\s+/).length, 0);

                  const levelLabel = story.level === "beginner" ? "débutant" : 
                                     story.level === "easy" ? "facile" : "intermédiaire";

                  const spineColorClass = story.level === "beginner" ? "bg-emerald-500 group-hover:shadow-[2px_0_15px_rgba(16,185,129,0.5)]" :
                                          story.level === "easy" ? "bg-amber-500 group-hover:shadow-[2px_0_15px_rgba(245,158,11,0.5)]" :
                                          "bg-indigo-500 group-hover:shadow-[2px_0_15px_rgba(99,102,241,0.5)]";

                  return (
                    <div 
                      key={story.id} 
                      className="group flex flex-col justify-between bg-[#1a1614] border border-white/5 hover:border-white/10 rounded-2xl pl-8 pr-6 py-6 transition-all duration-300 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`
                      }}
                    >
                      {/* Left edge band (Spine) element */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[6px] transition-all duration-300 ${spineColorClass}`} />

                      <div>
                        {/* Upper Details Meta */}
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-sans block">
                            récit · niveau {levelLabel}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            story.level === "beginner" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" :
                            story.level === "easy" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          }`}>
                            {story.level === "beginner" ? "Débutant" : 
                             story.level === "easy" ? "Facile" : "Intermédiaire"}
                          </span>
                        </div>

                        {/* Title of Story */}
                        <h3 className="text-xl font-serif text-white leading-tight mb-2 group-hover:text-burgundy transition-colors">
                          {story.title}
                        </h3>

                        {/* Story Initial Excerpt to read preview */}
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed italic pr-4 mb-4 font-serif">
                          "{story.sentences[0]?.french}"
                        </p>
                      </div>

                      {/* Best Attempts Stats block or Library launch indicators */}
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] tracking-wider text-zinc-500 uppercase font-sans block truncate">
                            {sentencesCount} phrases · {totalWords} mots
                          </span>
                          {pb ? (
                            <span className="text-[9px] text-zinc-400 font-mono">
                              Record: <strong className="text-white">{pb.wpm} WPM</strong> | <strong className="text-burgundy">{pb.accuracy}%</strong>
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-500 italic block font-serif">Non commencé</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!story.isBuiltIn && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStoryTrigger(story.id);
                              }}
                              className="p-1 px-2 text-zinc-600 hover:text-rose-500 rounded hover:bg-rose-500/10 transition-colors"
                              title="Delete Story"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartPractice(story)}
                            className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans"
                          >
                            Lire & Écrire <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Historique Activity Runs logs at bottom of library */}
            {sessions.length > 0 && (
              <div className="mt-12 w-full border-t border-white/5 pt-8">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-zinc-500" />
                  <h3 className="text-base font-serif text-white">Journal de vos tentatives de frappe</h3>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.01]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                        <th className="p-4">Date</th>
                        <th className="p-4">Histoire</th>
                        <th className="p-4">WPM</th>
                        <th className="p-4">Précision</th>
                        <th className="p-4">Erreurs</th>
                        <th className="p-4">Durée</th>
                        <th className="p-4">Mots Difficiles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                      {sessions.slice(0, 10).map((run) => (
                        <tr key={run.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 text-zinc-400">
                            {new Date(run.date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="p-4 text-white font-sans font-medium">{run.storyTitle}</td>
                          <td className="p-4 font-bold text-amber-400">{run.wpm}</td>
                          <td className="p-4 text-burgundy">{run.accuracy}%</td>
                          <td className="p-4 text-rose-500">{run.errors}</td>
                          <td className="p-4 text-zinc-400">{run.duration}s</td>
                          <td className="p-4 text-zinc-500 font-sans italic">
                            {run.hardestWords && run.hardestWords.length > 0 
                              ? run.hardestWords.join(", ") 
                              : "Aucun"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 1.5: APPRENDRE (LEARN) TRAINING CLINIC */}
        {currentScreen === "learn" && (
          <div className="w-full animate-fade-in flex flex-col gap-6">
            
            {/* Header Display Board */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div className="border-l-2 border-[#7B1E2B] pl-4">
                <h2 className="text-3xl sm:text-4xl font-serif text-white tracking-tight">Apprentissage Interactif</h2>
                <p className="text-sm text-zinc-400 mt-1 max-w-xl font-sans">
                  Développez votre mémoire musculaire sur l'agencement AZERTY. Domptez les touches déplacées et maîtrisez l'accès rapide aux caractères accentués.
                </p>
              </div>
            </div>

            <Fleuron className="my-2" />

            {/* Grid of 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Card 1: Lettres AZERTY */}
              <div className="group flex flex-col justify-between bg-white/[0.015] border border-white/5 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-white/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#7B1E2B]/80 absolute top-4 right-4 bg-transparent">N° 01</span>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    {settings.lettersComplete ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-teal-500/30 text-teal-400 bg-transparent">
                        Complété ✓
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">Non commencé</span>
                    )}
                    <span className="text-[11px] text-zinc-500 pr-10">15 séquences</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-burgundy transition-colors">
                    Lettres AZERTY
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    A Z Q W M — les 5 touches déplacées uniques par rapport à l'agencement QWERTY standard.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">Entraîner</span>
                  <button
                    onClick={() => startDrillSession("letters")}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 2: Accents essentiels */}
              <div className="group flex flex-col justify-between bg-white/[0.015] border border-white/5 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-white/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#F59E0B]/80 absolute top-4 right-4 bg-transparent">N° 02</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    {settings.accentsComplete ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-teal-500/30 text-teal-400 bg-transparent">
                        Complété ✓
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">Non commencé</span>
                    )}
                    <span className="text-[11px] text-zinc-500 pr-10">4 étapes</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-burgundy transition-colors">
                    Accents essentiels
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    é è ç à ù â ê î ô û ë ï — apprenez les touches puis pratiquez sur des mots réels.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">Entraîner</span>
                  <button
                    onClick={() => startDrillSession("accents")}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 3: Calibration complète */}
              <div className="group flex flex-col justify-between bg-white/[0.015] border border-white/5 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-white/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#6366F1]/80 absolute top-4 right-4 bg-transparent">N° 03</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    {settings.calibrationComplete ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-teal-500/30 text-teal-400 bg-transparent">
                        Complété ✓
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">Non commencé</span>
                    )}
                    <span className="text-[11px] text-zinc-500 pr-10">2 parties</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-burgundy transition-colors">
                    Calibration complète
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    Lettres + accents — 2 minutes d'évaluation enchaînée complète pour calibrer vos doigts.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 font-sans relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">S'évaluer</span>
                  <button
                    onClick={() => startDrillSession("calibration")}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 4: Fluidité progressive (Flow) */}
              <div className="group flex flex-col justify-between bg-white/[0.015] border border-white/5 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-white/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#14B8A6]/80 absolute top-4 right-4 bg-transparent">N° 04</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-teal-500/30 text-teal-400 bg-transparent">
                      Sans limites
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono pr-10">Cycle infini</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-teal-400 transition-colors">
                    Fluidité progressive
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    Une boucle de pratique infinie alternant mots courts, moyens, longs, puis phrases réelles.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">Entraîner</span>
                  <button
                    onClick={() => startDrillSession("flow")}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 5: Mots courts */}
              <div className="group flex flex-col justify-between bg-white/[0.015] border border-white/5 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-white/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#0EA5E9]/80 absolute top-4 right-4 bg-transparent">N° 05</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-sky-500/30 text-sky-400 bg-transparent">
                      Endurant
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono pr-10">+200 mots</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-sky-400 transition-colors">
                    Mots courts
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    Concentrez votre mémoire musculaire sur les petits mots quotidiens français de 2 à 5 lettres.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">Entraîner</span>
                  <button
                    onClick={() => startDrillSession("wordsShort")}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 6: Mots longs */}
              <div className="group flex flex-col justify-between bg-white/[0.015] border border-white/5 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-white/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#6366F1]/80 absolute top-4 right-4 bg-transparent">N° 06</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-indigo-500/30 text-indigo-400 bg-transparent">
                      Expert
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono pr-10">+150 mots</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-indigo-400 transition-colors">
                    Mots longs
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    Mesurez-vous aux mots complexes ou littéraires de 10+ lettres pour asseoir vos positions AZERTY.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">Entraîner</span>
                  <button
                    onClick={() => startDrillSession("wordsLong")}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 7: Phrases complètes */}
              <div className="group flex flex-col justify-between bg-white/[0.015] border border-white/5 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-white/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#7B1E2B]/80 absolute top-4 right-4 bg-transparent">N° 07</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-[#7B1E2B]/30 text-burgundy bg-transparent">
                      Maîtrise
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono pr-10">Générateur libre</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-burgundy transition-colors">
                    Phrases complètes
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    Rédigez des phrases complètes, variées et dynamiques combinant verbes, sujets et objets français.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">Entraîner</span>
                  <button
                    onClick={() => startDrillSession("phrases")}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 8: Dictée (Dictation Audio Play) */}
              <div id="card-dictation" className="group flex flex-col justify-between bg-white/[0.015] border border-purple-500/10 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.01)] hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] hover:border-purple-500/30 cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-purple-500/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#A855F7]/80 absolute top-4 right-4 bg-transparent">N° 08</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-purple-500/30 text-purple-400 bg-transparent">
                      Nouveau ! d'Oreille
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono pr-10">Audio seul</span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-purple-400 transition-colors flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-400" /> Dictée AZERTY
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    Pas de texte affiché ! Écoutez l'audio en français et ressaisissez fidèlement la séquence dictée sans erreur.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">S'entraîner</span>
                  <button
                    onClick={() => setIsDictationConfigOpen(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-gradient-to-r from-purple-600 to-indigo-600"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 9: Leçon du jour */}
              <div id="card-daily-lesson" className="group flex flex-col justify-between bg-white/[0.015] border border-blue-500/10 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.01)] hover:bg-white/[0.035] hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.02)] hover:border-blue-500/30 cursor-pointer">
                {/* Practice ticket inside dashed border */}
                <div className="absolute inset-1.5 border border-dashed border-blue-500/10 group-hover:border-solid rounded-xl pointer-events-none transition-all duration-300" />
                
                {/* Utilitarian numbering stamp */}
                <span className="text-[10px] font-mono font-bold tracking-wider text-[#3B82F6]/80 absolute top-4 right-4 bg-transparent">N° 09</span>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-blue-500/30 text-blue-400 bg-transparent">
                      Quotidien
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1 pr-10">
                      🔥 Série : {settings.streakCount || 0}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif italic font-medium text-white leading-tight mb-2 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" /> Leçon du jour
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                    Collez votre leçon (mots, phrases, paragraphe, dictée) et progressez à travers notre rituel adaptatif d'assimilation en 4 étapes.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 relative z-10">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-sans">S'initier</span>
                  <button
                    onClick={() => setCurrentScreen("lesson-setup")}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer font-sans shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    Commencer l'exercice <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>

            {/* Dictation Mode Setup Modal */}
            {isDictationConfigOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
                <div className="bg-zinc-950 border border-purple-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  {/* Purple top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-purple-500" />
                  
                  <button 
                    onClick={() => setIsDictationConfigOpen(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 animate-pulse">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif text-white font-bold">Configuration de la Dictée</h3>
                      <p className="text-xs text-zinc-400">Pratiquez la frappe rythmée à l'oreille</p>
                    </div>
                  </div>

                  {/* Scope Choice */}
                  <div className="mb-5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Contenu et progression :</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDictationScope("words")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          dictationScope === "words"
                            ? "bg-purple-500/15 border-purple-500 text-white"
                            : "bg-[#0d0d0f] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                        }`}
                      >
                        <span className="text-xs font-bold block mb-0.5">Mots à la chaîne</span>
                        <span className="text-[10px] text-zinc-500 leading-snug block">Mots courts, moyens puis longs de façon infinie.</span>
                      </button>
                      <button
                        onClick={() => setDictationScope("progressive")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          dictationScope === "progressive"
                            ? "bg-purple-500/15 border-purple-500 text-white"
                            : "bg-[#0d0d0f] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                        }`}
                      >
                        <span className="text-xs font-bold block mb-0.5">Progressif complet</span>
                        <span className="text-[10px] text-zinc-500 leading-snug block">Combinaison de mots qui évolue vers des phrases.</span>
                      </button>
                    </div>
                  </div>

                  {/* Level Choice (Hint level) */}
                  <div className="mb-6">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Niveau des indices d'erreurs :</label>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setDictationHintLevel("easy")}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          dictationHintLevel === "easy"
                            ? "bg-purple-500/15 border-purple-500 text-white"
                            : "bg-[#0d0d0f] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block">Facile : Indice complet</span>
                          <span className="text-[10px] text-zinc-500">Affiche le mot complet pendant 1 seconde en cas de faute</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setDictationHintLevel("medium")}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          dictationHintLevel === "medium"
                            ? "bg-purple-500/15 border-purple-500 text-white"
                            : "bg-[#0d0d0f] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block">Moyen : Indice minimal</span>
                          <span className="text-[10px] text-zinc-500">Affiche uniquement la prochaine lettre attendue pendant 1 seconde</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setDictationHintLevel("hard")}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          dictationHintLevel === "hard"
                            ? "bg-purple-500/15 border-purple-500 text-white"
                            : "bg-[#0d0d0f] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block">Expert : Aucun indice</span>
                          <span className="text-[10px] text-zinc-500">Aucun indice visuel, la dictée se fait purement au son</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDictationConfigOpen(false)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer font-sans"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        setIsDictationConfigOpen(false);
                        startDrillSession("dictation");
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer font-sans shadow-lg shadow-purple-500/20"
                    >
                      Démarrer
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* VIEW 2.2: LEÇON DU JOUR SETUP AND PAST LESSONS */}
        {currentScreen === "lesson-setup" && (
          <div className="w-full max-w-4xl mx-auto animate-fade-in flex flex-col gap-6 font-sans">
            
            {/* Navigation Header */}
            <div className="flex items-center justify-between font-sans pb-4 border-b border-white/5">
              <button
                onClick={() => {
                  setLessonError(null);
                  setCurrentScreen("learn");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer"
              >
                ← Retour à Apprendre
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Rituel Quotidien</span>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-1">
                  🔥 Série : {settings.streakCount || 0} jours
                </span>
              </div>
            </div>

            {/* Main grid: Form on the left/full, past lessons on the right/bottom */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Lesson Parser form */}
              <div className="lg:col-span-2 bg-[#0c0d11]/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-serif text-white leading-tight mb-1 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" /> Charger une Leçon du Jour
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Collez votre set de pratique généré en externe. Le système formulera automatiquement les 4 étapes : Mots, Phrases, Pratique du Paragraphe et Dictée Audio.
                  </p>
                </div>

                {lessonError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 font-sans font-medium flex items-start gap-2 animate-pulse">
                    <span>⚠️</span>
                    <span>{lessonError}</span>
                  </div>
                )}

                {/* Form fields */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Titre de la leçon</label>
                    <input
                      type="text"
                      placeholder="Ex: La Cuisine Française – Jour 1"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="w-full bg-[#050507] border border-white/5 hover:border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2 text-sm transition-all focus:outline-none placeholder-zinc-600 font-sans"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Texte structuré de la leçon</label>
                      <button
                        onClick={() => {
                          setLessonTitle("Vocabulaire de la Cuisine");
                          setLessonText(`#GLOSSARY\ncuire (to cook) — je cuis le pain (I cook the bread)\nfour (oven) — un four chaud (a hot oven)\n\n#WORDS\ncuire, four, sel, farine\n#SENTENCES\nJe fais cuire le pain.\nLe four est très chaud.\n#PARAGRAPH\nCe matin, je prépare du pain. Le four est chaud...\n#TRANSLATION\nThis morning, I make bread...`);
                        }}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase font-sans tracking-wide"
                      >
                        Insérer un exemple
                      </button>
                    </div>
                    <textarea
                      placeholder={`#GLOSSARY\ncuire (to cook) — je cuis le pain (I cook the bread)\nfour (oven) — un four chaud (a hot oven)\n\n#WORDS\ncuire, four, sel, farine\n\n#SENTENCES\nJe fais cuire le pain.\nLe four est très chaud.\n\n#PARAGRAPH\nCe matin, je prépare du pain. Le four est chaud...\n\n#TRANSLATION\nThis morning, I make bread...`}
                      value={lessonText}
                      onChange={(e) => setLessonText(e.target.value)}
                      rows={12}
                      className="w-full bg-[#050507] border border-white/5 hover:border-[#1e2029] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-3 text-sm transition-all focus:outline-none font-mono placeholder-zinc-600 leading-relaxed scrollbar-thin"
                    />
                    <span className="text-[10px] text-zinc-500 leading-normal">
                      Conseil : Utilisez exactement les balises <span className="text-zinc-400 font-mono">#GLOSSARY</span>, <span className="text-zinc-400 font-mono">#WORDS</span>, <span className="text-zinc-400 font-mono">#SENTENCES</span>, <span className="text-zinc-400 font-mono">#PARAGRAPH</span> et <span className="text-zinc-400 font-mono">#TRANSLATION</span>.
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <button
                    onClick={async () => {
                      setLessonError(null);
                      const parsed = parseLessonText(lessonTitle, lessonText);
                      if (parsed.error || !parsed.lesson) {
                        setLessonError(parsed.error || "Une erreur inconnue s'est produite.");
                        return;
                      }
                      
                      const newLessonObj: Lesson = {
                        id: `lesson-${Date.now()}`,
                        title: parsed.lesson.title,
                        words: parsed.lesson.words,
                        sentences: parsed.lesson.sentences,
                        paragraph: parsed.lesson.paragraph,
                        translation: parsed.lesson.translation,
                        date: Date.now(),
                        completed: false,
                        glossary: parsed.lesson.glossary
                      };

                      try {
                        await saveLesson(newLessonObj);
                        const freshLessons = await getLessons();
                        setPastLessons(freshLessons.sort((a,b) => b.date - a.date));
                        
                        // Start the drill
                        setLessonTitle("");
                        setLessonText("");
                        startDrillSession("lesson", 1, newLessonObj);
                      } catch (err) {
                        console.error(err);
                        setLessonError("Échec de la sauvegarde de la leçon dans l'application.");
                      }
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/10 font-sans"
                  >
                    Commencer la leçon <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Library of Saved Lessons */}
              <div className="bg-[#0c0d11]/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    🗃️ Bibliothèque des Leçons
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Retrouvez et rejouez les exercices sauvegardés précédemment de votre historique.
                  </p>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin flex-1">
                  {pastLessons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                      {/* Notebook SVG */}
                      <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1" className="text-burgundy/15 mb-4 max-w-[80px]">
                        <rect x="5" y="2" width="14" height="20" rx="2" />
                        <line x1="9" y1="6" x2="15" y2="6" strokeDasharray="1 1" />
                        <line x1="9" y1="10" x2="15" y2="10" strokeDasharray="1 1" />
                        <line x1="9" y1="14" x2="15" y2="14" strokeDasharray="1 1" />
                        <line x1="9" y1="18" x2="15" y2="18" strokeDasharray="1 1" />
                        <line x1="2" y1="6" x2="5" y2="6" stroke="currentColor" />
                        <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" />
                        <line x1="2" y1="18" x2="5" y2="18" stroke="currentColor" />
                      </svg>
                      <span className="text-xs font-serif italic text-zinc-500 leading-relaxed">
                        "Aucune leçon enregistrée. Commencez par coller votre première leçon."
                      </span>
                    </div>
                  ) : (
                    pastLessons.map((les) => {
                      const lessonDateObj = new Date(les.date);
                      const dayStr = lessonDateObj.getDate();
                      const monthStr = lessonDateObj.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");

                      return (
                        <div 
                          key={les.id} 
                          className="group p-4 rounded-xl border border-[#d9c4b1]/10 bg-[#15110e] hover:rotate-[-0.3deg] transition-all duration-200 flex flex-col gap-3 relative overflow-hidden shadow-md cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.04 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>"), linear-gradient(to bottom, transparent 15px, rgba(217, 196, 177, 0.03) 15px)`,
                            backgroundSize: '100% 100%, 100% 16px'
                          }}
                        >
                          <div className="flex gap-3.5 items-start">
                            {/* Date Stamp Component */}
                            <div className="flex flex-col items-center justify-center shrink-0 w-11 h-12 bg-white/[0.02] border border-[#d9c4b1]/10 rounded-lg text-center leading-none p-1.5 shadow-sm group-hover:bg-white/[0.06] transition-all duration-200">
                              <span className="text-lg font-serif font-bold text-white leading-none">{dayStr}</span>
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans mt-0.5">{monthStr}</span>
                            </div>

                            {/* Title & Badge */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <span className="text-xs font-serif font-medium italic text-white line-clamp-2 leading-tight group-hover:text-burgundy transition-colors" title={les.title}>
                                {les.title}
                              </span>
                              
                              <div className="mt-1.5 flex items-center gap-2">
                                {les.completed ? (
                                  <span className="text-[10px] font-serif italic text-teal-400 bg-transparent underline decoration-teal-400/30">
                                    Fait ✓
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-serif italic text-zinc-400 bg-transparent underline decoration-zinc-500/30">
                                    Plein
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ruled metadata row */}
                          <div className="text-[10px] text-zinc-500 flex flex-wrap gap-x-2.5 gap-y-1 p-1 font-mono relative z-10 border-t border-white/[0.03] pt-2">
                            <span>{les.words.length} mots</span>
                            <span>•</span>
                            <span>{les.sentences.length} phrases</span>
                            {les.translation && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-[600] font-serif italic text-[10px]">avec traduction</span>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 font-sans relative z-10">
                            <button
                              onClick={() => startDrillSession("lesson", 1, les)}
                              className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#d9c4b1]/10 transition-all cursor-pointer"
                            >
                              Réviser
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await deleteLesson(les.id);
                                  const fresh = await getLessons();
                                  setPastLessons(fresh.sort((a,b) => b.date - a.date));
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="p-1.5 bg-[#881337]/10 hover:bg-[#881337]/25 text-rose-500 hover:text-rose-400 text-[12px] font-bold rounded-lg border border-rose-500/10 transition-all cursor-pointer flex items-center justify-center shrink-0 w-8"
                              title="Supprimer cette leçon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 2.5: INTERACTIVE TYPING MASTER AZERTY DRILL (LETTERS, ACCENTS, OR CALIBRATION) */}
        {currentScreen === "practice" && (practiceType === "letters" || practiceType === "accents" || practiceType === "calibration" || practiceType === "flow" || practiceType === "wordsShort" || practiceType === "wordsLong" || practiceType === "phrases" || practiceType === "dictation" || practiceType === "lesson") && (() => {
          const showGlossary = practiceType === "lesson" && activeLesson?.glossary && activeLesson.glossary.length > 0 && drillStage < 4;
          const currentTargetWord = drillItems[drillItemIndex] || "";

          return (
            <div className="w-full animate-fade-in flex flex-col justify-between flex-1 gap-6 mt-4">
              
              {/* Header / Meta / Progress marker */}
              <div className="flex flex-col items-center relative gap-2 font-sans mb-2 w-full">
                <div className="w-full flex flex-col md:flex-row items-center md:justify-between gap-4 border-b border-white/[0.05] pb-3 mb-1">
                  <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                    <button 
                      onClick={() => {
                        if ("speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                        setCurrentScreen("learn");
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer"
                    >
                      ← Retour à Apprendre
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-xs font-bold text-burgundy uppercase tracking-widest bg-burgundy-soft px-2.5 py-0.5 rounded-full border border-burgundy-border">
                      {practiceType === "calibration" 
                        ? `Calibration : Partie ${calibrationPart}` 
                        : practiceType === "accents" 
                        ? "Accents essentiels" 
                        : practiceType === "flow"
                        ? `Fluidité progressive (Ronde ${drillRound})`
                        : practiceType === "wordsShort"
                        ? `Mots courts (Ronde ${drillRound})`
                        : practiceType === "wordsLong"
                        ? `Mots longs (Ronde ${drillRound})`
                        : practiceType === "phrases"
                        ? `Phrases complètes (Ronde ${drillRound})`
                        : practiceType === "dictation"
                        ? `Dictée - ${dictationScope === "words" ? "Mots" : "Progressif"} (Ronde ${drillRound})`
                        : `Ronde ${drillRound}`
                      }
                    </span>
                    
                    {showGlossary && (
                      <>
                        <div className="h-4 w-px bg-white/10" />
                        <button 
                          onClick={() => setGlossaryExpanded(!glossaryExpanded)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer font-sans flex items-center gap-1.5 ${
                            glossaryExpanded 
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25" 
                              : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{glossaryExpanded ? "Masquer le Glossaire" : "Afficher le Glossaire"}</span>
                        </button>
                      </>
                    )}

                    <div className="h-4 w-px bg-white/10" />
                    <button 
                      onClick={handleStopLettersDrill}
                      className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/20 transition-all cursor-pointer font-sans"
                    >
                      Terminer la session
                    </button>
                  </div>
                  
                  {/* Error Mode Toggle */}
                  <div className="shrink-0 flex items-center justify-center">
                    <ErrorModeToggle errorMode={errorMode} onChange={handleToggleErrorMode} />
                  </div>
                </div>

                {/* Stage Indicators */}
                {(practiceType === "letters" || practiceType === "accents" || practiceType === "calibration" || practiceType === "flow" || practiceType === "dictation") ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 gap-y-1.5 mt-3 px-2">
                    {[1, 2, 3, 4].map((stageNum) => {
                      if (practiceType === "dictation" && dictationScope === "words" && stageNum === 4) return null;
                      return (
                        <div key={stageNum} className="flex items-center gap-1.5 sm:gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            drillStage === stageNum 
                              ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" 
                              : drillStage > stageNum 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : "bg-white/5 text-zinc-500 border border-white/5"
                          }`}>
                            {stageNum}
                          </div>
                          <span className={`text-[9px] sm:text-[11px] font-sans font-semibold uppercase tracking-wider ${
                            drillStage === stageNum ? "text-white" : "text-zinc-500"
                          }`}>
                            {practiceType === "flow" || practiceType === "dictation" ? (
                              stageNum === 1 ? "Mots courts" : stageNum === 2 ? "Mots moyens" : stageNum === 3 ? "Mots longs" : "Phrases"
                            ) : (
                              stageNum === 1 ? "Touches" : stageNum === 2 ? "Combos courts" : stageNum === 3 ? "Combos longs" : "Mots"
                            )}
                          </span>
                          {((practiceType === "dictation" && dictationScope === "words") ? stageNum < 3 : stageNum < 4) && <ChevronRight className="w-3 h-3 text-zinc-700 hidden sm:block" />}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Current sequence progression bar */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">
                    Séquence {drillItemIndex + 1} sur {drillItems.length}
                  </span>
                  <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-burgundy transition-all duration-300"
                      style={{ width: `${(drillItemIndex / drillItems.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Split container for typing area and glossary panel */}
              <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch flex-1">
                
                {/* Typing main interface (Target, keyboard, hands) */}
                <div className="flex-1 flex flex-col justify-between gap-6 min-w-0">
                  
                  {/* Target Display Panel */}
                  <div className="flex-1 flex flex-col items-center justify-center py-4 min-h-[180px]">
                    <div 
                      onClick={focusInputZone}
                      className={`max-w-2xl w-full mx-auto text-center relative py-8 px-6 bg-zinc-950 border rounded-3xl cursor-text transition-all duration-300 overflow-hidden min-h-[180px] flex flex-col justify-center items-center ${
                        drillTargetFlash 
                          ? "border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.15)] bg-emerald-500/[0.01]" 
                          : "border-white/5 hover:border-white/10"
                      }`}
                    >
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.01] to-transparent pointer-events-none" />

                {/* Stage completed flash overlay */}
                {stageFlashMessage && (
                  <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-30 transition-all duration-300 animate-fade-in p-4 text-center">
                    <h3 className="text-xl sm:text-2xl font-serif text-emerald-400 font-bold mb-2 tracking-wider uppercase animate-bounce">
                      {stageFlashMessage}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                      Préparez-vous ! Étape suivante générée d'après votre apprentissage.
                    </p>
                  </div>
                )}

                {/* Main combo letters rendering block */}
                {practiceType === "dictation" ? (() => {
                  const targetWord = drillItems[drillItemIndex] || "";
                  return (
                    <div className="flex flex-col items-center justify-center p-4">
                      {/* Pulsing Speaker/Audio Button */}
                      <button 
                        onClick={() => {
                          speakDrillTargetText(targetWord);
                          focusInputZone();
                        }}
                        className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/10 hover:bg-purple-500/25 active:scale-95 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 group shadow-[0_0_30px_rgba(168,85,247,0.1)] mb-4"
                        title="Cliquez pour écouter à nouveau (ou appuyez sur Tab)"
                      >
                        <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse group-hover:scale-110 transition-transform" />
                      </button>

                      <h4 className="text-sm sm:text-base font-medium text-purple-200 tracking-wide select-none">
                        Écoutez et tapez ce que vous entendez
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 select-none">
                        (Appuyez sur <span className="font-bold text-zinc-400">Tab</span> ou cliquez sur le bouton pour réécouter)
                      </p>

                      {/* Dots progress indicator */}
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-full px-4 select-none">
                        {targetWord.split("").map((expectedChar, idx) => {
                          const isTyped = idx < typedText.length;
                          const isActive = idx === typedText.length;
                          return (
                            <span 
                              key={idx}
                              className={`inline-block transition-all duration-150 ${
                                expectedChar === " " 
                                  ? `w-8 h-2 border-b-2 border-dashed mr-1 ${
                                      isActive && errorMode === "doux" && douxErrorActive 
                                        ? "border-rose-500 bg-rose-500/15" 
                                        : "border-white/20"
                                    }` 
                                  : `w-3 h-3 rounded-full border ${
                                      isTyped 
                                        ? "bg-purple-500 border-purple-400 scale-110 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                                        : isActive && errorMode === "doux" && douxErrorActive
                                        ? "bg-rose-500 border-rose-400 scale-110 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                        : "bg-zinc-950 border-white/20"
                                    }`
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Inline Flash Hint based on difficulty level */}
                      {dictationHintActive && dictationHintText && (
                        <div className="mt-5 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs sm:text-sm font-semibold rounded-xl text-center shadow-lg animate-bounce select-none">
                          Indice : <span className="font-mono text-base tracking-widest text-white px-2.5 py-0.5 bg-black/40 border border-white/10 rounded">{dictationHintText}</span>
                        </div>
                      )}

                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={() => {
                            speakDrillTargetText(targetWord);
                            focusInputZone();
                          }}
                          className="px-4 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-sans"
                        >
                          Réécouter (Tab)
                        </button>
                      </div>
                    </div>
                  );
                })() : (() => {
                  const targetWord = drillItems[drillItemIndex] || "";
                  const targetLen = targetWord.length;
                  const sizeClass = targetLen <= 6 ? "text-5xl sm:text-6xl lg:text-[72px]"
                    : targetLen <= 15 ? "text-4xl sm:text-5xl"
                    : targetLen <= 30 ? "text-2xl sm:text-3xl"
                    : "text-xl sm:text-2xl";
                  
                  return (
                    <div className={`${sizeClass} font-mono tracking-wider select-none py-4 flex flex-wrap justify-center items-center gap-y-2 max-w-full px-4 break-words leading-relaxed font-bold`}>
                      {targetWord.split("").map((expectedChar, idx) => {
                        const isTyped = idx < typedText.length;
                        const isActive = idx === typedText.length;
                        
                        let colorClass = "text-zinc-700";
                        let borderClass = "";

                        if (isTyped) {
                          colorClass = "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]";
                        } else if (isActive) {
                          if (errorMode === "doux" && douxErrorActive) {
                            colorClass = "error-flash scale-110 rounded px-0.5";
                            borderClass = "border-b-4 border-rose-500 animate-pulse";
                          } else {
                            colorClass = "text-white scale-110";
                            borderClass = "border-b-4 border-emerald-400 animate-pulse";
                          }
                        }

                        return (
                          <span 
                            key={idx} 
                            className={`inline-block transition-all duration-150 ${colorClass} ${borderClass} ${expectedChar === " " ? "w-4 text-center mr-1" : ""}`}
                          >
                            {expectedChar === " " ? "\u00A0" : expectedChar}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">
                  {practiceType === "dictation" 
                    ? (typedText.length > 0 ? "Continuez de saisir..." : "Entrez ce que vous entendez") 
                    : (typedText.length > 0 ? "Continuez de saisir..." : "Frappez la combinaison demandée")}
                </div>
              </div>
            </div>

            {/* Collapsible accent click-bar */}
            {renderCollapsibleAccentBar()}

            {/* AZERTY Reference Keyboard displaying target highlighting and keystroke flash */}
            <div className="w-full bg-[#111216] border border-white/5 rounded-3xl p-5 flex flex-col gap-2 overflow-x-auto select-none scrollbar-thin">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans">Visualisation du Clavier AZERTY</span>
                {(drillItems[drillItemIndex] || "").length <= 12 && (
                  <button 
                    onClick={() => setDrillShowHandsHint(!drillShowHandsHint)}
                    className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-sans font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    {drillShowHandsHint ? "Masquer l'aide des mains" : "Afficher l'aide des mains"}
                  </button>
                )}
              </div>
              
              {(() => {
                const targetWord = drillItems[drillItemIndex] || "";
                const expectedChar = targetWord[typedText.length] || "";
                const expectedKeysHighlight = getKeysForChar(expectedChar);

                return (
                  <>
                    {/* Rows 1-4 */}
                    {AZERTY_ROWS.map((row, rIdx) => (
                      <div key={rIdx} className="flex justify-center gap-1 min-w-max">
                        {row.map((keyObj, kIdx) => {
                          if (keyObj.isSpecial) {
                            return (
                              <div 
                                key={kIdx} 
                                className={`h-10 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-500 select-none uppercase ${keyObj.width || "w-11"}`}
                              >
                                {keyObj.label}
                              </div>
                            );
                          }

                          const keyMainLower = keyObj.main.toLowerCase();
                          const keySubLower = keyObj.sub ? keyObj.sub.toLowerCase() : "";
                          const isTarget = expectedKeysHighlight.some(k => 
                            k.toLowerCase() === keyMainLower || 
                            k.toLowerCase() === keySubLower ||
                            k === keyObj.main ||
                            (keyObj.sub && k === keyObj.sub)
                          );
                          const isFlashed = drillFlashKey === keyObj.main || (keyObj.sub && drillFlashKey === keyObj.sub.toLowerCase());
                          
                          let keyBg = "bg-zinc-900/45 border-white/5 text-zinc-550";
                          if (isFlashed) {
                            keyBg = drillFlashStatus === "success" 
                              ? "bg-emerald-500 text-black border-emerald-400 font-semibold scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                              : "bg-rose-500 text-white border-rose-450 font-semibold scale-95 shadow-[0_0_15px_rgba(239,68,68,0.35)] animate-shake";
                          } else if (isTarget) {
                            keyBg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.1)] font-semibold";
                          } else {
                            keyBg = "bg-zinc-900/40 border-white/5 text-zinc-450";
                          }

                          return (
                            <div 
                              key={kIdx} 
                              className={`w-9 h-10 flex-shrink-0 relative rounded-lg flex items-center justify-center pt-2 select-none border transition-all duration-100 ${keyBg}`}
                            >
                              {keyObj.sub && (
                                <span className={`absolute top-0.5 left-1 text-[8px] font-medium ${isFlashed && drillFlashStatus === "success" ? "text-black/50" : "text-zinc-650"}`}>
                                  {keyObj.sub}
                                </span>
                              )}
                              <span className="text-xs font-semibold">
                                {keyObj.main}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Row 5: Space Bar Row */}
                    <div className="flex justify-center gap-1 min-w-max mt-0.5">
                      <div className="w-11 h-10 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-lg text-[8px] font-bold text-zinc-500 uppercase select-none">
                        CTRL
                      </div>
                      <div className="w-9 h-10 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-lg text-[8px] font-bold text-zinc-500 uppercase select-none">
                        ALT
                      </div>
                      {(() => {
                        const isSpaceTarget = expectedKeysHighlight.includes(" ") || expectedKeysHighlight.includes("space");
                        const isSpaceFlashed = drillFlashKey === " " || drillFlashKey === "space";
                        let spaceBg = "bg-zinc-900/40 border-white/5";
                        if (isSpaceFlashed) {
                          spaceBg = drillFlashStatus === "success" 
                            ? "bg-emerald-500 text-black border-emerald-400" 
                            : "bg-rose-500 text-white border-rose-400 animate-shake";
                        } else if (isSpaceTarget) {
                          spaceBg = "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
                        }
                        return (
                          <div className={`w-64 h-10 border rounded-lg flex items-center justify-center text-[9px] font-bold uppercase select-none transition-all duration-100 ${spaceBg} ${isSpaceTarget ? "text-emerald-400 animate-pulse font-semibold" : "text-zinc-500"}`}>
                            ESPACE
                          </div>
                        );
                      })()}
                      <div className="w-9 h-10 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-lg text-[8px] font-bold text-zinc-500 uppercase select-none">
                        ALT GR
                      </div>
                      <div className="w-11 h-10 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-lg text-[8px] font-bold text-zinc-500 uppercase select-none">
                        CTRL
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Hands Hint graphic overlays */}
            {drillShowHandsHint && (drillItems[drillItemIndex] || "").length <= 12 && (
              <div className="flex flex-col items-center gap-2 mt-2 font-sans max-w-xl mx-auto w-full">
                <div className="flex justify-between w-full bg-[#111216]/60 border border-white/5 rounded-2xl p-4 gap-6">
                  {(() => {
                    const targetWord = drillItems[drillItemIndex] || "";
                    const expectedChar = targetWord[typedText.length] || "";
                    const expectedKeysHighlight = getKeysForChar(expectedChar);
                    const expectedKeyMain = expectedKeysHighlight[0] || getKeyMainForChar(expectedChar);
                    const { hand, finger } = getFingerHint(expectedKeyMain);

                    return (
                      <>
                        {/* Left Hand Card */}
                        <div className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all duration-150 ${
                          hand === "left" && expectedChar
                            ? "bg-emerald-500/[0.03] border-emerald-500/30 text-emerald-400" 
                            : "border-transparent text-zinc-650 opacity-50"
                        }`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider mb-2">Main Gauche (Left Key)</span>
                          <div className="flex gap-2 items-end h-16">
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "left" && finger.includes("Pinky") ? "bg-emerald-400 h-10 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-6"}`} title="Auriculaire (Pinky)" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "left" && finger.includes("Ring") ? "bg-emerald-400 h-14 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-10"}`} title="Annulaire (Ring)" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "left" && finger.includes("Middle") ? "bg-emerald-400 h-16 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-12"}`} title="Majeur (Middle)" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "left" && finger.includes("Index") ? "bg-emerald-400 h-14 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-10"}`} title="Index" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "left" && finger.includes("Thumb") ? "bg-emerald-400 h-8 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-5"}`} title="Pouce (Thumb)" />
                          </div>
                          {hand === "left" && expectedChar && (
                            <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full mt-2 font-semibold">
                              {finger}
                            </span>
                          )}
                        </div>

                        {/* Right Hand Card */}
                        <div className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all duration-150 ${
                          hand === "right" && expectedChar
                            ? "bg-emerald-500/[0.03] border-emerald-500/30 text-emerald-400" 
                            : "border-transparent text-zinc-650 opacity-50"
                        }`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider mb-2">Main Droite (Right Key)</span>
                          <div className="flex gap-2 items-end h-16">
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "right" && finger.includes("Thumb") ? "bg-emerald-400 h-8 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-5"}`} title="Pouce (Thumb)" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "right" && finger.includes("Index") ? "bg-emerald-400 h-14 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-10"}`} title="Index" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "right" && finger.includes("Middle") ? "bg-emerald-400 h-16 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-12"}`} title="Majeur (Middle)" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "right" && finger.includes("Ring") ? "bg-emerald-400 h-14 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-10"}`} title="Annulaire (Ring)" />
                            <div className={`w-3.5 rounded-t-lg transition-all duration-150 ${hand === "right" && finger.includes("Pinky") ? "bg-emerald-400 h-10 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-zinc-800/60 h-6"}`} title="Auriculaire (Pinky)" />
                          </div>
                          {hand === "right" && expectedChar && (
                            <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full mt-2 font-semibold">
                              {finger}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Hidden Input field to collect typing stroke inputs */}
            <textarea
              ref={inputRef}
              defaultValue=""
              onInput={handleNativeInput}
              onKeyDown={handleKeyDown}
              className="opacity-0 absolute w-0 h-0 resize-none overflow-hidden focus:outline-none pointer-events-none"
              autoFocus
              placeholder="Frappez ici..."
            />
          </div>

          {/* Side Glossary Panel */}
          <GlossaryPanel
            entries={activeLesson?.glossary || []}
            visible={!!(showGlossary && glossaryExpanded)}
            onToggle={() => setGlossaryExpanded(false)}
            currentTargetWord={currentTargetWord}
          />
        </div>

      </div>
    ); })()}

        {currentScreen === "practice" && practiceType === "free" && (
          <div className="w-full animate-fade-in flex flex-col justify-between flex-1 gap-6 mt-4">
            
            {/* Header / Meta */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 font-sans mb-4 pb-2 border-b border-white/[0.05]">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <button 
                  onClick={() => {
                    if ("speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    }
                    setCurrentScreen("library");
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer font-sans"
                >
                  ← Retour à la bibliothèque
                </button>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-xs font-bold text-zinc-400 font-sans">Mode Libre — Saisie libre du Français</span>

                {freeModeGlossary.length > 0 && (
                  <>
                    <div className="h-4 w-px bg-white/10" />
                    <button 
                      onClick={() => {
                        setGlossaryExpanded(!glossaryExpanded);
                        setTimeout(() => focusInputZone(), 50);
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer font-sans flex items-center gap-1.5 ${
                        glossaryExpanded 
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25" 
                          : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{glossaryExpanded ? "Masquer le Glossaire" : "Afficher le Glossaire"}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Error Mode Toggle */}
              <div className="shrink-0 flex items-center justify-center">
                <ErrorModeToggle errorMode={errorMode} onChange={handleToggleErrorMode} />
              </div>
            </div>

            {/* Split container for typing area and glossary panel in Mode Libre */}
            <div className={`w-full flex ${freeModeGlossary.length > 0 && glossaryExpanded ? "flex-col lg:flex-row" : "flex-col"} gap-6 items-stretch flex-1`}>
              
              {/* Typing main interface container */}
              <div className="flex-1 flex flex-col justify-between gap-6 min-w-0">

            {/* SINGLE FULL-WIDTH INTERACTIVE WORKSPACE */}
            <div className="w-full mt-4 flex flex-col">
              {!freeModeActive ? (
                // Setup interface when inactive
                <div className="flex flex-col min-h-[340px]">
                  <Fleuron className="mb-6" />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-sans">
                      Texte Source Français
                    </span>
                    <button
                      onClick={() => {
                        setFreeModeText(`#GLOSSARY\nsoleil (sun) — le soleil brille (the sun is shining)\nciel (sky) — le ciel bleu (the blue sky)\n\n#PARAGRAPH\nAujourd'hui, le soleil brille dans le ciel bleu.\n\n#TRANSLATION\nToday, the sun is shining in the blue sky.`);
                      }}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase font-sans tracking-wide cursor-pointer"
                    >
                      Insérer un exemple de format
                    </button>
                  </div>
                  <textarea
                    value={freeModeText}
                    onChange={(e) => setFreeModeText(e.target.value)}
                    placeholder="Collez votre texte français ici..."
                    className="w-full h-[280px] p-5 bg-[#111216]/60 border border-white/5 focus:border-burgundy-border rounded-2xl text-zinc-200 text-sm font-serif leading-relaxed focus:outline-none placeholder-zinc-550 resize-none transition-all scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
                  />
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => {
                        if (freeModeText.trim()) {
                          const parsed = parsePastedContent(freeModeText);
                          if (parsed.glossary.length > 0 || parsed.translation) {
                            setFreeModeGlossary(parsed.glossary);
                            setFreeModeTranslation(parsed.translation);
                            setFreeModeText(parsed.paragraph);
                          } else {
                            setFreeModeGlossary([]);
                            setFreeModeTranslation("");
                          }
                          setFreeModeTranslationExpanded(false);
                          setFreeModeActive(true);
                          setTypedText("");
                          setCurrentStoryErrorChar(null);
                          setSessionStartTime(null);
                          setSentenceStartTime(null);
                          setSessionTotalCharsTyped(0);
                          setSessionTotalErrors(0);
                          setActiveSentenceErrors(0);
                          setTimeout(() => focusInputZone(), 120);
                        }
                      }}
                      disabled={!freeModeText.trim()}
                      className="px-6 py-2.5 bg-burgundy hover:bg-burgundy-hover active:bg-burgundy disabled:opacity-40 disabled:hover:bg-burgundy disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer hover:scale-102"
                    >
                      <Play className="w-4 h-4 fill-current" /> Commencer
                    </button>
                  </div>
                </div>
              ) : (
                // Mirror-mode typing zone when active, taking full width
                <div onClick={focusInputZone} className="flex flex-col min-h-[300px] cursor-text">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-sans">
                      Zone d'Écriture
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFreeModeActive(false);
                        setTypedText("");
                        setCurrentStoryErrorChar(null);
                        setSessionStartTime(null);
                        setSentenceStartTime(null);
                        setSessionTotalCharsTyped(0);
                        setSessionTotalErrors(0);
                        setActiveSentenceErrors(0);
                        if ("speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className="text-[10px] text-zinc-500 hover:text-white underline cursor-pointer font-sans"
                    >
                      Effacer / Modifier le texte
                    </button>
                  </div>
                  <div className="w-full flex-1 min-h-[240px] p-5 bg-[#111216]/50 border border-white/5 rounded-2xl overflow-y-auto relative text-left scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    <div className="text-[#3f404d] text-base sm:text-lg lg:text-xl leading-relaxed font-serif relative">
                      {freeModeText.split("").map((expectedChar, index) => {
                        let charClass = "text-[#3f404d]"; // Future text
                        let borderClass = "";

                        if (index < typedText.length) {
                          charClass = "text-emerald-400 font-normal";
                        } else if (index === typedText.length) {
                          if (currentStoryErrorChar !== null) {
                            charClass = "text-rose-500 underline decoration-rose-500 underline-offset-4 font-bold bg-rose-500/10";
                            borderClass = "animate-pulse border-l-2 border-rose-500";
                          } else if (errorMode === "doux" && douxErrorActive) {
                            charClass = "error-flash text-rose-500 font-bold px-0.5 rounded";
                            borderClass = "animate-pulse border-l-2 border-rose-500";
                          } else {
                            charClass = "text-white font-medium bg-white/10 rounded px-0.5";
                            borderClass = "animate-pulse border-l-2 border-emerald-400";
                          }
                        }

                        return (
                          <span key={index} className={`relative whitespace-pre-wrap ${charClass} ${borderClass}`}>
                            {expectedChar}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {freeModeTranslation && freeModeActive && (
              <div className="w-full max-w-2xl mx-auto mt-4 px-4 flex flex-col items-center">
                <button
                  onClick={() => {
                    setFreeModeTranslationExpanded(!freeModeTranslationExpanded);
                    setTimeout(() => focusInputZone(), 50);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#17181f]/80 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-full text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider transition-all select-none cursor-pointer"
                >
                  <span>{freeModeTranslationExpanded ? "Masquer la traduction" : "Voir la traduction"}</span>
                  <span className="text-[10px] text-zinc-500">{freeModeTranslationExpanded ? "▲" : "▼"}</span>
                </button>
                {freeModeTranslationExpanded && (
                  <div className="w-full mt-3 p-4 bg-zinc-950/60 border border-white/5 rounded-xl text-left text-xs sm:text-sm text-zinc-300 italic font-serif leading-relaxed max-h-32 overflow-y-auto scrollbar-thin animate-fadeIn">
                    {freeModeTranslation}
                  </div>
                )}
              </div>
            )}

            {freeModeActive && (
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 bg-burgundy rounded-full animate-ping"></div>
                <span>Mode miroir actif. Cliquez sur l'une des boîtes si vous perdez le focus.</span>
              </div>
            )}

            {/* Collapsible accent click-bar */}
            {renderCollapsibleAccentBar()}

            {/* AZERTY Keyboard Reference Block - Always Visible */}
            <div className="max-w-3xl w-full mx-auto flex flex-col items-center mt-3 animate-fade-in">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans mb-3">
                Visualisation du Clavier AZERTY
              </span>

              <div className="w-full bg-[#111216] border border-white/5 rounded-2xl p-4 flex flex-col gap-2 overflow-x-auto select-none scrollbar-thin">
                {AZERTY_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1.5 min-w-max">
                    {row.map((keyObj, kIdx) => {
                      if (keyObj.isSpecial) {
                        return (
                          <div 
                            key={kIdx} 
                            className={`h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 select-none uppercase ${keyObj.width || "w-12"}`}
                          >
                            {keyObj.label}
                          </div>
                        );
                      }
                      const isAccent = ["é", "è", "à", "ç", "ù", "^"].includes(keyObj.main);
                      return (
                        <div 
                          key={kIdx} 
                          className={`w-10 h-11 flex-shrink-0 relative bg-zinc-900 rounded-lg flex items-center justify-center pt-2 select-none ${
                            isAccent 
                              ? "border border-burgundy-border bg-burgundy-soft" 
                              : "border border-white/5"
                          }`}
                        >
                          {keyObj.sub && (
                            <span className="absolute top-1 left-1.5 text-[9px] font-medium text-zinc-500">
                              {keyObj.sub}
                            </span>
                          )}
                          <span className={`text-sm font-semibold ${isAccent ? "text-burgundy font-bold" : "text-zinc-200"}`}>
                            {keyObj.main}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="flex justify-center gap-1.5 min-w-max mt-0.5">
                  <div className="w-12 sm:w-16 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    CTRL
                  </div>
                  <div className="w-10 sm:w-12 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    ALT
                  </div>
                  <div className="w-64 sm:w-80 h-11 bg-zinc-900 border border-white/5 rounded-lg flex items-center justify-center text-[9px] font-bold text-zinc-500 uppercase select-none">
                    ESPACE
                  </div>
                  <div className="w-10 sm:w-12 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    ALT GR
                  </div>
                  <div className="w-12 sm:w-16 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    CTRL
                  </div>
                </div>
              </div>
            </div>

              </div>

              {/* Side Glossary Panel */}
              <GlossaryPanel
                entries={freeModeGlossary}
                visible={!!(freeModeGlossary.length > 0 && glossaryExpanded)}
                onToggle={() => setGlossaryExpanded(false)}
                currentTargetWord={currentTargetWord}
              />
            </div>

            {/* Bottom Controls Speed and Playback Footer */}
            <div className="h-20 border-t border-white/5 bg-[#0a0a0b] flex items-center justify-between px-6 sm:px-12 -mx-4 sm:-mx-8">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Vitesse :</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleUpdateSettings({ ...settings, audioSpeed: "slow" })}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                        settings.audioSpeed === "slow" 
                          ? "bg-[#27272a] text-amber-400 border border-amber-500/20" 
                          : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      LENT
                    </button>
                    <button 
                      onClick={() => handleUpdateSettings({ ...settings, audioSpeed: "normal" })}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                        settings.audioSpeed === "normal" 
                          ? "bg-white/10 text-white" 
                          : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      NORMAL
                    </button>
                  </div>
                </div>

                {freeModeActive && (
                  <button
                    onClick={() => playSentenceAudio(freeModeText)}
                    className="p-2 bg-burgundy hover:bg-burgundy-hover active:bg-burgundy text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Écouter
                  </button>
                )}
              </div>

              <div className="text-zinc-500 font-mono text-[10px] tracking-wider uppercase">
                {freeModeActive ? `${typedText.length} / ${freeModeText.length} car.` : "Saisie inactive"}
              </div>
            </div>

            {/* Hidden Input field to collect typing stroke inputs */}
            <textarea
              ref={inputRef}
              defaultValue=""
              onInput={handleNativeInput}
              onKeyDown={handleKeyDown}
              className="opacity-0 absolute w-0 h-0 resize-none overflow-hidden focus:outline-none pointer-events-none"
              autoFocus
              placeholder="Frappez ici..."
            />
          </div>
        )}

        {currentScreen === "practice" && practiceType === "video-dictee" && (
          <div className="w-full animate-fade-in flex flex-col justify-between flex-1 gap-6 mt-4">
            
            {/* Header / Meta */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 font-sans mb-4 pb-2 border-b border-white/[0.05]">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <button 
                  onClick={() => {
                    if (videoRef.current) videoRef.current.pause();
                    setCurrentScreen("library");
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer font-sans"
                >
                  ← Retour à la bibliothèque
                </button>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-xs font-bold text-zinc-400 font-sans">Vidéo Dictée — Saisie & Écoute interactive</span>

                {videoDicteeFile && videoDicteeCues.length > 0 && (
                  <>
                    <div className="h-4 w-px bg-white/10" />
                    <button 
                      onClick={() => {
                        setVideoDicteeFile(null);
                        setVideoDicteeCues([]);
                        setVideoDicteeCueIndex(0);
                        setTypedText("");
                      }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg border bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 cursor-pointer font-sans"
                    >
                      Choisir une autre vidéo
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main content body */}
            {(!videoDicteeFile || videoDicteeCues.length === 0) ? (
              /* Setup & upload block */
              <div className="w-full max-w-3xl mx-auto bg-[#111216]/60 border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 text-center animate-fade-in">
                <div>
                  <h3 className="text-2xl font-serif text-white mb-2">Configurez votre Vidéo Dictée</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                    Déposez ou sélectionnez un fichier vidéo local (.mp4 ou .webm) et son fichier de sous-titres associé au format standard SubRip (.srt).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Video Upload Field */}
                  <div 
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-burgundy-border", "bg-burgundy-soft");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-burgundy-border", "bg-burgundy-soft");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-burgundy-border", "bg-burgundy-soft");
                      if (e.dataTransfer.files[0]) {
                        setVideoDicteeFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors ${
                      videoDicteeFile ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-white/10 hover:border-white/20 bg-zinc-950/40"
                    }`}
                  >
                    <Video className={`w-8 h-8 ${videoDicteeFile ? "text-emerald-400" : "text-zinc-500"}`} />
                    <span className="text-xs font-semibold text-zinc-350">Fichier Vidéo (.mp4, .webm)</span>
                    <label className="px-3 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-zinc-300 rounded cursor-pointer border border-white/10 uppercase select-none">
                      Sélectionner
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setVideoDicteeFile(e.target.files[0]);
                          }
                        }} 
                      />
                    </label>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">
                      {videoDicteeFile ? (typeof videoDicteeFile === "string" ? "Vidéo d'exemple chargée" : videoDicteeFile.name) : "Aucun fichier choisi"}
                    </span>
                  </div>

                  {/* SRT Upload Field */}
                  <div 
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-burgundy-border", "bg-burgundy-soft");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-burgundy-border", "bg-burgundy-soft");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-burgundy-border", "bg-burgundy-soft");
                      if (e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        const r = new FileReader();
                        r.onload = (ev) => {
                          const cues = parseSRT(ev.target?.result as string);
                          if (cues.length > 0) {
                            setVideoDicteeCues(cues);
                          } else {
                            alert("SRT invalide. Assurez-vous d'avoir des phrases complètes.");
                          }
                        };
                        r.readAsText(file);
                      }
                    }}
                    className={`border-2 border-dashed p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors ${
                      videoDicteeCues.length > 0 ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-white/10 hover:border-white/20 bg-zinc-950/40"
                    }`}
                  >
                    <FileText className={`w-8 h-8 ${videoDicteeCues.length > 0 ? "text-emerald-400" : "text-zinc-500"}`} />
                    <span className="text-xs font-semibold text-zinc-350">Fichier Sous-titres (.srt)</span>
                    <label className="px-3 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-zinc-300 rounded cursor-pointer border border-white/10 uppercase select-none">
                      Sélectionner
                      <input 
                        type="file" 
                        accept=".srt" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            const file = e.target.files[0];
                            const r = new FileReader();
                            r.onload = (ev) => {
                              const cues = parseSRT(ev.target?.result as string);
                              if (cues.length > 0) {
                                setVideoDicteeCues(cues);
                              } else {
                                alert("SRT invalide. Assurez-vous du format.");
                              }
                            };
                            r.readAsText(file);
                          }
                        }} 
                      />
                    </label>
                    <span className="text-[10px] text-zinc-500">
                      {videoDicteeCues.length > 0 ? `${videoDicteeCues.length} répliques chargées` : "Aucun fichier choisi"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      // Load example video and subtitles
                      setVideoDicteeFile("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
                      setVideoDicteeCues([
                        { index: 1, start: 0, end: 3, text: "Rejoignez le feu de camp." },
                        { index: 2, start: 3, end: 6.5, text: "C'est une excellente journée pour apprendre le français." },
                        { index: 3, start: 6.5, end: 12, text: "Pratiquez la dactylographie pas à pas." }
                      ]);
                      setVideoDicteeCueIndex(0);
                      setTypedText("");
                    }}
                    className="px-5 py-2 border border-white/10 hover:border-white/25 hover:bg-white/5 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-sans"
                  >
                    Utiliser un exemple de démonstration
                  </button>
                </div>
              </div>
            ) : videoDicteeCueIndex >= videoDicteeCues.length ? (
              /* Completion / Success screen */
              <div className="w-full max-w-xl mx-auto bg-[#111216]/60 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 text-center animate-fade-in flex flex-col items-center gap-5">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-2">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-white mb-2">Félicitations ! 🎉</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Vous avez complété la dictée vidéo avec succès. Vous avez écrit correctement l'ensemble des répliques !
                  </p>
                </div>
                <div className="flex flex-col items-center p-3 bg-zinc-950/40 rounded-xl w-full border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-sans font-bold">Répliques terminées</span>
                  <span className="text-xl font-mono text-white mt-1">{videoDicteeCues.length} / {videoDicteeCues.length}</span>
                </div>
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => {
                      setVideoDicteeCueIndex(0);
                      setTypedText("");
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-burgundy hover:bg-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-sans"
                  >
                    Recommencer
                  </button>
                  <button
                    onClick={() => {
                      setVideoDicteeFile(null);
                      setVideoDicteeCues([]);
                      setVideoDicteeCueIndex(0);
                      setTypedText("");
                    }}
                    className="flex-1 px-4 py-2.5 border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-sans"
                  >
                    Nouvelle vidéo
                  </button>
                </div>
              </div>
            ) : (() => {
              const currentCue = videoDicteeCues[videoDicteeCueIndex];
              const videoUrl = videoDicteeUrl;
              
              return (
                /* Interactive playing session */
                <div className="w-full flex flex-col gap-6 max-w-4xl mx-auto animate-fade-in">
                  
                  {/* Video Player Box */}
                  <div className="w-full bg-[#090a0d] border border-white/5 rounded-2xl overflow-hidden shadow-xl aspect-video relative max-h-[360px] md:max-h-[400px] flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      autoPlay
                      onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        if (currentCue && video.currentTime >= currentCue.end) {
                          video.pause();
                          video.currentTime = currentCue.end;
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Subtitle / Overlay indicator */}
                  <div className="w-full bg-[#111216]/40 border border-white/5 rounded-2xl px-6 py-6 text-center shadow-lg relative min-h-[90px] flex items-center justify-center">
                    {videoDicteeSubtitleVisible ? (
                      <p className="font-serif text-lg sm:text-2xl text-white italic tracking-wide leading-relaxed select-none">
                        "{currentCue.text}"
                      </p>
                    ) : (
                      <p className="font-sans text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 leading-relaxed italic select-none">
                        <EyeOff className="w-4 h-4 text-zinc-600" />
                        Saisissez ce que vous entendez... (Sous-titres masqués. Cliquez sur 👁️ ci-dessous pour afficher)
                      </p>
                    )}
                  </div>

                  {/* Interactive Input Block */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between font-sans px-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        Séquence {videoDicteeCueIndex + 1} / {videoDicteeCues.length} · {Math.round(currentCue.start)}s à {Math.round(currentCue.end)}s
                      </span>
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = currentCue.start;
                            videoRef.current.play().catch(() => {});
                          }
                        }}
                        className="text-[10px] text-burgundy hover:text-burgundy-hover flex items-center gap-1 font-bold uppercase tracking-wider underline cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Réécouter la séquence
                      </button>
                    </div>

                    {/* Visual Key-by-Key display div */}
                    <div 
                      onClick={() => {
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      className={`w-full min-h-[90px] p-4 bg-[#111216]/70 border rounded-2xl text-zinc-200 text-sm font-serif leading-relaxed cursor-text transition-all shadow-inner relative flex flex-wrap items-center gap-x-[1px] gap-y-1 ${
                        sentenceErrorFlash 
                          ? "border-rose-500 bg-rose-500/5 animate-shake shadow-[0_0_15px_rgba(239,68,68,0.25)]" 
                          : "border-white/5 hover:border-white/10"
                      }`}
                    >
                      {typedText.length === 0 ? (
                        <span className="text-zinc-500 italic select-none">
                          Commencez à saisir ce que vous entendez...
                        </span>
                      ) : (
                        <span className="text-emerald-400 whitespace-pre-wrap">{typedText}</span>
                      )}
                      
                      {/* Blinking keyboard cursor */}
                      <span className="w-[1.5px] h-4 bg-emerald-400 animate-pulse inline-block ml-0.5" />
                    </div>

                    {/* Hidden input zone to capture precise localized French inputs */}
                    <textarea
                      ref={inputRef}
                      defaultValue=""
                      onInput={handleNativeInput}
                      onKeyDown={handleKeyDown}
                      className="opacity-0 absolute w-0 h-0 resize-none overflow-hidden focus:outline-none pointer-events-none"
                      autoFocus
                      placeholder="Frappez ici..."
                    />

                    {/* Controls Bar */}
                    <div className="flex items-center justify-between px-1">
                      <button
                        onClick={() => setVideoDicteeSubtitleVisible(!videoDicteeSubtitleVisible)}
                        className={`px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                          videoDicteeSubtitleVisible 
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25" 
                            : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {videoDicteeSubtitleVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{videoDicteeSubtitleVisible ? "Masquer les sous-titres" : "Afficher les sous-titres"}</span>
                      </button>

                      <span className="text-[9px] text-zinc-500 uppercase font-mono">
                        Cliquez pour activer la frappe · Tapez parfaitement sans omission
                      </span>
                    </div>

                    {/* virtual accent insertion button bar */}
                    <div className="mt-2">
                      {renderCollapsibleAccentBar()}
                    </div>

                    {/* AZERTY Virtual Keyboard render block */}
                    <div className="max-w-3xl w-full mx-auto flex flex-col items-center mt-3 animate-fade-in">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans mb-3">
                        Visualisation du Clavier AZERTY
                      </span>

                      <div className="w-full bg-[#111216] border border-white/5 rounded-2xl p-4 flex flex-col gap-2 overflow-x-auto select-none scrollbar-thin">
                        {AZERTY_ROWS.map((row, rIdx) => (
                          <div key={rIdx} className="flex justify-center gap-1.5 min-w-max">
                            {row.map((keyObj, kIdx) => {
                              if (keyObj.isSpecial) {
                                return (
                                  <div 
                                    key={kIdx} 
                                    className={`h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 select-none uppercase ${keyObj.width || "w-12"}`}
                                  >
                                    {keyObj.label}
                                  </div>
                                );
                              }
                              const isAccent = ["é", "è", "à", "ç", "ù", "^"].includes(keyObj.main);
                              return (
                                <div 
                                  key={kIdx} 
                                  className={`w-10 h-11 flex-shrink-0 relative bg-zinc-900 rounded-lg flex items-center justify-center pt-2 select-none ${
                                    isAccent 
                                      ? "border border-burgundy-border bg-burgundy-soft" 
                                      : "border border-white/5"
                                  }`}
                                >
                                  {keyObj.sub && (
                                    <span className="absolute top-1 left-1.5 text-[9px] font-medium text-zinc-500">
                                      {keyObj.sub}
                                    </span>
                                  )}
                                  <span className={`text-sm font-semibold ${isAccent ? "text-burgundy font-bold" : "text-zinc-200"}`}>
                                    {keyObj.main}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {currentScreen === "practice" && practiceType === "story" && selectedStory && currentSentence && (
          <div className="w-full animate-fade-in flex flex-col justify-between flex-1 gap-8 mt-4">
            
            {/* Header / Meta / Progress marker */}
            <div className="w-full flex flex-col gap-2 font-sans mb-4 border-b border-white/[0.05] pb-4">
              <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <button 
                    onClick={() => {
                      if ("speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                      }
                      setCurrentScreen("library");
                    }}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer"
                  >
                    ← Retour à la bibliothèque
                  </button>
                  <div className="h-4 w-px bg-white/10" />
                  <span className="text-xs font-bold text-zinc-400 truncate max-w-xs">{selectedStory.title}</span>

                  {selectedStory.glossary && selectedStory.glossary.length > 0 && (
                    <>
                      <div className="h-4 w-px bg-white/10" />
                      <button 
                        onClick={() => {
                          setGlossaryExpanded(!glossaryExpanded);
                          setTimeout(() => focusInputZone(), 50);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer font-sans flex items-center gap-1.5 ${
                          glossaryExpanded 
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25" 
                            : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{glossaryExpanded ? "Masquer le Glossaire" : "Afficher le Glossaire"}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Error Mode Toggle */}
                <div className="shrink-0 flex items-center justify-center">
                  <ErrorModeToggle errorMode={errorMode} onChange={handleToggleErrorMode} />
                </div>
              </div>

              {/* Central Progress Tracking Gauge bar */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="text-[10px] tracking-widest text-zinc-500 font-mono uppercase">
                  Phrase {currentSentenceIndex + 1} sur {selectedStory.sentences.length}
                </span>
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-burgundy transition-all duration-300"
                    style={{ width: `${((currentSentenceIndex) / selectedStory.sentences.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Split container for typing area and glossary panel */}
            <div className={`w-full flex ${selectedStory.glossary && selectedStory.glossary.length > 0 && glossaryExpanded ? "flex-col lg:flex-row" : "flex-col"} gap-6 items-stretch flex-1`}>
              
              {/* Typing main interface (Target, keyboard, hands) */}
              <div className="flex-1 flex flex-col justify-between gap-6 min-w-0">

            {/* Core Display Text block with highlight active cursor indicator */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[220px]">
              
              {/* Click box container to assert focus */}
              <div 
                onClick={focusInputZone}
                className={`max-w-4xl w-full text-center relative py-6 px-4 border rounded-2xl cursor-text transition-all duration-200 group ${
                  sentenceErrorFlash 
                    ? "bg-rose-500/10 border-rose-500/40 scale-[0.99] shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-none" 
                    : "bg-white/[0.01] border-white/5 hover:border-white/10"
                }`}
              >
                {/* Floating helpful hints helper inside top corner */}
                {showAccentTooltip && (
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-amber-500 text-black px-3 py-1 text-xs font-bold rounded-lg shadow-lg animate-bounce flex items-center gap-1.5 z-20">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showAccentTooltip}</span>
                  </div>
                )}

                {/* Mirror Mode Display Characters rendering */}
                <div className="text-3xl sm:text-4xl lg:text-[42px] leading-relaxed font-serif tracking-normal text-zinc-700 whitespace-pre-wrap select-none py-4">
                  {currentSentence.french.split("").map((expectedChar, index) => {
                    const typedChar = typedText[index];
                    let charClass = "text-[#3f404d]"; // Future/ghost key
                    let borderClass = "";

                    if (index < typedText.length) {
                      // Already typed
                      if (typedChar === expectedChar) {
                        charClass = "text-emerald-400 font-normal"; // correctly written
                      } else {
                        charClass = "text-rose-500 underline decoration-rose-500 underline-offset-4 font-bold bg-rose-500/10"; // errored
                      }
                    } else if (index === typedText.length) {
                      // Active typing position
                      if (currentStoryErrorChar !== null) {
                        charClass = "text-rose-500 underline decoration-rose-500 underline-offset-4 font-bold bg-rose-500/10"; // errored
                        borderClass = "animate-pulse border-l-2 border-rose-500";
                      } else if (errorMode === "doux" && douxErrorActive) {
                        charClass = "error-flash text-rose-500 font-bold px-0.5 rounded";
                        borderClass = "animate-pulse border-l-2 border-rose-500";
                      } else {
                        charClass = "text-white font-medium bg-white/10 rounded px-0.5";
                        borderClass = "animate-pulse border-l-2 border-emerald-400";
                      }
                    }

                    return (
                      <span key={index} className={`relative whitespace-pre-wrap ${charClass} ${borderClass}`}>
                        {expectedChar}
                      </span>
                    );
                  })}
                </div>

                {/* English Collapsible Translation box */}
                {computedFullTranslation && (
                  <div className="w-full max-w-2xl mx-auto mt-4 px-4 flex flex-col items-center">
                    <button
                      onClick={() => {
                        setStoryTranslationExpanded(!storyTranslationExpanded);
                        setTimeout(() => focusInputZone(), 50);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#17181f]/80 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-full text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider transition-all select-none cursor-pointer"
                    >
                      <span>{storyTranslationExpanded ? "Masquer la traduction" : "Voir la traduction"}</span>
                      <span className="text-[10px] text-zinc-500">{storyTranslationExpanded ? "▲" : "▼"}</span>
                    </button>
                    {storyTranslationExpanded && (
                      <div className="w-full mt-3 p-4 bg-zinc-950/60 border border-white/5 rounded-xl text-left text-xs sm:text-sm text-zinc-300 italic font-serif leading-relaxed max-h-32 overflow-y-auto scrollbar-thin animate-fadeIn">
                        {computedFullTranslation}
                      </div>
                    )}
                  </div>
                )}

                {/* Focus Active Status Indicator overlay */}
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest mt-8 flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-burgundy rounded-full animate-ping"></div>
                  <span>Mode miroir actif. Cliquez sur la zone de saisie pour commencer à taper.</span>
                </div>
              </div>

              {/* Raw Keyboard Listening Hidden Textarea zone */}
              <textarea
                ref={inputRef}
                defaultValue=""
                onInput={handleNativeInput}
                onKeyDown={handleKeyDown}
                className="opacity-0 absolute w-0 h-0 resize-none overflow-hidden focus:outline-none pointer-events-none"
                autoFocus
                placeholder="Zone de frappe active..."
              />
            </div>

            {/* Collapsible accent click-bar */}
            {renderCollapsibleAccentBar()}

            {/* AZERTY Keyboard Reference Block - Always Visible */}
            <div className="max-w-3xl w-full mx-auto flex flex-col items-center mt-3">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans mb-3">
                Visualisation du Clavier AZERTY
              </span>

              <div className="w-full bg-[#111216] border border-white/5 rounded-2xl p-4 flex flex-col gap-2 overflow-x-auto select-none scrollbar-thin">
                {/* Rows 1-4 */}
                {AZERTY_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1.5 min-w-max">
                    {row.map((keyObj, kIdx) => {
                      if (keyObj.isSpecial) {
                        return (
                          <div 
                            key={kIdx} 
                            className={`h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 select-none uppercase ${keyObj.width || "w-12"}`}
                          >
                            {keyObj.label}
                          </div>
                        );
                      }

                      const isAccent = ["é", "è", "à", "ç", "ù", "^"].includes(keyObj.main);

                      return (
                        <div 
                          key={kIdx} 
                          className={`w-10 h-11 flex-shrink-0 relative bg-zinc-900 rounded-lg flex items-center justify-center pt-2 select-none ${
                            isAccent 
                              ? "border border-burgundy-border bg-burgundy-soft" 
                              : "border border-white/5"
                          }`}
                        >
                          {keyObj.sub && (
                            <span className="absolute top-1 left-1.5 text-[9px] font-medium text-zinc-500">
                              {keyObj.sub}
                            </span>
                          )}
                          <span className={`text-sm font-semibold ${isAccent ? "text-burgundy font-bold" : "text-zinc-200"}`}>
                            {keyObj.main}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Row 5: Space Bar Row */}
                <div className="flex justify-center gap-1.5 min-w-max mt-0.5">
                  <div className="w-12 sm:w-16 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    CTRL
                  </div>
                  <div className="w-10 sm:w-12 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    ALT
                  </div>
                  <div className="w-64 sm:w-80 h-11 bg-zinc-900 border border-white/5 rounded-lg flex items-center justify-center text-[9px] font-bold text-zinc-500 uppercase select-none">
                    ESPACE
                  </div>
                  <div className="w-10 sm:w-12 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    ALT GR
                  </div>
                  <div className="w-12 sm:w-16 h-11 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[9px] font-bold text-zinc-400 uppercase select-none">
                    CTRL
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Stories full contextual flow tray */}
            <div className="w-full p-5 bg-white/[0.01] border border-white/5 rounded-2xl mt-4">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <h3 className="text-[9px] tracking-[0.2em] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" /> Progression textuelle
                </h3>
                <button 
                  onClick={() => setIsFullStoryVisible(!isFullStoryVisible)}
                  className="text-[9px] tracking-widest text-burgundy font-bold uppercase hover:underline cursor-pointer"
                >
                  {isFullStoryVisible ? "Masquer le contexte" : "Afficher l'histoire complète"}
                </button>
              </div>

              {isFullStoryVisible ? (
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-2">
                  {selectedStory.sentences.map((sent, idx) => {
                    let textStyle = "text-zinc-600";
                    let prefix = "";

                    if (idx < currentSentenceIndex) {
                      textStyle = "text-zinc-500 line-through opacity-40";
                      prefix = "✓ ";
                    } else if (idx === currentSentenceIndex) {
                      textStyle = "text-white font-medium border-l-2 border-burgundy pl-2 bg-burgundy-soft py-1 rounded";
                      prefix = "▶ ";
                    } else {
                      textStyle = "text-zinc-500 opacity-60";
                    }

                    return (
                      <div key={idx} className={`text-xs sm:text-sm leading-relaxed ${textStyle} font-serif transition-colors`}>
                        <span>{prefix}{sent.french}</span>
                        <div className="text-[11px] text-zinc-500 italic font-serif leading-none mt-1 pl-4">
                          {sent.english}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 text-xs leading-relaxed font-serif justify-center text-center">
                  {currentSentenceIndex > 0 && (
                    <span className="text-zinc-500 opacity-40 truncate max-w-xs block">
                      ... {selectedStory.sentences[currentSentenceIndex - 1]?.french}
                    </span>
                  )}
                  <span className="text-white bg-burgundy-soft px-2 py-0.5 rounded border border-burgundy-border/25 underline underline-offset-4">
                    {currentSentence.french}
                  </span>
                  {currentSentenceIndex + 1 < selectedStory.sentences.length && (
                    <span className="text-zinc-500 opacity-40 truncate max-w-xs block">
                      {selectedStory.sentences[currentSentenceIndex + 1]?.french} ...
                    </span>
                  )}
                </div>
              )}
            </div>

              </div>

              {/* Side Glossary Panel */}
              <GlossaryPanel
                entries={selectedStory.glossary || []}
                visible={!!(selectedStory.glossary && selectedStory.glossary.length > 0 && glossaryExpanded)}
                onToggle={() => setGlossaryExpanded(false)}
                currentTargetWord={currentTargetWord}
              />
            </div>

            {/* Bottom Controls / Speeds Footer */}
            <div className="h-20 border-t border-white/5 bg-[#0a0a0b] flex items-center justify-between px-6 sm:px-12 -mx-4 sm:-mx-8">
              <div className="flex items-center gap-6">
                
                {/* Manual audio read pitch values wrapper */}
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Vitesse :</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleUpdateSettings({ ...settings, audioSpeed: "slow" })}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                        settings.audioSpeed === "slow" 
                          ? "bg-[#27272a] text-amber-400 border border-amber-500/20" 
                          : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      LENT
                    </button>
                    <button 
                      onClick={() => handleUpdateSettings({ ...settings, audioSpeed: "normal" })}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                        settings.audioSpeed === "normal" 
                          ? "bg-white/10 text-white" 
                          : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      NORMAL
                    </button>
                  </div>
                </div>

                {/* Speak current sentence trigger */}
                <button 
                  onClick={() => playSentenceAudio(currentSentence.french)}
                  disabled={premiumTtsLoading}
                  className="flex items-center gap-2 text-zinc-400 hover:text-burgundy transition-colors cursor-pointer group disabled:opacity-50"
                  title="Presser Tab de votre clavier pour rejouer l'audio"
                >
                  <Volume2 className={`w-5 h-5 ${isSpeaking ? "text-burgundy animate-bounce" : "text-zinc-400 group-hover:text-burgundy"}`} />
                  <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Répéter l'audio (Tab)</span>
                </button>
              </div>

              {/* Actions Shortcuts and skipped sentence metrics */}
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 border border-white/5 bg-white/[0.01] rounded-lg text-[10px] font-mono text-zinc-500">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Stuck? Use on-screen quick keys or wait 3s for accent guides</span>
                </div>
                <button 
                  onClick={handleSkipSentence}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xs tracking-wider uppercase rounded-lg border border-white/10 transition-colors cursor-pointer"
                >
                  Passer la phrase
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 3.5: DRILL LETTERS PERFORMANCE RESULTS */}
        {currentScreen === "results" && (practiceType === "letters" || practiceType === "accents" || practiceType === "calibration" || practiceType === "flow" || practiceType === "wordsShort" || practiceType === "wordsLong" || practiceType === "phrases" || practiceType === "dictation" || practiceType === "lesson") && completedDrillDetails && (
          <div className="w-full max-w-3xl mx-auto animate-fade-in flex flex-col gap-8 py-8">
            
            {/* Header / Celebration Title */}
            <div className="text-center flex flex-col items-center gap-2 font-sans">
              <Fleuron className="mb-4" />
              <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Session terminée !</h2>
              <p className="text-sm text-zinc-400 max-w-md">
                {practiceType === "letters" ? (
                  <span>Vous avez terminé l'entraînement intensif des <span className="text-white font-medium">Lettres AZERTY</span>.</span>
                ) : practiceType === "accents" ? (
                  <span>Vous avez terminé l'entraînement intensif des <span className="text-white font-medium">Accents essentiels</span>.</span>
                ) : practiceType === "flow" ? (
                  <span>Vous avez terminé l'entraînement de <span className="text-white font-medium">Fluidité progressive</span> et grimpé les échelons.</span>
                ) : practiceType === "wordsShort" ? (
                  <span>Vous avez terminé l'entraînement de <span className="text-white font-medium">Mots courts</span>.</span>
                ) : practiceType === "wordsLong" ? (
                  <span>Vous avez terminé l'entraînement de <span className="text-white font-medium">Mots longs</span>.</span>
                ) : practiceType === "phrases" ? (
                  <span>Vous avez terminé l'entraînement de <span className="text-white font-medium">Phrases complètes</span>.</span>
                ) : practiceType === "dictation" ? (
                  <span>Vous avez terminé l'exercice de <span className="text-white font-medium">Dictée</span> (Jeu d'oreille) avec succès.</span>
                ) : practiceType === "lesson" ? (
                  <span>Vous avez terminé avec brio la <span className="text-white font-medium">Leçon du jour : {activeLesson?.title || ""}</span>, validant l'ensemble des 4 étapes progressives de la session.</span>
                ) : (
                  <span>Vous avez terminé l'évaluation et la <span className="text-white font-medium">Calibration complète</span>.</span>
                )}
              </p>
            </div>

            {/* Grid Metrics Report */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans">Vitesse</span>
                <span className="text-3xl font-mono text-white mt-1 leading-none">{completedDrillDetails.wpm}</span>
                <span className="text-[10px] text-zinc-500 mt-1 font-sans">mots par minute</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans">Précision</span>
                <span className="text-3xl font-mono text-burgundy mt-1 leading-none">{completedDrillDetails.accuracy}%</span>
                <span className="text-[10px] text-zinc-500 mt-1 font-sans">frappes correctes</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans">Erreurs</span>
                <span className="text-3xl font-mono text-rose-500 mt-1 leading-none">{completedDrillDetails.errors}</span>
                <span className="text-[10px] text-zinc-500 mt-1 font-sans">frappes manquées</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-sans">Temps</span>
                <span className="text-3xl font-mono text-amber-400 mt-1 leading-none">
                  {(() => {
                    const m = Math.floor(completedDrillDetails.duration / 60);
                    const s = completedDrillDetails.duration % 60;
                    return m > 0 ? `${m}m` : `${s}s`;
                  })()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 font-sans">durée de l'exercice</span>
              </div>
            </div>

            {/* Specific letters causing the most errors */}
            <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl font-sans">
              <h3 className="text-sm font-serif text-white mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Languages className="w-4 h-4 text-burgundy" /> Touches nécessitant du travail
              </h3>
              
              {Object.keys(completedDrillDetails.errorsByChar).length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-zinc-400">
                    Ces touches spécifiques ont généré le plus de fautes de frappe. Précisez la position de vos doigts pour ces touches :
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(completedDrillDetails.errorsByChar)
                      .map(([char, errCount]) => [char, Number(errCount)] as [string, number])
                      .sort((a, b) => b[1] - a[1])
                      .map(([char, errCount]) => (
                        <span 
                          key={char} 
                          className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono rounded flex items-center gap-1.5"
                        >
                          Touche <strong className="uppercase text-white font-bold">{char}</strong> : {errCount} {errCount > 1 ? "erreurs" : "erreur"}
                        </span>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  Incroyable ! Aucune faute majeure sur les touches demandées. Vos doigts sont des experts !
                </p>
              )}
            </div>

            {/* Actions panel */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mt-4">
              <button 
                onClick={() => startDrillSession(practiceType as "letters" | "accents" | "calibration" | "flow" | "wordsShort" | "wordsLong" | "phrases" | "dictation")}
                className="w-full sm:w-auto px-6 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer font-sans"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Recommencer l'entraînement
              </button>
              
              {practiceType === "letters" && (
                <button 
                  onClick={() => startDrillSession("accents")}
                  className="w-full sm:w-auto px-6 py-2.5 bg-burgundy hover:bg-burgundy-hover active:bg-burgundy text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer font-sans"
                >
                  Continuer vers Accents <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {practiceType === "accents" && (
                <button 
                  onClick={() => startDrillSession("calibration")}
                  className="w-full sm:w-auto px-6 py-2.5 bg-burgundy hover:bg-burgundy-hover active:bg-burgundy text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer font-sans"
                >
                  Continuer vers Calibration <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button 
                onClick={() => setCurrentScreen("learn")}
                className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center transition-all cursor-pointer font-sans"
              >
                Retourner aux exercices
              </button>
            </div>

          </div>
        )}

        {/* VIEW 3b: PERFORMANCE RESULTS REPORT & SESSION SUMMARY FOR FREE MODE */}
        {currentScreen === "results" && practiceType === "free" && completedSessionDetails && (
          <div className="w-full max-w-3xl mx-auto animate-fade-in flex flex-col gap-8 py-8">
            
            {/* Header / Celebration Title */}
            <div className="text-center flex flex-col items-center gap-2 font-sans">
              <Fleuron className="mb-4" />
              <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Session Libre Complétée !</h2>
              <p className="text-sm text-zinc-400 max-w-md">
                Félicitations ! Vous avez terminé avec succès la saisie de votre texte personnalisé.
              </p>
            </div>

            {/* Grid Metrics Report */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Vitesse</span>
                <span className="text-3xl font-mono text-white mt-1 leading-none">{completedSessionDetails.wpm}</span>
                <span className="text-[10px] text-zinc-500 mt-1">mots par minute</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Précision</span>
                <span className="text-3xl font-mono text-burgundy mt-1 leading-none">{completedSessionDetails.accuracy}%</span>
                <span className="text-[10px] text-zinc-500 mt-1">frappes correctes</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Erreurs</span>
                <span className="text-3xl font-mono text-rose-500 mt-1 leading-none">{completedSessionDetails.errors}</span>
                <span className="text-[10px] text-zinc-500 mt-1">frappes manquées</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Temps</span>
                <span className="text-3xl font-mono text-amber-400 mt-1 leading-none">
                  {(() => {
                    const m = Math.floor(completedSessionDetails.duration / 60);
                    const s = completedSessionDetails.duration % 60;
                    return m > 0 ? `${m}m` : `${s}s`;
                  })()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">durée de l'exercice</span>
              </div>
            </div>

            {/* Navigation options / next run actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mt-4">
              <button 
                onClick={() => handleStartFreeMode(true)}
                className="w-full sm:w-auto px-6 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Recommencer
              </button>
              
              <button 
                onClick={() => handleStartFreeMode(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-burgundy hover:bg-burgundy-hover active:bg-burgundy text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Nouveau texte <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={() => setCurrentScreen("library")}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#111216] hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center transition-all cursor-pointer"
              >
                Retourner à la bibliothèque
              </button>
            </div>

          </div>
        )}

        {/* VIEW 3: PERFORMANCE RESULTS REPORT & HARDEST WORDS SUMMARY */}
        {currentScreen === "results" && (practiceType === "story" || !["letters", "accents", "calibration"].includes(practiceType || "")) && completedSessionDetails && selectedStory && (
          <div className="w-full max-w-3xl mx-auto animate-fade-in flex flex-col gap-8 py-8">
            
            {/* Header / Celebration Title */}
            <div className="text-center flex flex-col items-center gap-2 font-sans">
              <Fleuron className="mb-4" />
              <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Félicitations !</h2>
              <p className="text-sm text-zinc-400 max-w-md">
                Vous avez terminé l'écriture de l'histoire <span className="text-white font-medium">"{selectedStory.title}"</span>.
              </p>
            </div>

            {/* Grid Metrics Report */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Vitesse</span>
                <span className="text-3xl font-mono text-white mt-1 leading-none">{completedSessionDetails.wpm}</span>
                <span className="text-[10px] text-zinc-500 mt-1">mots par minute</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Précision</span>
                <span className="text-3xl font-mono text-burgundy mt-1 leading-none">{completedSessionDetails.accuracy}%</span>
                <span className="text-[10px] text-zinc-500 mt-1">frappes correctes</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Erreurs</span>
                <span className="text-3xl font-mono text-rose-500 mt-1 leading-none">{completedSessionDetails.errors}</span>
                <span className="text-[10px] text-zinc-500 mt-1">frappes manquées</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Temps</span>
                <span className="text-3xl font-mono text-amber-400 mt-1 leading-none">
                  {(() => {
                    const m = Math.floor(completedSessionDetails.duration / 60);
                    const s = completedSessionDetails.duration % 60;
                    return m > 0 ? `${m}m` : `${s}s`;
                  })()}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">durée de l'exercice</span>
              </div>
            </div>

            {/* Hardest Words List Section */}
            <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl">
              <h3 className="text-sm font-serif text-white mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Languages className="w-4 h-4 text-burgundy" /> Mots les plus difficiles à écrire
              </h3>
              
              {completedSessionDetails.hardestWords && completedSessionDetails.hardestWords.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-zinc-400">
                    Ces termes ont enregistré le plus haut taux d'erreur de frapping ou d' accents oubliés durante l'exercice. Assurez-vous d'appuyer sur la bonne touche :
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {completedSessionDetails.hardestWords.map((word) => (
                      <span 
                        key={word} 
                        className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono rounded"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  Excellent travail ! Vous n'avez fait aucune erreur sur les structures des mots français de cette histoire !
                </p>
              )}
            </div>

            {/* Navigation options / next run actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mt-4">
              <button 
                onClick={() => handleStartPractice(selectedStory)}
                className="w-full sm:w-auto px-6 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Recommencer cette histoire
              </button>
              
              <button 
                onClick={handleNextStoryTrigger}
                className="w-full sm:w-auto px-6 py-2.5 bg-burgundy hover:bg-burgundy-hover active:bg-burgundy text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Histoire suivante <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={() => setCurrentScreen("library")}
                className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center transition-all cursor-pointer"
              >
                Retourner à la bibliothèque
              </button>
            </div>

          </div>
        )}

      </main>

      {/* -----------------------------------------------------------------------
          MODAL OVERLAY 1: SYSTEM SETTINGS PANEL
          ----------------------------------------------------------------------- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111216] border border-white/10 max-w-lg w-full rounded-2xl shadow-2xl relative overflow-hidden animate-fade-in">
            
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#15161c]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-burgundy" />
                <h3 className="text-base font-serif text-white">Paramètres Généraux</h3>
              </div>
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setImportStatus(null);
                }}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto font-sans">
              
              {/* Option 1: Audio & Voix */}
              <div className="flex flex-col gap-4">
                <h4 className="text-base font-serif italic text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#7B1E2B] rounded-full" />
                  Audio & Voix
                </h4>

                <div className="flex flex-col gap-2 pl-3.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Vitesse Audio de Lecture</span>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Contrôlez la rapidité de lecture des phrases en français par le synthétiseur vocal.
                  </p>
                  <div className="flex gap-2 mt-1">
                    {[
                      { id: "slow", label: "Lent" },
                      { id: "normal", label: "Normal (Par Défaut)" }
                    ].map(eSpeed => (
                      <button
                        key={eSpeed.id}
                        onClick={() => handleUpdateSettings({ ...settings, audioSpeed: eSpeed.id as any })}
                        className={`flex-1 py-2 text-xs font-medium border rounded-lg transition-colors cursor-pointer ${
                          settings.audioSpeed === eSpeed.id 
                            ? "bg-burgundy-soft text-burgundy border-burgundy-border" 
                            : "bg-white/5 text-zinc-400 border-white/5 hover:border-white/10"
                        }`}
                      >
                        {eSpeed.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pl-3.5 pt-2">
                  <div className="max-w-[70%]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Effets Sonores Actifs</span>
                    <p className="text-[11px] text-zinc-500 leading-normal mt-1">
                      Bruits de clavier : son clair sur réussite, buzzer sourd en cas de faute de frappe.
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings({ ...settings, soundEffects: !settings.soundEffects })}
                    className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${
                      settings.soundEffects ? "bg-burgundy justify-end" : "bg-zinc-800 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-black"></div>
                  </button>
                </div>
              </div>

              <Fleuron className="my-1 shrink-0" />

              {/* Option 2: Affichage & Thème */}
              <div className="flex flex-col gap-4">
                <h4 className="text-base font-serif italic text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#7B1E2B] rounded-full" />
                  Affichage & Thème
                </h4>

                <div className="flex flex-col gap-2 pl-3.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Mode d'affichage visuel</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateSettings({ ...settings, theme: "dark" })}
                      className={`flex-1 py-1.5 text-xs font-medium rounded border ${
                        settings.theme === "dark" 
                          ? "bg-zinc-800 text-white border-white/20" 
                          : "bg-transparent text-zinc-400 border-white/5 hover:text-white"
                      }`}
                    >
                      Sophisticated Dark
                    </button>
                    <button
                      onClick={() => handleUpdateSettings({ ...settings, theme: "light" })}
                      className={`flex-1 py-1.5 text-xs font-medium rounded border ${
                        settings.theme === "light" 
                          ? "bg-white text-zinc-900 border-white" 
                          : "bg-transparent text-zinc-400 border-white/5 hover:text-white"
                      }`}
                    >
                      Clair Minimaliste
                    </button>
                  </div>
                </div>
              </div>

              <Fleuron className="my-1 shrink-0" />

              {/* Option 3: Clé d'API Premium */}
              <div className="flex flex-col gap-4">
                <h4 className="text-base font-serif italic text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#7B1E2B] rounded-full" />
                  Clé d'API Premium
                </h4>

                <div className="flex flex-col gap-2 pl-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Premium Audio TTS Cloud (Optionnel)</span>
                    <span className="text-[9px] bg-burgundy-soft text-burgundy px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-sans">Mosaïque HD</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Renseignez une clé d'API OpenAI pour synthétiser des voix ultra-réalistes de qualité studio.
                  </p>
                  <input 
                    type="password"
                    value={settings.ttsApiKey}
                    onChange={(e) => handleUpdateSettings({ ...settings, ttsApiKey: e.target.value })}
                    placeholder="sk-or-elevenlabs-key-..."
                    className="w-full bg-zinc-950 border border-white/5 focus:border-burgundy-border rounded-lg p-2.5 text-xs text-white focus:outline-none placeholder-zinc-700 font-sans"
                  />
                </div>
              </div>

              <Fleuron className="my-1 shrink-0" />

              {/* Option 4: Sauvegarde & Restauration */}
              <div className="flex flex-col gap-4">
                <h4 className="text-base font-serif italic text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#7B1E2B] rounded-full" />
                  Sauvegarde & Restauration
                </h4>

                <div className="flex flex-col gap-3 pl-3.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Gérer les données</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleExportBackup}
                      className="flex items-center justify-center gap-2 py-2 pr-2 text-xs font-bold bg-white/5 hover:bg-white/10 hover:text-white rounded-lg border border-white/5 text-zinc-300 transition-colors pointer-events-auto cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-zinc-400" /> Exporter JSON
                    </button>

                    <label 
                      className="flex items-center justify-center gap-2 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 hover:text-white rounded-lg border border-white/5 text-zinc-300 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-zinc-400" /> Importer JSON
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* Import State Feedback Alert */}
                  {importStatus && (
                    <div className={`p-3 rounded-lg text-xs mt-1 ${
                      importStatus.type === "success" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {importStatus.msg}
                    </div>
                  )}
                </div>
              </div>

              <Fleuron className="my-1 shrink-0" />

              {/* Option 5: Avertissement */}
              <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold">Avertissement concernant les données</span>
                  <p className="text-[11px] opacity-90 font-sans">
                    Vos histoires personnalisées et l'historique de vos sessions sont stockés localement sur votre navigateur (IndexedDB).
                    Le mode de navigation privée ou le vidage périodique du cache de vos applications effacera l'intégralité de ces tables. Exporter régulièrement votre fichier JSON de sauvegarde.
                  </p>
                </div>
              </div>

              {/* Advanced reset cleaner buttons */}
              <div className="border-t border-white/5 pt-6 flex justify-end">
                {showClearConfirm ? (
                  <div className="flex flex-col gap-2 items-end w-full">
                    <span className="text-xs text-rose-400 font-bold">Confirmez-vous la purge totale ?</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={handleClearAllStorage}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded"
                      >
                        Oui, tout effacer
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-400 py-1 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Réinitialiser l'application
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          MODAL OVERLAY 2: ADD CUSTOM STORY & MANUAL EDIT splits / TRANSLATION PREVIEW
          ----------------------------------------------------------------------- */}
      {isAddStoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111216] border border-white/10 max-w-2xl w-full rounded-2xl shadow-2xl relative overflow-hidden animate-fade-in">
            
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#15161c]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-burgundy" />
                <h3 className="text-base font-serif text-white">Ajouter une histoire personnalisée</h3>
              </div>
              <button 
                onClick={() => setIsAddStoryOpen(false)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
              
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="text-xs text-zinc-400 font-bold uppercase">Titre de l'histoire</label>
                    <input 
                      type="text"
                      value={newStoryTitle}
                      onChange={(e) => setNewStoryTitle(e.target.value)}
                      placeholder="Ex: Le Château Rouge"
                      className="bg-zinc-950 border border-white/5 focus:border-burgundy-border rounded-lg p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-400 font-bold uppercase">Niveau d'écriture</label>
                    <select
                      value={newStoryLevel}
                      onChange={(e) => setNewStoryLevel(e.target.value as StoryLevel)}
                      className="bg-zinc-950 border border-white/5 focus:border-burgundy-border rounded-lg p-2.5 text-xs text-white focus:outline-none h-[38px] cursor-pointer"
                    >
                      <option value="beginner">Débutant (Beginner)</option>
                      <option value="easy">Facile (Easy)</option>
                      <option value="intermediate">Intermédiaire (Intermediate)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-zinc-400 font-bold uppercase font-sans">Texte brut en Français (Paragraphe)</label>
                    <button
                      onClick={() => {
                        setNewStoryTitle("Ma Belle Histoire");
                        setNewStoryRawText(`#GLOSSARY\nchâteau (castle) — un vieux château (an old castle)\nrouge (red) — la fleur rouge (the red flower)\n\n#PARAGRAPH\nCe matin, je regarde le vieux château. La fleur rouge est belle.\n\n#TRANSLATION\nThis morning, I look at the old castle. The red flower is beautiful.`);
                      }}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase font-sans tracking-wide cursor-pointer"
                    >
                      Insérer un exemple de format
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={newStoryRawText}
                    onChange={(e) => setNewStoryRawText(e.target.value)}
                    placeholder="Collez ici l'intégralité du texte en français. Utilisez des points pour que l'outil puisse découper correctement vos phrases."
                    className="bg-zinc-950 border border-white/5 focus:border-burgundy-border rounded-lg p-3 text-xs text-white focus:outline-none font-serif leading-relaxed animate-none"
                  />
                  <span className="text-[9px] text-zinc-500">
                    Soutient également les balises optionnelles comme <span className="text-zinc-400 font-mono">#GLOSSARY</span> et <span className="text-zinc-400 font-mono">#TRANSLATION</span>.
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-bold uppercase font-sans">Glossaire (optionnel)</label>
                  <textarea
                    rows={3}
                    value={newStoryGlossary}
                    onChange={(e) => setNewStoryGlossary(e.target.value)}
                    placeholder={`Format: mot (traduction) — exemple\nEx: château (castle) — le vieux château`}
                    className="bg-zinc-950 border border-white/5 focus:border-burgundy-border rounded-lg p-3 text-xs text-white focus:outline-none font-sans leading-relaxed animate-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400 font-bold uppercase font-sans">Traduction anglaise (optionnel)</label>
                  <textarea
                    rows={5}
                    value={newStoryTranslation}
                    onChange={(e) => setNewStoryTranslation(e.target.value)}
                    placeholder="Collez ici la traduction anglaise correspondante comme un seul bloc de texte."
                    className="bg-zinc-950 border border-white/5 focus:border-burgundy-border rounded-lg p-3 text-xs text-white focus:outline-none font-serif leading-relaxed animate-none"
                  />
                </div>

                {addStoryError && (
                  <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs">
                    {addStoryError}
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={handleSaveCustomStory}
                    disabled={!newStoryRawText.trim() || !newStoryTitle.trim()}
                    className="px-5 py-2.5 bg-burgundy text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-burgundy-hover transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Sauvegarder l'histoire
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
