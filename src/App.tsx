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
  ArrowRight
} from "lucide-react";
import { Sentence, Story, StoryLevel, SessionAttempt, AppSettings } from "./types";
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
  dbImportJSON 
} from "./utils/db";
import { playSuccessSound, playErrorSound } from "./utils/sound";

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

export default function App() {
  // Navigation & Screens
  // "library" | "practice" | "results"
  const [currentScreen, setCurrentScreen] = useState<"library" | "practice" | "results">("library");
  
  // DB Loaded States
  const [stories, setStories] = useState<Story[]>([]);
  const [sessions, setSessions] = useState<SessionAttempt[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    audioSpeed: "normal",
    ttsApiKey: "",
    theme: "dark",
    soundEffects: true
  });

  // Current Working Session State
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isFullStoryVisible, setIsFullStoryVisible] = useState(false);

  // Sync state values to refs so that the async voice looping callback can read the most up-to-date state
  const currentScreenRef = useRef(currentScreen);
  const selectedStoryRef = useRef(selectedStory);
  const currentSentenceIndexRef = useRef(currentSentenceIndex);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
    selectedStoryRef.current = selectedStory;
    currentSentenceIndexRef.current = currentSentenceIndex;

    // If we leave the practice screen, stop speaking immediately
    if (currentScreen !== "practice") {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [currentScreen, selectedStory, currentSentenceIndex]);

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
  const [newStoryStep, setNewStoryStep] = useState<1 | 2>(1); // 1: Paste Raw, 2: Review splits and translate
  const [newStorySentences, setNewStorySentences] = useState<Sentence[]>([]);
  const [addStoryLoading, setAddStoryLoading] = useState(false);
  const [addStoryError, setAddStoryError] = useState("");

  // Calculated session stats for result card saved
  const [completedSessionDetails, setCompletedSessionDetails] = useState<SessionAttempt | null>(null);

  // Dynamic feedback hints variables
  const [showAccentTooltip, setShowAccentTooltip] = useState<string | null>(null);

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
        
        // Sort stories: built-in first, then newly added
        setStories(loadedStories.sort((a, b) => b.createdAt - a.createdAt));
        setSessions(loadedSessions.sort((a, b) => b.date - a.date));
        setSettings(loadedSettings);

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
  // 3. Typing Logic Engine
  // ---------------------------------------------------------------------------
  const currentSentence: Sentence | null = useMemo(() => {
    if (!selectedStory || !selectedStory.sentences[currentSentenceIndex]) return null;
    return selectedStory.sentences[currentSentenceIndex];
  }, [selectedStory, currentSentenceIndex]);

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
  const handleTypeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    
    // Prevent typing further than sentence length
    if (!currentSentence || val.length > currentSentence.french.length) return;

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
    const addedCharIndex = val.length - 1;
    if (addedCharIndex >= 0 && val.length > typedText.length) {
      const typedChar = val[addedCharIndex];
      const correctChar = currentSentence.french[addedCharIndex];

      if (typedChar === correctChar) {
        // Success Click sound
        if (settings.soundEffects) playSuccessSound();
      } else {
        // Error Buzz
        if (settings.soundEffects) playErrorSound();
        setSessionTotalErrors(prev => prev + 1);
        setActiveSentenceErrors(prev => prev + 1);

        // Identify the exact word that contains this error to count hardest words
        const frenchWordsList = currentSentence.french.split(/\s+/);
        // Find which word matches current character index
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
      }
    }

    // Cumulative stats
    if (val.length > typedText.length) {
      setSessionTotalCharsTyped(prev => prev + 1);
    }

    setTypedText(val);

    // Auto Advance Sentence Trigger
    if (val === currentSentence.french) {
      handleAdvanceNextSentence();
    }
  };

  const handleAdvanceNextSentence = () => {
    if (!selectedStory) return;
    
    // Reset individual sentence tracking variables
    setTypedText("");
    setSentenceStartTime(null);
    setActiveSentenceErrors(0);
    setShowAccentTooltip(null);

    if (currentSentenceIndex + 1 < selectedStory.sentences.length) {
      // Advance to next
      setCurrentSentenceIndex(prev => prev + 1);
    } else {
      // All sentences completed! Finalize story stats
      handleCompleteStorySession();
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
      await refreshLibraryData();
      setCurrentScreen("results");
    } catch (err) {
      console.error("Failed to save final performance session:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Manual on-screen click inserter accent keys
  // ---------------------------------------------------------------------------
  const handleInsertAccentChar = (accentChar: string) => {
    if (!currentSentence) return;
    const len = typedText.length;
    // Append accentChar if it matches expected target character position
    const targetExpected = currentSentence.french[len];
    const newText = typedText + accentChar;
    
    // Trigger typing block logic directly
    if (sessionStartTime === null) {
      setSessionStartTime(Date.now());
    }
    if (sentenceStartTime === null) {
      setSentenceStartTime(Date.now());
      playSentenceAudio(currentSentence.french);
    }

    setCursorLastMovedTime(Date.now());
    setSessionTotalCharsTyped(prev => prev + 1);

    if (accentChar === targetExpected) {
      if (settings.soundEffects) playSuccessSound();
    } else {
      if (settings.soundEffects) playErrorSound();
      setSessionTotalErrors(prev => prev + 1);
      setActiveSentenceErrors(prev => prev + 1);
    }

    setTypedText(newText);
    
    // Restore focus to main textarea zone immediately
    setTimeout(() => {
      focusInputZone();
      // Auto Advance if it hits parity
      if (newText === currentSentence.french) {
        handleAdvanceNextSentence();
      }
    }, 40);
  };

  // Backspace key listener handled elegantly to enable correction
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Replay audio with custom keyboard shortcut Tab or Ctrl+Space
    if (e.key === "Tab") {
      e.preventDefault();
      if (currentSentence) {
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
    setSelectedStory(story);
    setCurrentSentenceIndex(0);
    setTypedText("");
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
  // 7. Add Custom AI Story translating workspace
  // ---------------------------------------------------------------------------
  const handleProcessRawSplits = () => {
    if (!newStoryRawText.trim()) return;
    
    // Split text by punctuation marks . ! ?
    const segmentRegex = /(?<=[.!?])\s+/;
    const splitSentences = newStoryRawText
      .split(segmentRegex)
      .map(s => s.trim())
      .filter(s => s.length > 2);

    if (splitSentences.length === 0) {
      setAddStoryError("Ensure the pasted paragraph contains full punctuated French sentences.");
      return;
    }

    setNewStorySentences(splitSentences.map(french => ({
      french,
      english: "" // populated in step 2 or generated by Gemini
    })));
    setAddStoryError("");
    setNewStoryStep(2);
  };

  const handleTranslateAllWithAI = async () => {
    setAddStoryLoading(true);
    setAddStoryError("");
    try {
      // Compile sentences array to send to backend proxy
      const sentencesText = newStorySentences.map(s => s.french).join("\n");
      const res = await fetch("/api/translate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newStoryTitle,
          level: newStoryLevel,
          text: sentencesText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Server translation failure");
      }

      // Check if response contains array or fallback placeholders
      if (data.sentences && Array.isArray(data.sentences)) {
        // Map elements back
        const translated: Sentence[] = data.sentences.map((element: any, idx: number) => ({
          french: element.french || newStorySentences[idx]?.french || "",
          english: element.english || `[Translation of sentence ${idx + 1}]`
        }));
        setNewStorySentences(translated);
        if (data.title) setNewStoryTitle(data.title);
        if (data.level) setNewStoryLevel(data.level as StoryLevel);
      }
    } catch (err: any) {
      console.warn("Translation client warning:", err);
      // Give placeholder translation instructions
      setNewStorySentences(prev => prev.map((s, index) => ({
        ...s,
        english: s.english || `[English translation of Sentence ${index + 1}]`
      })));
      setAddStoryError("AI Translation model key is offline. Standard placeholder English fields generated. Please edit them below manually.");
    } finally {
      setAddStoryLoading(false);
    }
  };

  const handleSaveCustomStory = async () => {
    // Validate
    if (!newStoryTitle.trim()) {
      setAddStoryError("Veuillez saisir un titre d'histoire.");
      return;
    }
    const missingTranslates = newStorySentences.some(s => !s.english.trim());
    if (missingTranslates) {
      setAddStoryError("Ensure all sentences contain an English translation.");
      return;
    }

    const createdStory: Story = {
      id: `custom-story-${Date.now()}`,
      title: newStoryTitle.trim(),
      level: newStoryLevel,
      sentences: newStorySentences,
      createdAt: Date.now(),
      isBuiltIn: false
    };

    try {
      await saveStory(createdStory);
      await refreshLibraryData();
      
      // Reset Modal Form
      setNewStoryTitle("");
      setNewStoryLevel("beginner");
      setNewStoryRawText("");
      setNewStoryStep(1);
      setNewStorySentences([]);
      setIsAddStoryOpen(false);
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
    <div className="flex flex-col min-h-screen bg-[#0c0d10] text-[#e2e2e2] font-sans antialiased relative overflow-hidden select-none">
      
      {/* Subtle Classic grid background texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]" 
        style={{ 
          backgroundImage: "radial-gradient(#ffffff 1.5px, transparent 0)", 
          backgroundSize: "40px 40px" 
        }}
      />

      {/* -----------------------------------------------------------------------
          TOP NAVIGATION HEADER
          ----------------------------------------------------------------------- */}
      <nav id="nav-top" className="h-16 border-b border-white/5 flex items-center justify-between px-6 sm:px-8 bg-[#111216] relative z-10">
        <div className="flex items-center gap-3">
          <Languages className="w-5 h-5 text-emerald-400" />
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white cursor-pointer hover:opacity-85" onClick={() => setCurrentScreen("library")}>
            L’Écho de Paris <span className="text-xs text-zinc-500 font-normal">French Typing</span>
          </h1>
          {currentScreen === "practice" && selectedStory && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ml-2 ${
              selectedStory.level === "beginner" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
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
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
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
            
            {/* Header Display Board */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">Bibliothèque d'Exercices</h2>
                <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                  Pratiquez la dactylographie française avec des récits littéraires authentiques. Améliorez votre vitesse d'écriture et maîtrisez tous les accents orthographiques requis.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  id="btn-add-story"
                  onClick={() => {
                    setNewStoryStep(1);
                    setNewStoryTitle("");
                    setNewStoryRawText("");
                    setNewStorySentences([]);
                    setIsAddStoryOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Ajouter une histoire
                </button>
              </div>
            </div>

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
                  <span className="text-xl sm:text-2xl font-mono text-emerald-400 mt-1">
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

            {/* Custom Grid Layout display stories */}
            {filteredStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-2xl">
                <BookOpen className="w-10 h-10 text-zinc-600 mb-3" />
                <h4 className="text-white text-base font-medium">Aucune histoire trouvée</h4>
                <p className="text-xs text-zinc-500 mt-1">Veuillez ajuster vos filtres de recherche ou ajouter une nouvelle histoire personnalisée.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStories.map((story) => {
                  const pb = personalBestRecords[story.id];
                  const sentencesCount = story.sentences.length;
                  const totalWords = story.sentences.reduce((acc, sent) => acc + sent.french.split(/\s+/).length, 0);

                  return (
                    <div 
                      key={story.id} 
                      className="group flex flex-col justify-between bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Interactive Subtle accent top-line depending on level difficulty */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-300 ${
                        story.level === "beginner" ? "bg-emerald-500/40 group-hover:bg-emerald-500" :
                        story.level === "easy" ? "bg-amber-500/40 group-hover:bg-amber-500" :
                        "bg-indigo-500/40 group-hover:bg-indigo-500"
                      }`} />

                      <div>
                        {/* Upper Details Meta */}
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            story.level === "beginner" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            story.level === "easy" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          }`}>
                            {story.level === "beginner" ? "Débutant" : 
                             story.level === "easy" ? "Facile" : "Intermédiaire"}
                          </span>

                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                            <span>{sentencesCount} phrases</span>
                            <span>•</span>
                            <span>{totalWords} mots</span>
                          </div>
                        </div>

                        {/* Title of Story */}
                        <h3 className="text-lg font-serif text-white leading-tight mb-2 group-hover:text-emerald-400 transition-colors">
                          {story.title}
                        </h3>

                        {/* Story Initial Excerpt to read preview */}
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed italic pr-4 mb-4 font-serif">
                          "{story.sentences[0]?.french}"
                        </p>
                      </div>

                      {/* Best Attempts Stats block or Library launch indicators */}
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4">
                        {pb ? (
                          <div className="flex gap-4">
                            <div className="flex flex-col">
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Record</span>
                              <span className="text-xs font-mono font-bold text-white leading-tight">{pb.wpm} WPM</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Précision</span>
                              <span className="text-xs font-mono font-bold text-emerald-400 leading-tight">{pb.accuracy}%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">Non commencé</span>
                        )}

                        <div className="flex items-center gap-2">
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
                            className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                          >
                            Écrire <ChevronRight className="w-3 h-3" />
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
                          <td className="p-4 text-emerald-400">{run.accuracy}%</td>
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

        {/* VIEW 2: DYNAMIC SENTENCE BY SENTENCE TYPING WORKSPACE */}
        {currentScreen === "practice" && selectedStory && currentSentence && (
          <div className="w-full animate-fade-in flex flex-col justify-between flex-1 gap-8 mt-4">
            
            {/* Header / Meta / Progress marker */}
            <div className="flex flex-col items-center relative gap-2">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentScreen("library")}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all cursor-pointer"
                >
                  ← Retour à la bibliothèque
                </button>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-xs font-bold text-zinc-400 truncate max-w-xs">{selectedStory.title}</span>
              </div>

              {/* Central Progress Tracking Gauge bar */}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-[10px] tracking-widest text-zinc-500 font-mono uppercase">
                  Phrase {currentSentenceIndex + 1} sur {selectedStory.sentences.length}
                </span>
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${((currentSentenceIndex) / selectedStory.sentences.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Core Display Text block with highlight active cursor indicator */}
            <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[220px]">
              
              {/* Click box container to assert focus */}
              <div 
                onClick={focusInputZone}
                className="max-w-4xl w-full text-center relative py-6 px-4 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl cursor-text transition-all group"
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
                      charClass = "text-white font-medium bg-white/10 rounded px-0.5";
                      borderClass = "animate-pulse border-l-2 border-emerald-400";
                    }

                    return (
                      <span key={index} className={`relative whitespace-pre-wrap ${charClass} ${borderClass}`}>
                        {expectedChar}
                      </span>
                    );
                  })}
                </div>

                {/* English Static Translation displayed permanently */}
                <div className="mt-4 text-xs sm:text-sm lg:text-base text-zinc-400 italic font-serif opacity-90">
                  "{currentSentence.english}"
                </div>

                {/* Focus Active Status Indicator overlay */}
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest mt-8 flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                  <span>Mode miroir actif. Cliquez sur la zone de saisie pour commencer à taper.</span>
                </div>
              </div>

              {/* Raw Keyboard Listening Hidden Textarea zone */}
              <textarea
                ref={inputRef}
                value={typedText}
                onChange={handleTypeChange}
                onKeyDown={handleKeyDown}
                className="opacity-0 absolute w-0 h-0 resize-none overflow-hidden focus:outline-none pointer-events-none"
                autoFocus
                placeholder="Zone de frappe active..."
              />
            </div>

            {/* Custom Interactive Accent Toolbar Buttons panel */}
            <div className="max-w-3xl w-full mx-auto flex flex-col items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 mt-2">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                Clics rapides : Caractères accentués français
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {["é", "è", "à", "ç", "ù", "ê", "î", "ô", "ë", "ï", "œ", "æ", "É", "È", "À", "Ç"].map((accCh) => (
                  <button
                    key={accCh}
                    onClick={() => handleInsertAccentChar(accCh)}
                    className="w-10 h-10 flex items-center justify-center bg-zinc-900 border border-white/5 hover:border-emerald-400/40 text-sm font-serif font-semibold text-white rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    {accCh}
                  </button>
                ))}
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
                  className="text-[9px] tracking-widest text-emerald-400 font-bold uppercase hover:underline cursor-pointer"
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
                      textStyle = "text-white font-medium border-l-2 border-emerald-500 pl-2 bg-emerald-500/5 py-1 rounded";
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
                  <span className="text-white bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 underline underline-offset-4">
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
                  className="flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer group disabled:opacity-50"
                  title="Presser Tab de votre clavier pour rejouer l'audio"
                >
                  <Volume2 className={`w-5 h-5 ${isSpeaking ? "text-emerald-400 animate-bounce" : "text-zinc-400 group-hover:text-emerald-400"}`} />
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

        {/* VIEW 3: PERFORMANCE RESULTS REPORT & HARDEST WORDS SUMMARY */}
        {currentScreen === "results" && completedSessionDetails && selectedStory && (
          <div className="w-full max-w-3xl mx-auto animate-fade-in flex flex-col gap-8 py-8">
            
            {/* Header / Celebration Title */}
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
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
                <span className="text-3xl font-mono text-emerald-400 mt-1 leading-none">{completedSessionDetails.accuracy}%</span>
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
                <Languages className="w-4 h-4 text-emerald-400" /> Mots les plus difficiles à écrire
              </h3>
              
              {completedSessionDetails.hardestWords && completedSessionDetails.hardestWords.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-zinc-400">
                    Ces termes ont enregistré le plus haut taux d'erreur de frappe ou d' accents oubliés durante l'exercice. Assurez-vous d'appuyer sur la bonne touche :
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
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                <Settings className="w-4 h-4 text-emerald-400" />
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

            <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
              
              {/* Option 1: Vocal Speech Rate config slider */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Vitesse Audio de Lecture</label>
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
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                          : "bg-white/5 text-zinc-400 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {eSpeed.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 2: Correctness click & buz key Sound FX toggle */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Effets Sonores Actifs</label>
                  <p className="text-[11px] text-zinc-500 leading-normal mt-1">
                    Bruits de clavier : son clair sur réussite, buzzer sourd en cas de faute de frappe.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdateSettings({ ...settings, soundEffects: !settings.soundEffects })}
                  className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${
                    settings.soundEffects ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-black"></div>
                </button>
              </div>

              {/* Option 3: Interface Contrast Theme Selector */}
              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Mode d'affichage visuel</label>
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

              {/* Option 4: Premium OpenAI Voice Speech Key Config */}
              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Premium Audio TTS Cloud (Optionnel)</label>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Mosaïque HD</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Renseignez une clé d'API OpenAI pour synthétiser des voix ultra-réalistes de qualité studio.
                </p>
                <input 
                  type="password"
                  value={settings.ttsApiKey}
                  onChange={(e) => handleUpdateSettings({ ...settings, ttsApiKey: e.target.value })}
                  placeholder="sk-or-elevenlabs-key-..."
                  className="w-full bg-zinc-950 border border-white/5 focus:border-emerald-500/50 rounded-lg p-2.5 text-xs text-white focus:outline-none placeholder-zinc-700"
                />
              </div>

              {/* Option 5: Back up Restore JSON buttons */}
              <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sauvegarde & Restauration</label>
                
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

              {/* Option 6: Warning communications block */}
              <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-start gap-3 mt-2 text-xs leading-relaxed">
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
                <BookOpen className="w-4 h-4 text-emerald-400" />
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
              
              {/* Add Custom Story Stage Steps indicator badges */}
              <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl mb-2">
                <div className={`flex-1 py-1 text-center text-[10px] font-bold uppercase rounded ${
                  newStoryStep === 1 ? "bg-emerald-500 text-black" : "text-zinc-400"
                }`}>
                  1. Coller le paragraphe
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
                <div className={`flex-1 py-1 text-center text-[10px] font-bold uppercase rounded ${
                  newStoryStep === 2 ? "bg-emerald-500 text-black" : "text-zinc-650"
                }`}>
                  2. Traduction & Segmentation
                </div>
              </div>

              {/* STEP 1 workspace layout */}
              {newStoryStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-xs text-zinc-400 font-bold uppercase">Titre de l'histoire</label>
                      <input 
                        type="text"
                        value={newStoryTitle}
                        onChange={(e) => setNewStoryTitle(e.target.value)}
                        placeholder="Ex: Le Château Rouge"
                        className="bg-zinc-950 border border-white/5 focus:border-emerald-500/50 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400 font-bold uppercase">Niveau d'écriture</label>
                      <select
                        value={newStoryLevel}
                        onChange={(e) => setNewStoryLevel(e.target.value as StoryLevel)}
                        className="bg-zinc-950 border border-white/5 focus:border-emerald-500/50 rounded-lg p-2.5 text-xs text-white focus:outline-none h-[38px] cursor-pointer"
                      >
                        <option value="beginner">Débutant (Beginner)</option>
                        <option value="easy">Facile (Easy)</option>
                        <option value="intermediate">Intermédiaire (Intermediate)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-400 font-bold uppercase font-sans">Texte brut en Français (Paragraphe)</label>
                    <textarea
                      rows={6}
                      value={newStoryRawText}
                      onChange={(e) => setNewStoryRawText(e.target.value)}
                      placeholder="Collez ici l'intégralité du texte en français. Utilisez des points pour que l'outil puisse découper correctement vos phrases."
                      className="bg-zinc-950 border border-white/5 focus:border-emerald-500/50 rounded-lg p-3 text-xs text-white focus:outline-none font-serif leading-relaxed"
                    />
                  </div>

                  {addStoryError && (
                    <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs">
                      {addStoryError}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-white/5">
                    <button
                      onClick={handleProcessRawSplits}
                      disabled={!newStoryRawText.trim() || !newStoryTitle.trim()}
                      className="px-5 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 splits review workbench */}
              {newStoryStep === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3.5 rounded-xl">
                    <div className="flex flex-col gap-1 pr-6">
                      <p className="text-xs text-zinc-300 font-semibold uppercase flex items-center gap-1.5">
                        <Sparkles className="w-4.5 h-4.5 text-emerald-400" /> Traduction automatique par IA
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Notre serveur de traduction analyse vos segments de phrases en français pour générer instantanément l'équivalent anglais.
                      </p>
                    </div>

                    <button
                      onClick={handleTranslateAllWithAI}
                      disabled={addStoryLoading}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-zinc-850 font-semibold text-xs text-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {addStoryLoading ? "Traduction..." : "Traduire par IA"}
                    </button>
                  </div>

                  {addStoryError && (
                    <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium">
                      {addStoryError}
                    </div>
                  )}

                  {/* Sentences Split Editor area list */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400 font-bold uppercase pr-4">Révisez et ajustez vos segments de phrases</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{newStorySentences.length} segments détectés</span>
                    </div>

                    <div className="flex flex-col gap-4 max-h-[35vh] overflow-y-auto pr-1">
                      {newStorySentences.map((element, idx) => (
                        <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative group hover:border-white/10 transition-colors">
                          
                          {/* Top indicator count */}
                          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                            <span>Phrase #{idx + 1}</span>
                            <button 
                              onClick={() => {
                                setNewStorySentences(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-zinc-600 hover:text-rose-400 transition-colors"
                            >
                              Supprimer le segment
                            </button>
                          </div>

                          {/* French input */}
                          <input 
                            type="text"
                            value={element.french}
                            onChange={(e) => {
                              const typedValue = e.target.value;
                              setNewStorySentences(prev => prev.map((s, i) => i === idx ? { ...s, french: typedValue } : s));
                            }}
                            className="bg-zinc-950 border border-white/5 focus:border-white/10 rounded-lg p-2 text-xs text-white uppercase-none leading-relaxed font-serif"
                            placeholder="Phrase en Français"
                          />

                          {/* English input */}
                          <input 
                            type="text"
                            value={element.english}
                            onChange={(e) => {
                              const typedValue = e.target.value;
                              setNewStorySentences(prev => prev.map((s, i) => i === idx ? { ...s, english: typedValue } : s));
                            }}
                            className="bg-zinc-950/60 border border-white/5 focus:border-emerald-500/30 rounded-lg p-2 text-xs text-zinc-300 italic font-serif"
                            placeholder="Traduction en Anglais (English translation)"
                          />

                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <button
                      onClick={() => setNewStoryStep(1)}
                      className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg"
                    >
                      Retour aux réglages
                    </button>

                    <button
                      onClick={handleSaveCustomStory}
                      disabled={newStorySentences.length === 0}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Sauvegarder l'histoire
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
