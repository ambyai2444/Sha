import React, { useState, useEffect, useRef, useTransition } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { 
  Mic, 
  MicOff, 
  Send, 
  Trash2, 
  Plus, 
  Check, 
  Clock, 
  Database, 
  Calendar, 
  Mail, 
  FileText, 
  Camera, 
  CameraOff, 
  User as UserIcon, 
  LogOut, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  ListTodo, 
  HelpCircle,
  TrendingUp,
  Inbox,
  AlertTriangle,
  X,
  Search,
  Bell,
  BellOff,
  Download,
  Settings,
  Play,
  Square,
  Flag,
  ChevronLeft,
  ChevronRight,
  Menu,
  Columns,
  History,
  RotateCcw
} from "lucide-react";
import { 
  googleSignIn, 
  logout, 
  initAuth, 
  subscribeTasks, 
  subscribeSchedules, 
  saveTask, 
  deleteTask, 
  saveSchedule, 
  deleteSchedule, 
  getAdviceLogs, 
  createAdviceLog,
  getAccessToken
} from "./firebase/config";
import { UserTask, UserSchedule, AdviceLog } from "./types";
import { User } from "firebase/auth";

// Check if Web Speech Recognition exists
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Voice & Text command guide listing for the advisor modal
const COMMAND_GUIDE_CATEGORIES = [
  {
    title: "Calendar & Agenda",
    iconName: "calendar",
    description: "Manage schedules, agenda reviews, and secure Google calendar integrations.",
    colorClass: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5",
    commands: [
      { name: "Schedule a meeting", text: "Hey Shadow, schedule meeting with Google Workspace Team for tomorrow at 2 PM", purpose: "Inserts a structured meeting block." },
      { name: "What's on my agenda", text: "Hey Shadow, what is on my agenda today?", purpose: "Lists recent agenda items." },
      { name: "List upcoming meetings", text: "Hey Shadow, show my pending calendar block events", purpose: "Queries primary calendar blocks." }
    ]
  },
  {
    title: "Gmail Correspondence",
    iconName: "mail",
    description: "Inspect secure mailbox, read recent drafts, or dispatch direct emails.",
    colorClass: "text-blue-400 border-blue-500/10 bg-blue-500/5",
    commands: [
      { name: "Check unread emails", text: "Hey Shadow, list my recent unread emails", purpose: "Checks your unread Gmail inbox." },
      { name: "Send brief report mail", text: "Hey Shadow, send email to ambyai2499@gmail.com subject Workspace Ready body Hi, I have configured my primary security rules.", purpose: "Composes and delivers an email safely." }
    ]
  },
  {
    title: "Workspace Tasks",
    iconName: "tasks",
    description: "Sync interactive task cards with Firebase Firestore in real-time.",
    colorClass: "text-red-400 border-red-500/10 bg-red-500/5",
    commands: [
      { name: "Create task", text: "Hey Shadow, create task Review monthly budget spreadsheets", purpose: "Appends task node to To Do column." },
      { name: "What are my duties", text: "Hey Shadow, what task item list do I have pending?", purpose: "Syncs lists and reads off active tasks." }
    ]
  },
  {
    title: "Drive File Browser",
    iconName: "drive",
    description: "Browse assets, read and parse active documents or spreadsheet spreadsheets.",
    colorClass: "text-amber-400 border-amber-500/10 bg-amber-500/5",
    commands: [
      { name: "Search file name", text: "Hey Shadow, search drive files for analytics", purpose: "Queries secure active directory details." }
    ]
  },
  {
    title: "Smart Camera Lens",
    iconName: "camera",
    description: "Provide physical context or text verification through continuous computer vision snapshot analysis.",
    colorClass: "text-red-500 border-red-500/10 bg-red-500/5",
    commands: [
      { name: "Analyze surroundings", text: "Hey Shadow, run snapshot analysis on my desk workspace", purpose: "Fires vision snapshot parser." }
    ]
  }
];

// Helper to render guide category icons dynamically
const renderGuideCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case "calendar":
      return <Calendar className="w-5 h-5" />;
    case "mail":
      return <Mail className="w-5 h-5" />;
    case "tasks":
      return <ListTodo className="w-5 h-5" />;
    case "drive":
      return <FileText className="w-5 h-5" />;
    case "camera":
      return <Camera className="w-5 h-5" />;
    default:
      return <Sparkles className="w-5 h-5" />;
  }
};

// Global category style mapping utility with dynamic custom category color generation & border/glow styling
const getCategoryStyles = (catName: string): string => {
  const standardCat = catName || "Work";
  switch (standardCat) {
    case "Urgent": 
      return "bg-rose-500/15 text-rose-400 border-rose-500/20";
    case "Work": 
      return "bg-blue-500/15 text-blue-400 border-blue-500/20";
    case "Personal": 
      return "bg-purple-500/15 text-purple-400 border-purple-500/20";
    case "Idea": 
      return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    case "General": 
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    default: {
      // Dynamic, unique cyberpunk color/glow assignment helper for new typing categories
      let hash = 0;
      for (let i = 0; i < standardCat.length; i++) {
        hash = standardCat.charCodeAt(i) + ((hash << 5) - hash);
      }
      const uniqueColors = [
        { bg: "bg-cyan-500/15", text: "text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] font-bold", border: "border-cyan-500/30" },
        { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.3)] font-bold", border: "border-fuchsia-500/30" },
        { bg: "bg-pink-500/15", text: "text-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.3)] font-bold", border: "border-pink-500/30" },
        { bg: "bg-orange-500/15", text: "text-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.3)] font-bold", border: "border-orange-500/30" },
        { bg: "bg-yellow-500/15", text: "text-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.3)] font-bold", border: "border-yellow-500/30" },
        { bg: "bg-indigo-500/15", text: "text-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.3)] font-bold", border: "border-indigo-500/30" }
      ];
      const index = Math.abs(hash) % uniqueColors.length;
      const c = uniqueColors[index];
      return `${c.bg} ${c.text} ${c.border}`;
    }
  }
};

export default function App() {
  // Authentication & Session User states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);

  // Firestore DB states
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const isTaskOverdue = (task: UserTask) => {
    if (task.status === "done" || !task.dueDate) return false;
    try {
      const dueTime = task.dueDate.includes("T") ? new Date(task.dueDate) : new Date(`${task.dueDate}T23:59:59`);
      return dueTime < new Date();
    } catch (err) {
      return false;
    }
  };
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [schedules, setSchedules] = useState<UserSchedule[]>([]);
  const [adviceLogs, setAdviceLogs] = useState<AdviceLog[]>([]);

  // Local interaction UI states
  const [queryInput, setQueryInput] = useState("");
  const [isPending, startQueryTransition] = useTransition();
  const [advisorStatus, setAdvisorStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [isVoiceResponseEnabled, setIsVoiceResponseEnabled] = useState(true);
  const [assistantLogs, setAssistantLogs] = useState<Array<{ role: "user" | "model" | "system", text: string, time: string }>>([
    { role: "system", text: "SHADOW Assistant Agent active. Open-source cross-device desktop and phone integration is online. Press the central orb or say 'Hey Shadow' to begin continuous hands-free navigation.", time: new Date().toLocaleTimeString() }
  ]);

  // SELF-IMPROVEMENT MEMORY ENGINE TYPES & CONTEXT GENERATION
  interface InteractionExecution {
    command: string;
    timestamp: string;
    success: boolean;
    type: 'voice' | 'shortcut' | 'assistive';
  }

  const [interactionHistory, setInteractionHistory] = useState<InteractionExecution[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("shadow_interaction_history");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  const logInteraction = (command: string, success: boolean, type: 'voice' | 'shortcut' | 'assistive') => {
    if (!command || !command.trim()) return;
    const newInteraction: InteractionExecution = {
      command: command.trim(),
      timestamp: new Date().toISOString(),
      success,
      type
    };
    setInteractionHistory(prev => {
      const next = [newInteraction, ...prev].slice(0, 100);
      if (typeof window !== "undefined") {
        localStorage.setItem("shadow_interaction_history", JSON.stringify(next));
      }
      return next;
    });
  };

  const generateAdaptiveContext = (): string => {
    if (!interactionHistory || interactionHistory.length === 0) {
      return "";
    }

    const categoriesCount: Record<string, number> = {
      "Gmail / Email Communications": 0,
      "Google Calendar Schedules & Agenda": 0,
      "Google Sheets & Spreadsheets Records": 0,
      "Google Docs & Drive Files Management": 0,
      "System Settings & Accessibility Panel Controls": 0,
      "External News Browsing & Information Queries": 0,
      "Phone Alerts, Battery, & Notifications": 0,
      "General Chat & Friendly Conversation": 0,
    };

    interactionHistory.forEach(item => {
      const lower = (item.command || "").toLowerCase();
      if (lower.includes("email") || lower.includes("gmail") || lower.includes("mail") || lower.includes("send")) {
        categoriesCount["Gmail / Email Communications"]++;
      } else if (lower.includes("calendar") || lower.includes("event") || lower.includes("schedule") || lower.includes("meeting") || lower.includes("agenda")) {
        categoriesCount["Google Calendar Schedules & Agenda"]++;
      } else if (lower.includes("sheet") || lower.includes("spreadsheet") || lower.includes("values") || lower.includes("append")) {
        categoriesCount["Google Sheets & Spreadsheets Records"]++;
      } else if (lower.includes("doc") || lower.includes("drive") || lower.includes("file") || lower.includes("folder")) {
        categoriesCount["Google Docs & Drive Files Management"]++;
      } else if (lower.includes("settings") || lower.includes("panel") || lower.includes("theme") || lower.includes("volume") || lower.includes("speech")) {
        categoriesCount["System Settings & Accessibility Panel Controls"]++;
      } else if (lower.includes("news") || lower.includes("browse") || lower.includes("search") || lower.includes("internet") || lower.includes("query")) {
        categoriesCount["External News Browsing & Information Queries"]++;
      } else if (lower.includes("phone") || lower.includes("battery") || lower.includes("notification")) {
        categoriesCount["Phone Alerts, Battery, & Notifications"]++;
      } else {
        categoriesCount["General Chat & Friendly Conversation"]++;
      }
    });

    const sorted = Object.entries(categoriesCount)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name} (frequency score: ${count})`);

    if (sorted.length === 0) return "";

    return `\n[Shadow Learned Optimization Memory]\nBased on real interaction logs, the user's top 3 most-used tools dynamically are:\n${sorted.map((item, idx) => `${idx + 1}. ${item}`).join("\n")}\nPrioritize predicting and refining response accuracy based on this context.`;
  };

  // Wake Word & Recognition states
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [isCommandGuideOpen, setIsCommandGuideOpen] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const activePromptTimeoutRef = useRef<any>(null);

  // Camera Snapshot states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<string>("Camera standby");
  const [analysedSnapshotText, setAnalysedSnapshotText] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Direct Workspace Inspectors
  const [workspaceEmails, setWorkspaceEmails] = useState<any[]>([]);
  const [workspaceEvents, setWorkspaceEvents] = useState<any[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<any[]>([]);
  const [isWorkspaceFetching, setIsWorkspaceFetching] = useState(false);

  // Firestore creation overlay forms
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<string>("Work");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>("medium");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [newScheduleTitle, setNewScheduleTitle] = useState("");
  const [newScheduleDesc, setNewScheduleDesc] = useState("");
  const [newScheduleStart, setNewScheduleStart] = useState("");
  const [newScheduleEnd, setNewScheduleEnd] = useState("");

  // Drag and Drop active column overlay state
  const [activeDragCol, setActiveDragCol] = useState<'todo' | 'in_progress' | 'done' | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Notification States
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default'
  );
  const checkedTasksRef = useRef<Record<string, boolean>>({});

  // Calendar Auto-sync state mapping
  const [isCalendarAutoSyncEnabled, setIsCalendarAutoSyncEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("workspace_calendar_autosync") !== "false";
    }
    return true;
  });

  const toggleCalendarAutoSync = () => {
    const nextVal = !isCalendarAutoSyncEnabled;
    setIsCalendarAutoSyncEnabled(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("workspace_calendar_autosync", String(nextVal));
    }
    // Perform manual sync preview when enabled
    if (nextVal) {
      setTimeout(() => {
        fetchWorkspacePreview();
      }, 100);
    }
  };

  // Settings & Accessibility Theme States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMidnightTheme, setIsMidnightTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme_midnight") === "true";
    }
    return false;
  });

  const toggleMidnightTheme = () => {
    const nextVal = !isMidnightTheme;
    setIsMidnightTheme(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme_midnight", String(nextVal));
      if (nextVal) {
        document.documentElement.classList.add("theme-midnight");
      } else {
        document.documentElement.classList.remove("theme-midnight");
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isMidnightTheme) {
        document.documentElement.classList.add("theme-midnight");
      } else {
        document.documentElement.classList.remove("theme-midnight");
      }
    }
  }, [isMidnightTheme]);


  // Recent Commands carousel states
  const DEFAULT_RECENT_COMMANDS = [
    "Hey Shadow, open my documents folder",
    "Hey Shadow, check phone battery and notifications",
    "Hey Shadow, open system settings panel",
    "Hey Shadow, browse the internet for recent news"
  ];

  const [recentCommands, setRecentCommands] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("workspace_recent_voice_commands");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return DEFAULT_RECENT_COMMANDS;
        }
      }
    }
    return DEFAULT_RECENT_COMMANDS;
  });

  const addRecentCommand = (command: string) => {
    if (!command || !command.trim()) return;
    const trimmed = command.trim();
    if (trimmed.startsWith("[") || trimmed.includes("Advisory Error") || trimmed.length < 5) return;
    setRecentCommands(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 8);
      if (typeof window !== "undefined") {
        localStorage.setItem("workspace_recent_voice_commands", JSON.stringify(next));
      }
      return next;
    });
  };

  // Voice recording states for custom directives
  const [isRecordingVoiceCommand, setIsRecordingVoiceCommand] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [commandRecordings, setCommandRecordings] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const recordingRecognitionRef = useRef<any>(null);

  // Stop recording timer and clear resources helper
  const cleanRecordingResources = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (recordingRecognitionRef.current) {
      try {
        recordingRecognitionRef.current.abort();
      } catch (e) {}
      recordingRecognitionRef.current = null;
    }
  };

  const handleStartVoiceRecording = async () => {
    if (isRecordingVoiceCommand) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = { mimeType: "audio/webm" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (err) {
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Set up parallel speech recognition to get transcribing
      let transcribedText = "";
      if (SpeechRecognitionAPI) {
        const rec = new SpeechRecognitionAPI();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (e: any) => {
          if (e.results && e.results[0] && e.results[0][0]) {
            transcribedText = e.results[0][0].transcript.trim();
          }
        };
        recordingRecognitionRef.current = rec;
        try {
          rec.start();
        } catch (e) {}
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Build label: use Speech-Transcribed words OR timestamp fallbacks
        let finalLabel = transcribedText.trim();
        if (!finalLabel) {
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          finalLabel = `Hey Shadow, direct memo recording [${timestamp}]`;
        } else {
          // clean it / prepend Hey Shadow if missing for core system context compatibility
          if (!finalLabel.toLowerCase().startsWith("hey shadow") && !finalLabel.toLowerCase().startsWith("shadow")) {
            finalLabel = `Hey Shadow, ${finalLabel}`;
          }
        }

        // Add to carousel state list & matching audio record map
        addRecentCommand(finalLabel);
        setCommandRecordings(prev => ({
          ...prev,
          [finalLabel]: audioUrl
        }));

        setAssistantLogs(prev => [
          ...prev,
          { role: "system", text: `Voice command memo saved: "${finalLabel}"`, time: new Date().toLocaleTimeString() }
        ]);

        // stop microphone track and cleanup
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(250);
      setIsRecordingVoiceCommand(true);
      setRecordingSeconds(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Error accessing microphone for recording", err);
      alert("Could not access microphone: " + (err.message || err));
    }
  };

  const handleStopVoiceRecording = () => {
    if (!isRecordingVoiceCommand) return;
    
    setIsRecordingVoiceCommand(false);
    cleanRecordingResources();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
  };

  // Playback state or function
  const [playingCommandId, setPlayingCommandId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayVoiceCommand = (cmd: string) => {
    // Stop any existing playing audio or synthesis
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
      } catch (e) {}
      activeAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (playingCommandId === cmd) {
      setPlayingCommandId(null);
      return;
    }

    const recordedUrl = commandRecordings[cmd];
    if (recordedUrl) {
      // Play real audio memo recorded
      const audio = new Audio(recordedUrl);
      activeAudioRef.current = audio;
      setPlayingCommandId(cmd);
      audio.play().catch(e => {
        console.error("Audio playback error", e);
        setPlayingCommandId(null);
      });
      audio.onended = () => {
        setPlayingCommandId(null);
      };
    } else {
      // Text-to-speech fallback play voice command
      if (!window.speechSynthesis) {
        alert("Speech synthesis not supported in this browser.");
        return;
      }
      setPlayingCommandId(cmd);
      const utterance = new SpeechSynthesisUtterance(cmd);
      
      // customize voice rate/pitch matching configuration
      utterance.rate = speechRate || 1.0;
      utterance.volume = voiceVolume;
      if (availableVoices.length > 0) {
        const chosen = availableVoices.find(v => v.name === selectedVoiceName);
        if (chosen) utterance.voice = chosen;
      }

      utterance.onend = () => {
        setPlayingCommandId(null);
      };
      utterance.onerror = () => {
        setPlayingCommandId(null);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  // Initialize Speech Synthesis Options
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [voiceVolume, setVoiceVolume] = useState<number>(0.8);

  // Dynamic status-colored indicator for the Gemini-style dynamic aura
  const getGlowStatusClass = () => {
    if (!isWakeWordListening) return "gemini-glow-idle";
    if (advisorStatus === "listening") return "gemini-glow-listening";
    if (advisorStatus === "processing") return "gemini-glow-processing";
    if (advisorStatus === "speaking") return "gemini-glow-speaking";
    return "gemini-glow-idle";
  };

  // Terminal scroll tracking
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Initialize Authentication & listeners
  useEffect(() => {
    const unsubAuth = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        setGoogleAccessToken(token);
        setNeedsAuth(false);
        setAuthInitialized(true);
      },
      () => {
        setCurrentUser(null);
        setGoogleAccessToken(null);
        setNeedsAuth(true);
        setAuthInitialized(true);
      }
    );

    // Load synth voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      const defaultVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Male") || v.lang.startsWith("en"));
      if (defaultVoice) {
        setSelectedVoiceName(defaultVoice.name);
      } else if (voices.length > 0) {
        setSelectedVoiceName(voices[0].name);
      }
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      unsubAuth();
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  // Sync data whenever authenticated user changes
  useEffect(() => {
    if (!currentUser) return;
    
    // Subscribe to tasks
    const unTask = subscribeTasks(currentUser.uid, 
      (items) => setTasks(items.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
      (err) => console.error(err)
    );

    // Subscribe to schedules
    const unSchedule = subscribeSchedules(currentUser.uid, 
      (items) => {
        setSchedules(items.sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      }
    );

    // Pull historic snapshot logs
    const fetchLogs = async () => {
      try {
        const items = await getAdviceLogs(currentUser.uid);
        if (items) setAdviceLogs(items);
      } catch (err) {
        console.warn(err);
      }
    };
    fetchLogs();

    // Auto load real workspace components
    fetchWorkspacePreview();

    return () => {
      unTask();
      unSchedule();
    };
  }, [currentUser, googleAccessToken]);

  // Periodic Real-time Workspace Syncing (respected by isCalendarAutoSyncEnabled)
  useEffect(() => {
    if (!currentUser || !isCalendarAutoSyncEnabled) return;
    
    // Set periodic timer (every 60 seconds) to auto-sync calendar indices and details
    const intervalId = setInterval(() => {
      fetchWorkspacePreview();
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentUser, googleAccessToken, isCalendarAutoSyncEnabled]);

  // Terminal scroll control
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistantLogs, isPending]);

  // Speak text back in cool neural voice
  const speakVoiceReply = (text: string) => {
    if (!isVoiceResponseEnabled || !text) return;
    window.speechSynthesis.cancel(); // kill existing feeds first
    
    // Clean string from intense markdowns so voice synthesis is natural
    const cleaned = text
      .replace(/[\*\#\`\_]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/(\r\n|\n|\r)/gm, " ");

    const utterance = new SpeechSynthesisUtterance(cleaned.substring(0, 500)); // limit voice duration block
    utterance.rate = speechRate;
    utterance.volume = voiceVolume;
    const chosen = availableVoices.find(v => v.name === selectedVoiceName);
    if (chosen) {
      utterance.voice = chosen;
    }
    
    utterance.onstart = () => setAdvisorStatus("speaking");
    utterance.onend = () => setAdvisorStatus("idle");
    utterance.onerror = () => setAdvisorStatus("idle");
    window.speechSynthesis.speak(utterance);
  };

  // Google Login handling with token mapping
  const handleGoogleSignIn = async () => {
    const loaderId = "auth-load";
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setGoogleAccessToken(res.accessToken);
        setNeedsAuth(false);
        setAssistantLogs(prev => [
          ...prev, 
          { role: "system", text: `Authenticated successfully as ${res.user.displayName}. Sync modules operational.`, time: new Date().toLocaleTimeString() }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      alert("Sign in failed. Ensure popups are allowed.");
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setGoogleAccessToken(null);
    setNeedsAuth(true);
    setAssistantLogs([{ role: "system", text: "Logged out. Shadow secured.", time: new Date().toLocaleTimeString() }]);
  };

  // Web Speech wake-word or button listener toggle
  const toggleWakeWordListening = () => {
    if (!SpeechRecognitionAPI) {
      alert("Your browser does not fully support the SpeechRecognition API. Please use the styled terminal input.");
      return;
    }

    if (isWakeWordListening) {
      // Turn off listening
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch (e) {}
      }
      setIsWakeWordListening(false);
      setAdvisorStatus("idle");
      setAssistantLogs(prev => [...prev, { role: "system", text: "Shadow Voice Activation disabled.", time: new Date().toLocaleTimeString() }]);
    } else {
      // Turn on listening
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsWakeWordListening(true);
        setAdvisorStatus("listening");
        setAssistantLogs(prev => [
          ...prev, 
          { role: "system", text: "SHADOW Assistive Wake Word detection active. Say 'Hey Shadow' aloud...", time: new Date().toLocaleTimeString() }
        ]);
      };

      rec.onresult = (e: any) => {
        const lastResultIndex = e.results.length - 1;
        const speechText = e.results[lastResultIndex][0].transcript.trim();
        console.log("Recognized raw voice segment:", speechText);

        const lowerText = speechText.toLowerCase();
        // Check for 'Hey Shadow' trigger word
        const hasShadow = lowerText.includes("hey shadow") || lowerText.includes("shadow");
        if (hasShadow) {
          // Extract everything after wake word
          let promptQuery = speechText;
          const matchSplit = lowerText.split(/hey shadow|shadow/);
          if (matchSplit.length > 1 && matchSplit[1].trim()) {
            promptQuery = matchSplit[1].trim();
          }

          setQueryInput(promptQuery);
          setAdvisorStatus("processing");
          
          setAssistantLogs(prev => [
            ...prev,
            { role: "user", text: `[Voice Activated] "${speechText}"`, time: new Date().toLocaleTimeString() }
          ]);

          // Fire advisor logic
          submitShadowQuery(promptQuery, true, 'voice');
        }
      };

      rec.onend = () => {
        // Safe auto-restart for continuous wake listening if state didn't toggle manually
        if (isWakeWordListening) {
          try {
            rec.start();
          } catch (e) {}
        }
      };

      speechRecognitionRef.current = rec;
      try {
        rec.start();
      } catch (err) {
        console.error(err);
        setIsWakeWordListening(false);
      }
    }
  };

  // Global window-level keyboard event listener for accessibility shortcut controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Configure the 'Esc' (Escape) key to automatically close outer/modal overlays
      if (e.key === "Escape") {
        setIsCommandGuideOpen(false);
        setIsSettingsOpen(false);
      }

      // 2. Alt + M key combination to seamlessly toggle the central microphone/voice orb activation state
      if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        toggleWakeWordListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleWakeWordListening]);

  // Web Audio API high-fidelity synthesizer double-frequency chime on speaking transition
  useEffect(() => {
    if (advisorStatus === "speaking") {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          
          // First pulse (lower note: C5, 523.25 Hz)
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
          gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
          
          osc1.connect(gain1);
          gain1.connect(audioCtx.destination);
          
          osc1.start(audioCtx.currentTime);
          osc1.stop(audioCtx.currentTime + 0.12);

          // Second pulse: double-frequency (higher note: C6, 1046.50 Hz) with short offset
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.06);
          gain2.gain.setValueAtTime(0, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.06);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
          
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          
          osc2.start(audioCtx.currentTime + 0.06);
          osc2.stop(audioCtx.currentTime + 0.22);
        }
      } catch (err) {
        console.warn("Web Audio API not supported or blocked by sandbox permissions:", err);
      }
    }
  }, [advisorStatus]);

  // Submit actual query to full-stack Express API server
  const submitShadowQuery = async (queryText: string, isVoice: boolean, type: 'voice' | 'shortcut' | 'assistive' = 'assistive') => {
    if (!queryText.trim()) return;
    
    // Track in dynamic recent voice commands history
    addRecentCommand(queryText);
    
    setAdvisorStatus("processing");
    const timestampLog = new Date().toLocaleTimeString();
 
    // Prepare history logs
    const mappedHistory = assistantLogs
      .filter(l => l.role !== "system")
      .slice(-10)
      .map(l => ({
        role: l.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: l.text }]
      }));
 
    startQueryTransition(async () => {
      try {
        const token = googleAccessToken || await getAccessToken();
        const adaptiveContext = generateAdaptiveContext();
        
        const response = await fetch("/api/shadow/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: queryText,
            chatHistory: mappedHistory,
            accessToken: token || undefined,
            adaptiveContext: adaptiveContext || undefined
          })
        });
 
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Shadow Advisor API failed.");
        }
 
        const data = await response.json();
        const modelReply = data.text || "No response computed.";
 
        // Display response
        setAssistantLogs(prev => [
          ...prev,
          { role: "model", text: modelReply, time: new Date().toLocaleTimeString() }
        ]);
 
        // Speak response out loud if enabled
        if (isVoice) {
          speakVoiceReply(modelReply);
        } else {
          setAdvisorStatus("idle");
        }
 
        // Persist voice logs histories to Firestore
        if (currentUser) {
          const adviceLogId = "log_" + Date.now().toString();
          const logPayload: Omit<AdviceLog, 'ownerId'> = {
            id: adviceLogId,
            prompt: queryText,
            response: modelReply,
            type: isVoice ? "voice" : "text",
            createdAt: new Date().toISOString()
          };
          await createAdviceLog(currentUser.uid, logPayload);
          // Refresh list
          const updatedLogs = await getAdviceLogs(currentUser.uid);
          if (updatedLogs) setAdviceLogs(updatedLogs);
        }
 
        // Refresh workspace info in case model wrote spreadsheets/notes or created events
        if (data.toolCallsMade && data.toolCallsMade.length > 0) {
          fetchWorkspacePreview();
        }

        // Successfully completed interaction
        logInteraction(queryText, true, type);
 
      } catch (err: any) {
        setAdvisorStatus("idle");
        setAssistantLogs(prev => [
          ...prev,
          { role: "system", text: `Advisory Error: ${err.message || err}`, time: new Date().toLocaleTimeString() }
        ]);
        // Erroneous interaction
        logInteraction(queryText, false, type);
      }
    });
 
    setQueryInput("");
  };

  // Keyboard Form submit listener
  const handleQueryFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isPending) return;

    setAssistantLogs(prev => [
      ...prev,
      { role: "user", text: queryInput, time: new Date().toLocaleTimeString() }
    ]);

    submitShadowQuery(queryInput, false, 'assistive');
  };

  // Safe Camera Module toggler with authorization verification
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
      setIsCameraActive(false);
      setCameraStatus("Camera disabled");
    } else {
      setCameraStatus("Acquiring visual authorization...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        setCameraStream(stream);
        setIsCameraActive(true);
        setCameraStatus("Live Feed Secure");
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setCameraStatus(`Access Denied: ${err.message || err}`);
        setIsCameraActive(false);
      }
    }
  };

  // Process camera video frames, convert to Base64 and run multimodal image evaluation
  const captureAndAnalyzeSnapshot = async () => {
    if (!isCameraActive || !videoRef.current) {
      alert("Activate the live camera stream first.");
      return;
    }

    setCameraStatus("Rasterizing frame...");
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not acquire 2D canvas context.");
      
      // Draw standard snapshot
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64Image = dataUrl.split(",")[1];

      setCameraStatus("Analyzing object in shadow workspace...");
      
      const response = await fetch("/api/shadow/image-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          mimeType: "image/jpeg",
          prompt: "What item is this, and is there any analytical advice or tasks related to this object you should recommend to the user? Answer cleanly."
        })
      });

      if (!response.ok) {
        throw new Error("Multimodal snapshot post failed.");
      }

      const resJson = await response.json();
      const outputText = resJson.text || "Analyze outcome empty.";
      
      setAnalysedSnapshotText(outputText);
      setCameraStatus("Live Feed Secure");

      // Save as historical capture log to conversation panel
      setAssistantLogs(prev => [
        ...prev,
        { role: "user", text: `[Object Snapshot Analyzed] (Visual input analyzed)`, time: new Date().toLocaleTimeString() },
        { role: "model", text: `[Camera Advisor Result]: ${outputText}`, time: new Date().toLocaleTimeString() }
      ]);

      // Persist in Firestore
      if (currentUser) {
        const adviceLogId = "snapshot_" + Date.now().toString();
        const logPayload: Omit<AdviceLog, 'ownerId'> = {
          id: adviceLogId,
          prompt: "Webcam live object snapshot",
          response: outputText,
          type: "snapshot",
          imageUrl: dataUrl,
          createdAt: new Date().toISOString()
        };
        await createAdviceLog(currentUser.uid, logPayload);
        const updatedLogs = await getAdviceLogs(currentUser.uid);
        if (updatedLogs) setAdviceLogs(updatedLogs);
      }

    } catch (err: any) {
      console.error(err);
      setCameraStatus(`Analysis Fail: ${err.message || err}`);
    }
  };

  // Direct fetch triggers to show actual connected Workspace dashboards
  const fetchWorkspacePreview = async () => {
    const token = googleAccessToken || await getAccessToken();
    if (!token) return;

    setIsWorkspaceFetching(true);
    try {
      // 1. Fetch upcoming calendar events (guarded with isCalendarAutoSyncEnabled)
      if (isCalendarAutoSyncEnabled) {
        const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(new Date().toISOString())}&maxResults=4&singleEvents=true&orderBy=startTime`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (calRes.ok) {
          const data = await calRes.json();
          setWorkspaceEvents(data.items || []);
        }
      } else {
        setWorkspaceEvents([]); // Keep clear if disabled to save active quotas
      }

      // 2. Fetch unread emails
      const mailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=4&q=is:unread", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (mailRes.ok) {
        const rawMail = await mailRes.json();
        const processed = [];
        if (rawMail.messages) {
          for (const m of rawMail.messages) {
            const getDetail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (getDetail.ok) {
              const info = await getDetail.json();
              const subject = info.payload?.headers?.find((h:any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
              const fromVal = info.payload?.headers?.find((h:any) => h.name.toLowerCase() === 'from')?.value || 'Unknown sender';
              processed.push({ id: m.id, subject, from: fromVal, snippet: info.snippet || '' });
            }
          }
        }
        setWorkspaceEmails(processed);
      }

      // 3. Fetch drive files (Documents and spreadsheets)
      const q = "mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet'";
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=4&fields=files(id,name,mimeType,modifiedTime)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (driveRes.ok) {
        const driveData = await driveRes.json();
        setWorkspaceFiles(driveData.files || []);
      }

    } catch (e) {
      console.warn("Could not load fully connected Workspace parameters:", e);
    } finally {
      setIsWorkspaceFetching(false);
    }
  };

  // Firestore Quick actions CRUD
  const handleAddNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentUser) return;

    const resolvedCategory = newTaskCategory === "Custom" 
      ? (customCategoryInput.trim() || "Custom")
      : (newTaskCategory || "Work");

    const taskId = "task_" + Date.now().toString();
    const taskPayload: Omit<UserTask, 'ownerId'> = {
      id: taskId,
      title: newTaskTitle,
      description: newTaskDesc || "",
      category: resolvedCategory,
      status: "todo",
      priority: newTaskPriority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (newTaskDueDate) {
      taskPayload.dueDate = newTaskDueDate;
    }

    await saveTask(currentUser.uid, taskPayload);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskDueDate("");
    setCustomCategoryInput("");
    setNewTaskCategory("Work");
    setNewTaskPriority("medium");
  };

  const handleUpdateTaskStatus = async (task: UserTask, nextStatus: 'todo' | 'in_progress' | 'done') => {
    if (!currentUser) return;
    const { id, title, description, category, createdAt, dueDate, priority } = task;
    const taskPayload: Omit<UserTask, 'ownerId'> = {
      id,
      title,
      description: description || "",
      category: category || "Work",
      status: nextStatus,
      priority: priority || "medium",
      createdAt,
      updatedAt: new Date().toISOString()
    };
    if (dueDate) {
      taskPayload.dueDate = dueDate;
    }
    await saveTask(currentUser.uid, taskPayload);
  };

  const handleDeleteTaskItem = async (taskId: string) => {
    if (!currentUser) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this task? This mutates your sync history.");
    if (!confirmDelete) return;
    await deleteTask(currentUser.uid, taskId);
  };

  const handleExportToCSV = () => {
    const filtered = tasks.filter(t => {
      if (selectedCategoryFilter !== "All" && (t.category || "Work") !== selectedCategoryFilter) return false;
      if (!taskSearchQuery) return true;
      const q = taskSearchQuery.toLowerCase();
      return (t.title && t.title.toLowerCase().includes(q)) || 
             (t.description && t.description.toLowerCase().includes(q)) ||
             (t.category && t.category.toLowerCase().includes(q));
    });

    const escapeCSVField = (val: string | undefined | null) => {
      if (val === undefined || val === null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ["Task ID", "Title", "Description", "Category", "Due Date", "Status", "Created At", "Updated At"];
    const rows = filtered.map(t => [
      t.id,
      t.title,
      t.description || "",
      t.category || "Work",
      t.dueDate || "N/A",
      t.status,
      t.createdAt,
      t.updatedAt
    ]);

    const csvContent = [
      headers.map(escapeCSVField).join(","),
      ...rows.map(row => row.map(escapeCSVField).join(","))
    ].join("\n");

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const activeFilterStr = selectedCategoryFilter !== "All" ? `_${selectedCategoryFilter}` : "";
      link.setAttribute("download", `tasks_sync_matrix${activeFilterStr}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate and download CSV file", e);
    }
  };

  // HTML5 Drag and Drop Handler Actions
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setActiveDragCol(null);
  };

  const handleDragOver = (e: React.DragEvent, status: 'todo' | 'in_progress' | 'done') => {
    e.preventDefault();
    if (activeDragCol !== status) {
      setActiveDragCol(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setActiveDragCol(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'todo' | 'in_progress' | 'done') => {
    e.preventDefault();
    setActiveDragCol(null);
    setDraggingTaskId(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (taskToUpdate && taskToUpdate.status !== targetStatus) {
      await handleUpdateTaskStatus(taskToUpdate, targetStatus);
    }
  };

  // Trigger notification for Urgent tasks when their due date is reached
  useEffect(() => {
    if (tasks.length === 0) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    // Auto-sync status refresh
    if (window.Notification.permission !== notificationPermission) {
      setNotificationPermission(window.Notification.permission);
    }

    if (notificationPermission !== "granted") return;

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const now = new Date();

    tasks.forEach(t => {
      // Trigger if category is Urgent, not completed, and has a due date
      if (t.category === "Urgent" && t.status !== "done" && t.dueDate) {
        let isOverdue = false;
        try {
          const dueTime = t.dueDate.includes("T") ? new Date(t.dueDate) : new Date(`${t.dueDate}T23:59:59`);
          isOverdue = dueTime <= now;
        } catch (err) {
          isOverdue = false;
        }

        if (isOverdue && !checkedTasksRef.current[t.id]) {
          checkedTasksRef.current[t.id] = true;
          
          let bodyMessage = `Overdue task: "${t.title}" is urgent and has passed its due date (${t.dueDate}).`;
          if (t.dueDate === todayStr) {
            bodyMessage = `Due today! Urgent task: "${t.title}" needs immediate focus.`;
          }

          try {
            new window.Notification("⚠️ Urgent Task Due", {
              body: bodyMessage,
              icon: "/favicon.ico",
              tag: t.id,
              requireInteraction: true
            });
          } catch (e) {
            console.warn("Could not display browser notification:", e);
          }
        }
      }
    });
  }, [tasks, notificationPermission]);

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn("Notification API not supported");
      return;
    }
    try {
      const p = await window.Notification.requestPermission();
      setNotificationPermission(p);
      if (p === "granted") {
        new window.Notification("Matrix Alerts Activated", {
          body: "Neural notifications configured successfully! You will be updated here.",
          icon: "/favicon.ico"
        });
      }
    } catch (e) {
      console.error("Permission request failed", e);
    }
  };

  const handleAddNewSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleTitle.trim() || !newScheduleStart || !newScheduleEnd || !currentUser) {
      alert("Please provide event title, starting and ending times.");
      return;
    }

    const scheduleId = "event_" + Date.now().toString();
    const payload: Omit<UserSchedule, 'ownerId'> = {
      id: scheduleId,
      title: newScheduleTitle,
      description: newScheduleDesc || "",
      startTime: new Date(newScheduleStart).toISOString(),
      endTime: new Date(newScheduleEnd).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveSchedule(currentUser.uid, payload);
    setNewScheduleTitle("");
    setNewScheduleDesc("");
    setNewScheduleStart("");
    setNewScheduleEnd("");
  };

  const handleDeleteScheduleEvent = async (scheduleId: string) => {
    if (!currentUser) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this event block? This mutates your agenda.");
    if (!confirmDelete) return;
    await deleteSchedule(currentUser.uid, scheduleId);
  };

  // Clean prompt helper to ask shadow questions automatically via clicking shortcut tags
  const triggerShortcutQuestion = (text: string) => {
    setQueryInput(text);
    setAssistantLogs(prev => [
      ...prev,
      { role: "user", text: text, time: new Date().toLocaleTimeString() }
    ]);
    submitShadowQuery(text, false, 'shortcut');
  };

  return (
    <div id="shadow-app" className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-[#ea3323] selection:text-white relative overflow-hidden backdrop-blur-3xl">
      
      {/* Frosted Glass ambient spotlights (from Design HTML template) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] bg-blue-900/20 rounded-full blur-[130px]"></div>
        <div className="absolute top-[60%] -right-[5%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[130px]"></div>
      </div>

      {/* Dynamic Header Banner with Royal Red and Blue Accents */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md py-4 px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-lg z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#214ef5] via-[#a855f7] to-[#ea3323] p-[1.5px] shadow-[0_0_20px_rgba(33,78,245,0.35)] hover:scale-105 transition-all duration-300">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <span className="text-sm font-black font-sans tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-[#ea3323] select-none">
                S
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-widest bg-gradient-to-r from-white via-neutral-100 to-[#ea3323] bg-clip-text text-transparent uppercase">
              SHADOW <span className="text-[9px] font-mono lowercase tracking-normal pl-1 border border-white/20 px-1.5 rounded text-white/60 bg-white/5">Assistant Agent v1.0</span>
            </h1>
            <p className="text-[10px] uppercase font-mono tracking-widest text-[#214ef5] font-bold">Awaiting Voice Command &bull; Desktop & Phone Sync Active</p>
          </div>
        </div>

        {/* Auth status block or user profile */}
        <div className="flex items-center gap-4">
          {/* Collapsible Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center gap-2 hover:border-[#0000FF]/50 transition-all font-mono text-xs text-white/90 cursor-pointer shadow-md select-none group"
            title={isSidebarOpen ? "Collapse Side Panel" : "Expand Side Panel"}
          >
            <Columns className="w-3.5 h-3.5 text-[#0000FF] group-hover:text-[#FF0000] transition-colors" />
            <span className="text-[10px] uppercase tracking-wide hidden sm:inline">{isSidebarOpen ? "Hide Panels" : "Show Panels"}</span>
          </button>

          {/* Settings Menu and Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 hover:bg-white/10 active:scale-95 transition-all text-neutral-300 hover:text-white rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer shadow-md"
              title="System Accessibility & Theme Settings"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
            </button>
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-72 bg-neutral-950 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 space-y-3 font-sans text-left"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">System Settings</span>
                    <button 
                      onClick={() => setIsSettingsOpen(false)} 
                      className="text-neutral-400 hover:text-white text-xs font-mono cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Midnight Theme Switch */}
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-xs font-bold text-white">High Contrast Midnight</p>
                      <p className="text-[9px] font-mono text-white/40 leading-tight">Increases text legibility for accessibility</p>
                    </div>
                    <button
                      onClick={toggleMidnightTheme}
                      className={`relative w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${isMidnightTheme ? 'bg-[#ea3323]' : 'bg-white/10'}`}
                    >
                      <motion.div
                        layout
                        className="w-4 h-4 bg-white rounded-full shadow-md pointer-events-none"
                        animate={{ x: isMidnightTheme ? 18 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>

                  {/* Voice Synthesis Settings Section */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                      Voice Synthesis Settings
                    </span>
                    
                    {/* Voice Tone Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-white/50 block">Select Tone / Speaker:</label>
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => setSelectedVoiceName(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-lg p-1.5 text-xs font-mono text-white/80 outline-none focus:border-[#214ef5]/50 [color-scheme:dark]"
                      >
                        {availableVoices.length > 0 ? (
                          availableVoices.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.lang})
                            </option>
                          ))
                        ) : (
                          <option value="">No custom voices available</option>
                        )}
                      </select>
                    </div>

                    {/* Speaking Volume Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-mono text-white/50">
                        <span>Speaker Volume:</span>
                        <span className="text-white">{(voiceVolume * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={voiceVolume}
                        onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                        className="w-[100%] accent-indigo-500 bg-white/10 h-1 rounded-lg cursor-pointer transition-all"
                        title="Adjust Speaking Volume"
                      />
                    </div>
                  </div>

                  <div className="text-[8px] font-mono text-white/30 pt-1 border-t border-white/5 leading-normal">
                    *Midnight Theme leverages high-contrast CSS overrides, deep solid panels, and crisp borders for maximum legibility.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-4 bg-white/5 p-2 px-3 rounded-full border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold leading-none">{currentUser.displayName}</p>
                  <p className="text-[10px] font-mono text-white/50 max-w-[150px] truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="h-6 w-[1px] bg-white/10"></div>
              <button 
                onClick={handleLogout}
                className="p-1 px-2.5 hover:bg-[#ea3323]/20 hover:text-[#ea3323] transition-colors rounded-full text-xs flex items-center gap-1.5 text-neutral-300 font-mono"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Secure Shadow</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#ea3323] flex items-center gap-1.5 animate-pulse bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> Security Mode Locked
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Sandbox Layout container */}
      {needsAuth ? (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden z-10">
          {/* Cyberpunk backdrop elements */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-[#ea3323]/10 to-[#214ef5]/10 rounded-full blur-3xl -z-10"></div>
          
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 relative z-10 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#214ef5] via-[#a855f7] to-[#ea3323] p-[2px] shadow-2xl shadow-indigo-600/20 mb-6 group hover:scale-105 transition-all duration-300">
              <div className="w-full h-full bg-neutral-950 rounded-[22px] flex items-center justify-center backdrop-blur-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#214ef5]/5 to-[#ea3323]/5 opacity-50 group-hover:opacity-85 transition-opacity"></div>
                <span className="text-3xl font-black font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-[#ea3323] select-none">
                  S
                </span>
              </div>
            </div>
            
            <h2 className="text-3xl font-sans font-bold tracking-tight text-white mb-2">Initialize SHADOW Agent</h2>
            <p className="text-sm font-sans text-white/60 mb-8 max-w-sm mx-auto">
              Please authenticate with Google Login to configure your desktop & phone helper interface, assistive task grids, and complete system permissions scopes safely.
            </p>

            {/* Custom styled Material Google Sign-In Button */}
            <button 
              onClick={handleGoogleSignIn}
              className="gsi-material-button w-full flex items-center justify-center gap-3 bg-white text-black py-3 px-4 rounded-xl font-sans font-medium transition-all hover:bg-neutral-100 hover:shadow-lg focus:outline-none cursor-pointer"
            >
              <div className="gsi-material-button-icon w-5 h-5">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google Account</span>
            </button>

            <div className="mt-8 pt-6 border-t border-white/10 flex justify-center items-center gap-2 text-[11px] font-mono text-[#ea3323]">
              <ShieldCheck className="w-4 h-4 text-[#ea3323]" /> Assistive Environment Synced via Google Account Core
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full z-10" style={{ backgroundColor: '#000000' }}>
          
          {/* LEFT AREA: Voice Assistant Dashboard in Central View */}
          <div className={`flex flex-col gap-6 transition-all duration-350 ${isSidebarOpen ? "lg:col-span-7" : "lg:col-span-12"}`}>
            
            {/* Immersive Shadow Voice Sphere stage with Gemini-inspired responsive gradients */}
            <section className="bg-neutral-950/80 backdrop-blur-3xl rounded-2xl p-6 border border-white/10 flex flex-col justify-between relative overflow-hidden min-h-[340px] shadow-2xl shadow-indigo-500/5">
              {/* Animated glass shine effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.01] to-white/0 pointer-events-none" />

              {/* Command Guide Button */}
              <button 
                onClick={() => setIsCommandGuideOpen(true)}
                className="absolute top-4 left-4 flex items-center gap-1.5 text-white/70 hover:text-white bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 px-3 py-1.5 rounded-full backdrop-blur-md cursor-pointer transition-all text-xs font-mono z-30 group shadow-md"
                title="View Voice Support Command Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400 group-hover:text-fuchsia-400 transition-colors animate-pulse" />
                <span>Command Guide</span>
              </button>

              {/* Animated overlay details with Gemini mood pill */}
              <div className="absolute top-4 right-4 flex items-center gap-2 text-white/60 text-xs font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-md">
                <span className={`w-2.5 h-2.5 rounded-full transition-all duration-500 relative ${
                  isWakeWordListening 
                    ? "bg-[#214ef5] shadow-[0_0_12px_#214ef5] animate-pulse" 
                    : "bg-white/20"
                }`}>
                  {isWakeWordListening && (
                    <span className="absolute inset-0 rounded-full bg-[#214ef5] animate-ping opacity-75"></span>
                  )}
                </span>
                <span className="uppercase text-[9px] tracking-widest font-semibold text-neutral-300">
                  {isWakeWordListening ? "active listen" : "passive standby"}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center flex-1 my-8 relative">
                {/* Visual Audio Waveform Pulsator Sphere inside glass concentric rings */}
                <div className="relative flex items-center justify-center">
                  
                  {/* Dynamic Glowing Aura Background matching Gemini's fluid energy model with Royal Black, Royal Blue and Royal Red highlights */}
                  <div className={`absolute w-80 h-80 rounded-full opacity-45 filter blur-3xl transition-all duration-[1200ms] -z-10 bg-gradient-to-r ${
                    (isWakeWordListening || advisorStatus !== "idle") 
                      ? "from-[#0000FF] via-[#FFFFFF] to-[#FF0000]" 
                      : "from-[#0000FF]/35 to-[#FF0000]/35"
                  }`} />
                  
                  {/* Outer Concentric Ring with fine glass borders and Royal Blue shadow */}
                  <div className="w-68 h-68 rounded-full border border-[#0000FF]/25 flex items-center justify-center relative bg-black backdrop-blur-xl shadow-2xl">
                    
                    {/* Secondary ring - pulses in/out with voice states */}
                    <div className={`w-52 h-52 rounded-full border flex items-center justify-center transition-all duration-700 relative ${
                      (isWakeWordListening || advisorStatus !== "idle") 
                        ? "border-[#FF0000]/30 bg-black/50 shadow-[inset_0_0_20px_rgba(0,0,255,0.25)]" 
                        : "border-white/5 bg-black/25 shadow-[inset_0_0_25px_rgba(255,255,255,0.01)]"
                    }`}>
                      
                      {/* Interactive Touch Target Trigger Sphere (THE ORB) */}
                      <motion.div 
                        onClick={toggleWakeWordListening}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        className={`w-36 h-36 rounded-full flex items-center justify-center cursor-pointer transition-all duration-750 relative z-20 backdrop-blur-3xl shadow-2xl border-2 ${
                          (isWakeWordListening || advisorStatus !== "idle") 
                            ? "orb-active border-[#FFFFFF] shadow-[0_0_35px_rgba(255,255,255,0.8)]" 
                            : "orb-idle border-[#0000FF]/30 hover:border-[#FF0000]/40 shadow-[0_0_15px_rgba(0,0,255,0.15)]"
                        }`}
                      >
                        {/* Dynamic fluid gradient overlay inside the orb */}
                        <div className={`absolute inset-0 rounded-full opacity-40 transition-all duration-1000 -z-10 bg-gradient-to-tr ${
                          (isWakeWordListening || advisorStatus !== "idle") 
                            ? "from-[#0000FF] via-[#FFFFFF]/25 to-[#FF0000]" 
                            : "from-[#0000FF]/15 to-[#FF0000]/15"
                        }`} />

                        {/* Pure White glowing inner button core - matches Royal White styling */}
                        <div className={`absolute inset-8 rounded-full bg-[#FFFFFF] flex items-center justify-center shadow-[0_0_30px_#FFFFFF] transition-all duration-500 ${
                          (isWakeWordListening || advisorStatus !== "idle") ? "scale-90 opacity-100" : "scale-0 opacity-0"
                        }`}>
                          <Mic className="w-5 h-5 text-black animate-pulse" />
                        </div>
                        
                        {/* Passive standby mic off icon */}
                        <div className={`flex items-center justify-center transition-opacity duration-350 ${(isWakeWordListening || advisorStatus !== "idle") ? "opacity-0" : "opacity-100"}`}>
                          <MicOff className="w-8 h-8 text-white/80 hover:text-white" />
                        </div>
                      </motion.div>

                      {/* Floating ambient soundwave rings */}
                      {(isWakeWordListening || advisorStatus !== "idle") && (
                        <>
                          <div className="absolute inset-0 rounded-full border border-[#0000FF]/45 animate-ping opacity-40 pointer-events-none" style={{ animationDuration: '3.5s' }}></div>
                          <div className="absolute -inset-4 rounded-full border border-[#FF0000]/25 animate-ping opacity-25 pointer-events-none" style={{ animationDuration: '5s' }}></div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Absolute positioning badge for activation instructions on the button */}
                  <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-4 py-1.5 border rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-500 whitespace-nowrap bg-neutral-950 shadow-lg ${
                    isWakeWordListening 
                      ? "border-indigo-500/40 text-indigo-400 shadow-indigo-500/10" 
                      : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
                  }`}>
                    {isWakeWordListening ? "HEY SHADOW, ACTIVE VOICE" : "TAP ORB TO TRIGGER SHADOW"}
                  </div>
                </div>

                <div className="mt-9 text-center pb-2">
                  <h3 className="text-lg font-bold font-sans tracking-wide text-white uppercase tracking-widest gemini-text-pulse">
                    {advisorStatus === "idle" && "Awaiting Voice Command"}
                    {advisorStatus === "listening" && "Listening in Room..."}
                    {advisorStatus === "processing" && "Analyzing Assistive Environment..."}
                    {advisorStatus === "speaking" && "Broadcasting Real-time Response..."}
                  </h3>
                  <p className="text-xs font-mono text-neutral-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    {advisorStatus === "listening" 
                      ? "Speak your directive. SHADOW will navigate system, files, and auto sync." 
                      : "Click main orb above to initiate voice-activated cross-device controller."}
                  </p>
                </div>
              </div>

              {/* Speech properties toolbar controller with glass layout definitions */}
              <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-neutral-400">
                <button 
                  onClick={toggleWakeWordListening}
                  className={`px-3 py-1.5 rounded-full flex items-center gap-2 border transition-all ${
                    isWakeWordListening 
                      ? "bg-[#FF0000]/15 border-[#FF0000]/50 text-white shadow-[0_0_15px_rgba(255,0,0,0.35)] font-bold animate-pulse" 
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-300"
                  }`}
                >
                  {isWakeWordListening ? "Disable Wake Word Listener" : "Enable 'Hey Shadow' Microphones"}
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  {/* TTS dynamic speed rate controller */}
                  <div className="flex items-center gap-2 text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-neutral-300">
                    <span className="font-mono">Rate: {speechRate.toFixed(1)}x</span>
                    <input 
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-16 accent-[#0000FF] outline-none cursor-pointer h-1 rounded bg-white/20"
                      title="Adjust Speech synthesis speed"
                    />
                  </div>

                  {/* TTS Toggle configuration */}
                  <button 
                    onClick={() => {
                      setIsVoiceResponseEnabled(!isVoiceResponseEnabled);
                      if (isVoiceResponseEnabled) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`p-2 rounded-full border transition-all ${isVoiceResponseEnabled ? "bg-[#0000FF]/25 border-[#0000FF]/50 text-white" : "bg-white/5 border-white/10 text-neutral-500 hover:text-neutral-400"}`}
                    title={isVoiceResponseEnabled ? "Voice Output Active" : "Voice Output Silenced"}
                  >
                    {isVoiceResponseEnabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
                  </button>

                  {/* Speech System options */}
                  <select 
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="bg-black border border-white/10 p-1 px-2.5 rounded-full max-w-[150px] text-[10px] outline-none text-neutral-300 cursor-pointer"
                  >
                    {availableVoices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Scrolling Terminal Log Section */}
            <section className="bg-white/5 backdrop-blur-xl text-neutral-300 rounded-2xl border border-white/10 flex-1 flex flex-col h-[400px] overflow-hidden shadow-lg shadow-black/20">
              <div className="bg-black/40 p-3 px-4 border-b border-white/10 flex justify-between items-center text-[11px] font-mono uppercase tracking-widest text-[#214ef5]">
                <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Advisor Communication Log</span>
                <span className="text-white/30">Secure Direct Synced</span>
              </div>

              {/* Log view */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[350px]">
                <AnimatePresence initial={false}>
                  {assistantLogs.map((log, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs ${
                        log.role === 'user' 
                          ? 'border-l-2 border-[#ea3323] pl-2.5 bg-[#ea3323]/5 py-2 rounded-r-xl' 
                          : log.role === 'model' 
                            ? 'border-l-2 border-[#214ef5] pl-2.5 bg-[#214ef5]/5 py-2 rounded-r-xl' 
                            : 'text-neutral-500 text-center font-mono my-2'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono text-neutral-600 mb-1">
                        <span className="uppercase text-neutral-500 font-bold">
                          {log.role === 'user' ? 'YOU / VOICE INPUT' : log.role === 'model' ? 'SHADOW ASSIST_AGENT' : 'CORE SYS'}
                        </span>
                        <span>{log.time}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed select-text font-mono text-neutral-200">
                        {log.text}
                      </p>
                    </motion.div>
                  ))}
                  {isPending && (
                    <div className="border-l-2 border-[#214ef5] pl-2.5 bg-[#214ef5]/5 py-2.5 animate-pulse font-mono text-xs rounded-r-xl">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold">SHADOW Agent Thinking...</span>
                      <p className="mt-1 text-neutral-400">Navigating phone & desktop environment streams...</p>
                    </div>
                  )}
                </AnimatePresence>
                <div ref={terminalBottomRef}></div>
              </div>

              {/* Standard text query fallback input form with brand accents */}
              <form onSubmit={handleQueryFormSubmit} className="p-3 bg-black border-t border-white/10 flex gap-2">
                <input 
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ask advisor or coordinate workspace commands here..."
                  className="bg-white/5 text-white placeholder-white/20 outline-none p-2.5 rounded-xl border border-white/10 flex-1 text-xs font-mono focus:border-[#0000FF] focus:bg-white/10 transition-all font-bold"
                />
                <button 
                  type="submit"
                  disabled={isPending || !queryInput.trim()}
                  className="p-2.5 bg-gradient-to-r from-[#0000FF] via-[#FFFFFF]/25 to-[#FF0000] text-white hover:opacity-100 font-bold px-4 text-xs font-sans rounded-xl transition-all shadow-md shadow-[#0000FF]/25 disabled:opacity-40 disabled:bg-none disabled:from-neutral-800 disabled:to-neutral-900 disabled:text-neutral-500 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-white animate-pulse" />
                </button>
              </form>
            </section>

          </div>

          {/* RIGHT AREA: Collapsible Sidebar containing Google Workspace cloud organizers & status utilities */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.35 }}
                className="lg:col-span-4 xl:col-span-5 flex flex-col gap-6"
              >
                {/* 0. System Accessibility & Theme Settings (Moved to Sidebar) */}
                <section className="bg-black border-2 border-[#0000FF]/30 hover:border-[#FF0000]/40 rounded-2xl p-4 shadow-xl transition-all duration-300 relative overflow-hidden">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3.5">
                    <div>
                      <h3 className="text-xs font-bold font-sans text-white uppercase tracking-wider flex items-center gap-1.5 font-bold animate-pulse">
                        <Settings className="w-3.5 h-3.5 text-[#0000FF]" /> System Accessibility & theme
                      </h3>
                      <p className="text-[9px] font-mono text-white/45">Configure high contrast themes & voice rates</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Midnight Theme Switch */}
                    <div className="flex items-center justify-between py-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">High Contrast Midnight</p>
                        <p className="text-[9px] font-mono text-white/40 leading-tight">Increases text legibility and outline contrast</p>
                      </div>
                      <button
                        onClick={toggleMidnightTheme}
                        className={`relative w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${isMidnightTheme ? 'bg-[#FF0000]' : 'bg-white/10'}`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 bg-white rounded-full shadow-md pointer-events-none"
                          animate={{ x: isMidnightTheme ? 18 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Speech response toggler */}
                    <div className="flex items-center justify-between py-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">Voice Synthesizer Output</p>
                        <p className="text-[9px] font-mono text-white/40 leading-tight">Read back all text output automatically</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsVoiceResponseEnabled(!isVoiceResponseEnabled);
                          if (isVoiceResponseEnabled && typeof window !== "undefined" && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                          }
                        }}
                        className={`relative w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${isVoiceResponseEnabled ? 'bg-[#0000FF]' : 'bg-white/10'}`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 bg-white rounded-full shadow-md pointer-events-none"
                          animate={{ x: isVoiceResponseEnabled ? 18 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Speech rate slider */}
                    <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                        <span className="text-neutral-300 uppercase">Speed Rate:</span>
                        <span className="text-[#0000FF] bg-white/5 px-2 py-0.5 rounded text-[9px] border border-white/10 font-bold">{speechRate}x speed</span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#0000FF]"
                      />
                    </div>

                    {/* Selected voice dropdown */}
                    <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-neutral-300 uppercase block">Selected Voice Synth:</span>
                      <select 
                        value={selectedVoiceName}
                        onChange={(e) => setSelectedVoiceName(e.target.value)}
                        className="w-full bg-black border border-white/10 p-2 rounded-xl text-xs outline-none text-neutral-300 cursor-pointer"
                      >
                        {availableVoices.map(v => (
                          <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Task Productivity Overview Donut Chart Section */}
                {(() => {
                  const todoCount = tasks.filter(t => t.status === 'todo').length;
                  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
                  const doneCount = tasks.filter(t => t.status === 'done').length;
                  const totalTasks = todoCount + inProgressCount + doneCount;
                  
                  const data = [
                    { name: 'To Do', value: todoCount, color: '#FF0000' },
                    { name: 'In Progress', value: inProgressCount, color: '#0000FF' },
                    { name: 'Completed', value: doneCount, color: '#FFFFFF' }
                  ];

                  return (
                    <section className="bg-black/95 border-2 border-[#0000FF]/30 hover:border-[#FF0000]/40 rounded-2xl p-4 shadow-xl transition-all duration-300 relative overflow-hidden">
                      <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3.5">
                        <div>
                          <h3 className="text-xs font-bold font-sans text-white uppercase tracking-wider flex items-center gap-1.5 font-bold animate-pulse">
                            <TrendingUp className="w-3.5 h-3.5 text-[#0000FF]" /> Task Productivity Overview
                          </h3>
                          <p className="text-[9px] font-mono text-white/45">Real-time status metrics of task delivery</p>
                        </div>
                      </div>
                      
                      {totalTasks > 0 ? (
                        <div className="grid grid-cols-12 items-center gap-4">
                          {/* Left: Donut Chart */}
                          <div className="col-span-7 h-[140px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={data.filter(d => d.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={35}
                                  outerRadius={50}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {data.filter(d => d.value > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#000000', 
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px'
                                  }}
                                  itemStyle={{ color: '#ffffff', fontSize: '10px', fontFamily: 'monospace' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            {/* Centered Number Indicator */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[16px] font-sans font-black text-white">{totalTasks}</span>
                              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Total</span>
                            </div>
                          </div>

                          {/* Right: Legend & Metric Breakdown */}
                          <div className="col-span-5 flex flex-col gap-2">
                            {data.map((item) => {
                              const percentage = totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0;
                              return (
                                <div key={item.name} className="flex flex-col bg-white/[0.02] p-1.5 border border-white/5 rounded-xl">
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <div className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full ring-1 ring-white/10" style={{ backgroundColor: item.color }} />
                                      <span className="text-[9px] font-mono text-neutral-300 font-bold truncate max-w-[55px]" title={item.name}>{item.name}</span>
                                    </div>
                                    <span className="text-[10px] font-semibold text-white font-sans">{item.value}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[8px] font-mono text-white/35">
                                    <span>Ratio</span>
                                    <span>{percentage}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-16 h-16 mx-auto mb-2 border-2 border-dashed border-white/15 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white/20" />
                          </div>
                          <p className="text-[10px] font-mono text-white/40 mb-1">No tasks tracked yet</p>
                          <p className="text-[8px] font-mono text-white/20">Add some goals to populate metrics</p>
                        </div>
                      )}
                    </section>
                  );
                })()}

                {/* 1. Recent Assistive Directives & Custom Voice Memo Recorder (Moved to Sidebar) */}
                <section className="bg-black/90 border-2 border-[#0000FF]/30 hover:border-[#FF0000]/40 rounded-2xl p-4 shadow-xl transition-all duration-300 relative overflow-hidden">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3.5">
                    <div>
                      <h3 className="text-xs font-bold font-sans text-white uppercase tracking-wider flex items-center gap-1.5 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-[#0000FF] animate-pulse" /> Assistive Directives
                      </h3>
                      <p className="text-[9px] font-mono text-white/45">Quick execution & voice playback shortcuts</p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          localStorage.setItem("workspace_recent_voice_commands", JSON.stringify(DEFAULT_RECENT_COMMANDS));
                          setRecentCommands(DEFAULT_RECENT_COMMANDS);
                        }
                      }}
                      className="text-[9px] font-mono text-[#FF0000] hover:text-white transition-colors uppercase font-black tracking-wider cursor-pointer"
                      title="Reset list to default shortcuts"
                    >
                      Reset
                    </button>
                  </div>

                  {/* List of shortcuts */}
                  <div className="space-y-1.5 max-h-[175px] overflow-y-auto pr-1 scrollbar-thin">
                    {recentCommands.map((cmd, idx) => {
                      const displayTitle = cmd.replace(/^Hey Shadow,\s*/i, "");
                      const isPlaying = playingCommandId === cmd;
                      const isCustomMemo = !!commandRecordings[cmd];
                      return (
                        <div
                          key={idx}
                          className="bg-white/5 border border-white/5 hover:border-[#0000FF]/40 rounded-xl flex items-center justify-between p-1.5 px-2.5 transition-all shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setAssistantLogs(prev => [
                                ...prev,
                                { role: "user", text: `[Triggered Recent] "${cmd}"`, time: new Date().toLocaleTimeString() }
                              ]);
                              submitShadowQuery(cmd, isVoiceResponseEnabled, 'shortcut');
                            }}
                            className="flex items-center gap-2 text-[10px] font-mono text-neutral-300 hover:text-white truncate cursor-pointer text-left flex-1"
                            title={`Run directive: ${cmd}`}
                          >
                            <Play className="w-2.5 h-2.5 text-[#0000FF] shrink-0 animate-pulse" />
                            <span className="className font-bold truncate max-w-[155px]">{displayTitle}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePlayVoiceCommand(cmd)}
                            className={`p-1 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                              isPlaying 
                                ? "bg-[#0000FF]/15 text-[#0000FF] border border-[#0000FF]/25 animate-pulse" 
                                : isCustomMemo
                                  ? "text-emerald-400 hover:bg-emerald-500/10"
                                  : "text-white/40 hover:text-[#0000FF] hover:bg-white/5"
                            }`}
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? "animate-bounce" : ""}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Memo recorder bar */}
                  <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isRecordingVoiceCommand ? 'bg-[#FF0000] animate-ping' : 'bg-white/20'}`} />
                      <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider font-bold">
                        {isRecordingVoiceCommand ? 'Recording...' : 'Memo Recorder'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRecordingVoiceCommand ? (
                        <>
                          <span className="text-[9px] font-mono text-rose-500 animate-pulse font-bold bg-[#FF0000]/10 px-1.5 py-0.5 rounded border border-[#FF0000]/20">
                            {recordingSeconds}s
                          </span>
                          <button
                            type="button"
                            onClick={handleStopVoiceRecording}
                            className="bg-[#FF0000]/20 hover:bg-[#FF0000]/30 border border-[#FF0000]/30 text-[#FF0000] text-[9px] font-mono px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold animate-pulse cursor-pointer"
                          >
                            <Square className="w-2 h-2 fill-rose-300" /> Stop & Save
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartVoiceRecording}
                          className="bg-[#0000FF]/10 hover:bg-[#0000FF]/25 border border-[#0000FF]/20 text-[#0000FF] text-[9px] font-mono px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-bold transition-all cursor-pointer"
                        >
                          <Mic className="w-2.5 h-2.5" /> Record Memo
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2. Immersive Camera Snap and Multimodal Image Analysis Panel */}
                <section className="bg-black border-2 border-[#0000FF]/30 hover:border-[#FF0000]/40 rounded-2xl p-4 shadow-xl transition-all duration-300 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                    <div>
                      <h3 className="text-xs font-bold font-sans flex items-center gap-1.5 text-white uppercase tracking-wider">
                        <Camera className="w-3.5 h-3.5 text-[#FF0000]" /> 
                        Live Snapshot Analysis
                      </h3>
                      <p className="text-[9px] font-mono text-white/45">Scan physical surroundings for workspace optimization</p>
                    </div>
                    
                    <button 
                      onClick={toggleCamera}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-mono border transition-all flex items-center gap-1 font-bold cursor-pointer ${
                        isCameraActive 
                          ? "bg-[#FF0000]/15 border-[#FF0000]/50 text-white animate-pulse" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-300"
                      }`}
                    >
                      {isCameraActive ? <CameraOff className="w-3 h-3 text-[#FF0000]" /> : <Camera className="w-3 h-3 text-[#0000FF]" />}
                      <span>{isCameraActive ? "Close lens" : "Lens Active"}</span>
                    </button>
                  </div>

                  {/* Interactive stream interface */}
                  {isCameraActive ? (
                    <div className="flex flex-col gap-3">
                      <div className="w-full aspect-video bg-black border border-white/10 rounded-xl overflow-hidden relative">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/98 px-2 py-1 text-[9px] text-[#FF0000] font-mono rounded-full border border-white/10 uppercase tracking-widest animate-pulse font-bold">
                          Live Stream
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={captureAndAnalyzeSnapshot}
                          className="flex-1 py-2 bg-gradient-to-r from-[#0000FF] to-[#FF0000] text-white hover:opacity-100 font-sans font-bold text-[10px] rounded-lg transition-all shadow-md shadow-[#0000FF]/20 cursor-pointer uppercase tracking-wider text-center"
                        >
                          Analyze surroundings
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-white/[0.01] rounded-xl flex flex-col items-center justify-center border border-dashed border-white/10 p-4 text-center text-neutral-500">
                      <Camera className="w-7 h-7 mb-1 opacity-30 text-[#FF0000]" />
                      <p className="text-[10px] font-mono text-white/50 leading-tight">Lens is locked to protect room privacy.</p>
                      <p className="text-[9px] font-mono text-neutral-600 mt-1 max-w-[200px] leading-tight">Click "Lens Active" to preview surrounding physical streams locally.</p>
                    </div>
                  )}

                  {/* Analysis Text logger description */}
                  <div className="mt-3.5 text-[9px] font-mono text-white/50 bg-white/5 p-2.5 border border-white/10 rounded-xl">
                    <span className="text-white/30 uppercase tracking-widest block mb-1 font-bold">CAMERA OS STATUS:</span>
                    <span className="text-neutral-300 font-bold">{cameraStatus}</span>
                  </div>
                </section>

                {/* Real-time Workspace connected Inspect deck */}
                <section className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-lg">
              <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#214ef5]" /> Google Workspace Deck
                  </h3>
                  <p className="text-[10px] font-mono text-white/40">Real-time inspection of your cloud services</p>
                </div>

                <button 
                  onClick={fetchWorkspacePreview}
                  disabled={isWorkspaceFetching}
                  className="p-1.5 px-3 bg-[#214ef5]/10 border border-[#214ef5]/30 hover:bg-[#214ef5]/20 transition-all font-mono text-[10px] text-[#214ef5] font-bold rounded-full cursor-pointer disabled:opacity-40"
                >
                  {isWorkspaceFetching ? "Refreshing..." : "Query Sync"}
                </button>
              </div>

              {/* Real-time Calendar Auto-Sync control toggler */}
              <div className="mb-4 bg-white/5 border border-white/5 p-2.5 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isCalendarAutoSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                  <div>
                    <p className="text-[10px] font-sans font-bold text-white uppercase tracking-wider">
                      Calendar Sync Status
                    </p>
                    <p className="text-[9px] font-mono text-white/45">
                      {isCalendarAutoSyncEnabled ? "Real-time sync: Active (60s timer)" : "Paused: Disabled to preserve Google API quota"}
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={toggleCalendarAutoSync}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono border font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    isCalendarAutoSyncEnabled 
                      ? "bg-emerald-400/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" 
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {isCalendarAutoSyncEnabled ? "Enabled" : "Paused"}
                </button>
              </div>

              {/* Workspace Inspectors */}
              <div className="space-y-4">
                {/* Emails listing */}
                <div>
                  <h4 className="text-xs font-bold font-sans text-white/80 flex items-center gap-1.5 mb-2">
                    <Mail className="w-3.5 h-3.5 text-[#214ef5]" /> Secure Mailbox Inspect
                  </h4>
                  {workspaceEmails.length > 0 ? (
                    <div className="space-y-1.5">
                      {workspaceEmails.map(mail => (
                        <div key={mail.id} className="bg-white/5 p-3 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                          <div className="flex justify-between text-white/40 font-mono text-[9px] mb-1">
                            <span className="max-w-[150px] truncate">{mail.from}</span>
                          </div>
                          <p className="font-bold text-neutral-200 truncate text-xs">{mail.subject}</p>
                          <p className="text-white/45 truncate text-[10px] mt-0.5">{mail.snippet}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-white/30 italic pl-1">No mailbox updates retrieved or queried. Ask Shadow to list your emails!</p>
                  )}
                </div>

                {/* Calendar Events */}
                <div>
                  <h4 className="text-xs font-bold font-sans text-white/80 flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Active Calendar Grid
                  </h4>
                  {workspaceEvents.length > 0 ? (
                    <div className="space-y-1.5">
                      {workspaceEvents.map(evt => (
                        <div key={evt.id} className="bg-white/5 p-3 border border-white/5 rounded-xl hover:bg-white/10 transition-colors flex justify-between gap-1.5 items-center">
                          <div className="truncate">
                            <p className="font-bold text-[#ea3323] truncate text-xs">{evt.summary}</p>
                            <p className="text-white/45 text-[10px] mt-0.5">Upcoming meeting block</p>
                          </div>
                          <div className="text-[9px] font-mono text-neutral-200 whitespace-nowrap bg-[#214ef5]/10 border border-white/10 p-1 px-2 rounded-full self-start">
                            {new Date(evt.start).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-white/30 italic pl-1">No schedules returned or queried. Ask Shadow to view your calendar!</p>
                  )}
                </div>

                {/* Drive Files */}
                <div>
                  <h4 className="text-xs font-bold font-sans text-white/80 flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5 text-amber-400" /> Drive File Browser
                  </h4>
                  {workspaceFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {workspaceFiles.map(file => (
                        <div key={file.id} className="bg-white/5 p-3 border border-white/5 rounded-xl hover:bg-white/10 transition-colors flex justify-between items-center">
                          <span className="font-sans font-bold text-neutral-200 truncate flex-1 text-xs">{file.name}</span>
                          <span className="text-[9px] font-mono text-white/40 uppercase ml-2 select-all font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                            {file.mimeType.includes("spreadsheet") ? "Sheet" : "Doc"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-white/30 italic pl-1">No secure drive assets listed. Ask Shadow to search drive assets!</p>
                  )}
                </div>
              </div>

              {/* Workspace Command Shortcuts */}
              <div className="border-t border-white/10 pt-3 mt-4">
                <span className="text-[10px] font-mono text-white/30 uppercase block mb-2">SHADOW System Directives:</span>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                  <button onClick={() => triggerShortcutQuestion("Hey Shadow, open my documents folder")} className="px-3 py-1.5 bg-white/5 hover:bg-white/15 rounded-full text-white/80 select-none transition-colors border border-white/10">Open Documents</button>
                  <button onClick={() => triggerShortcutQuestion("Hey Shadow, check phone battery and notifications")} className="px-3 py-1.5 bg-white/5 hover:bg-white/15 rounded-full text-white/80 select-none transition-colors border border-[#ea3323]/20">Check Phone</button>
                  <button onClick={() => triggerShortcutQuestion("Hey Shadow, open system settings panel")} className="px-3 py-1.5 bg-white/5 hover:bg-white/15 rounded-full text-white/80 select-none transition-colors border border-white/10">System Settings</button>
                  <button onClick={() => triggerShortcutQuestion("Hey Shadow, browse the internet for recent news")} className="px-3 py-1.5 bg-white/5 hover:bg-white/15 rounded-full text-white/80 select-none transition-colors border border-white/10">Browse News</button>
                </div>
              </div>
            </section>

            {/* Tasks Collection Board Card */}
            <section className="bg-white/5 backdrop-blur-xl text-neutral-300 rounded-2xl border border-white/10 p-5 flex flex-col shadow-lg">
              {(() => {
                const completedTasks = tasks.filter(t => t.status === "done").length;
                const totalTasks = tasks.length;
                const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                const categoryCounts = tasks.reduce((acc: Record<string, number>, t) => {
                  const cat = t.category || "Work";
                  acc[cat] = (acc[cat] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const hasTasks = totalTasks > 0;
                const chartData = hasTasks 
                  ? ["Work", "Personal", "Urgent", "Idea", "General"].map(cat => ({
                      name: cat,
                      value: categoryCounts[cat] || 0
                    })).filter(item => item.value > 0)
                  : [{ name: "No tasks", value: 1 }];

                const CATEGORY_COLORS: Record<string, string> = {
                  Work: "#214ef5",
                  Personal: "#a855f7",
                  Urgent: "#ea3323",
                  Idea: "#f59e0b",
                  General: "#10b981",
                  "No tasks": "#3f3f46"
                };

                return (
                  <>
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                      {/* Left Block */}
                      <div className="flex-1 space-y-3 w-full">
                        <div>
                          <h3 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-1.5">
                            <ListTodo className="w-4 h-4 text-[#ea3323]" /> Tasks Sync Matrix
                          </h3>
                          <p className="text-[10px] font-mono text-white/40">Durable cloud synced todo manager</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleExportToCSV}
                            title="Export current filtered tasks to CSV"
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-mono px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Download className="w-3 h-3 text-[#ea3323]" />
                            Export CSV
                          </button>
                          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">
                            {taskPercentage}% Complete
                          </div>
                          <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#ea3323]">
                            {completedTasks}/{totalTasks} Nodes Completed
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Dynamic Desktop & Mobile Connection Status Toggles to assist with disabilities */}
                      <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full lg:w-auto min-w-[320px] xl:min-w-[420px]">
                        {/* Desktop Connection Card */}
                        <div className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl flex flex-col justify-between gap-1.5 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                              Desktop Env
                            </span>
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
                              Connected
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-white/50">
                              <span>File System Access:</span>
                              <span className="text-emerald-400 font-bold">Granted</span>
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-white/50">
                              <span>API Bridge Status:</span>
                              <span className="text-emerald-400 font-bold">Connected</span>
                            </div>
                          </div>
                          <div className="border-t border-white/5 pt-1.5 flex justify-between items-center text-[8px] font-mono text-white/30">
                            <span>Port: 3000 / localhost</span>
                            <span>v1.0.4-local</span>
                          </div>
                        </div>

                        {/* Mobile Phone Connection Card */}
                        <div className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl flex flex-col justify-between gap-1.5 shadow-inner">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                              Mobile Phone
                            </span>
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
                              Connected
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-white/50">
                              <span>OS API Bridge:</span>
                              <span className="text-emerald-400 font-bold">Connected</span>
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-white/50">
                              <span>Disability Assist Mode:</span>
                              <span className="text-emerald-400 font-bold">Granted</span>
                            </div>
                          </div>
                          <div className="border-t border-white/5 pt-1.5 flex justify-between items-center text-[8px] font-mono text-white/30">
                            <span>Type: BLE / Wi-Fi Sync</span>
                            <span>Battery: 84%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Completion progress bar */}
                    <div className="mb-4 bg-white/5 border border-white/5 p-2 px-3 rounded-xl flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-wider text-white/40">
                        <span>Sync Matrix Ratio</span>
                        <span className="text-emerald-400 font-bold">{taskPercentage}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#ea3323] via-indigo-500 to-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${taskPercentage}%` }}
                          transition={{ type: "spring", stiffness: 80 }}
                        />
                      </div>
                    </div>

                    {/* Browser Notifications Controller */}
                    <div className="mb-4 bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        {notificationPermission === "granted" ? (
                          <Bell className="w-4 h-4 text-emerald-400 animate-pulse" />
                        ) : (
                          <BellOff className="w-4 h-4 text-white/30" />
                        )}
                        <div>
                          <p className="text-[10px] font-sans font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            Browser Task Alerts
                          </p>
                          <p className="text-[9px] font-mono text-white/40 leading-none mt-0.5">
                            {notificationPermission === "granted" 
                              ? "Active: Urgent task alerts are active" 
                              : notificationPermission === "denied"
                              ? "Blocked: Reset browser permission to authorize"
                              : "Default: Requires manual activation"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {notificationPermission !== "granted" ? (
                          <button
                            type="button"
                            onClick={handleRequestNotificationPermission}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/20 text-[10px] font-mono px-3 py-1 rounded-lg font-bold transition-all hover:scale-[1.02] cursor-pointer"
                          >
                            Activate Alerts
                          </button>
                        ) : (
                          <span className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-lg uppercase font-bold tracking-wider select-none">
                            System Enabled
                          </span>
                        )}
                        <span className="text-[8px] font-mono text-white/20 select-none block max-w-[120px] leading-tight">
                          *If in preview, open in new tab to prompt
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Fast task adder inside Firestore */}
              <form onSubmit={handleAddNewTask} className="mb-4 bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-3">
                <input 
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono outline-none text-white placeholder-white/30 rounded-xl focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                />
                <div className="flex gap-2">
                  <input 
                     type="text"
                     value={newTaskDesc}
                     onChange={(e) => setNewTaskDesc(e.target.value)}
                     placeholder="Short description (optional)..."
                     className="flex-1 bg-white/5 border border-white/10 p-2 text-xs font-mono outline-none text-white placeholder-white/30 rounded-xl focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                  />
                  <button 
                    type="submit"
                    className="p-2 bg-gradient-to-r from-[#ea3323] to-[#a855f7] hover:opacity-90 text-white font-sans font-bold text-xs rounded-xl px-4 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Task Category Assignment Segment */}
                <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Assign Category:</span>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {["Work", "Personal", "Urgent", "Idea", "General", "Custom"].map((cat) => {
                      const isActive = newTaskCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewTaskCategory(cat)}
                          className={`px-2.5 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                            isActive
                              ? cat === "Urgent"
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.15)] font-bold"
                                : cat === "Work"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-bold"
                                : cat === "Personal"
                                ? "bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-bold"
                                : cat === "Idea"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-bold"
                                : cat === "Custom"
                                ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.15)] font-bold animate-pulse"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.15)] font-bold"
                              : "bg-white/5 text-white/40 border-white/5 hover:border-white/10 hover:text-white"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic Custom Category Text Input Field */}
                  {newTaskCategory === "Custom" && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex flex-col gap-1"
                    >
                      <label className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                        Custom Category Name:
                      </label>
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="e.g. Finance, Goals, Design..."
                        className="w-full bg-white/5 border border-indigo-500/30 p-1.5 px-2.5 text-xs font-mono outline-none text-white placeholder-white/20 rounded-xl focus:border-indigo-500 focus:bg-white/10 transition-all"
                        autoFocus
                      />
                    </motion.div>
                  )}
                </div>

                {/* Task Priority Assignment Segment */}
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Assign Priority:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-white/50 uppercase font-bold tracking-wider">Mark Urgent</span>
                      <button
                        type="button"
                        onClick={() => setNewTaskPriority(newTaskPriority === "high" ? "medium" : "high")}
                        className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${newTaskPriority === "high" ? 'bg-[#FF0000]' : 'bg-white/10'}`}
                      >
                        <motion.div
                          layout
                          className="w-3.5 h-3.5 bg-white rounded-full shadow-md pointer-events-none"
                          animate={{ x: newTaskPriority === "high" ? 12 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-0.5">
                    {(["low", "medium", "high"] as const).map((pri) => {
                      const isActive = newTaskPriority === pri;
                      return (
                        <button
                          key={pri}
                          type="button"
                          onClick={() => setNewTaskPriority(pri)}
                          className={`flex-1 py-1.5 text-[10px] font-mono rounded-lg border transition-all cursor-pointer capitalize ${
                            isActive
                              ? pri === "high"
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.15)] font-bold"
                                : pri === "medium"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.15)] font-bold"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.15)] font-bold"
                              : "bg-white/5 text-white/40 border-white/5 hover:border-white/10 hover:text-white"
                          }`}
                        >
                          {pri}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Due Date Input Segment */}
                <div className="flex flex-col gap-1 pt-2.5 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Optional Due Date:</span>
                    {newTaskDueDate && (
                      <button 
                        type="button" 
                        onClick={() => setNewTaskDueDate("")} 
                        className="text-[9px] font-mono text-rose-400 hover:underline cursor-pointer"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>
                  <input 
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono outline-none text-white rounded-xl focus:border-indigo-500/50 focus:bg-white/10 transition-all cursor-pointer [color-scheme:dark]"
                  />
                </div>
              </form>

              {/* Real-time search/filter bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="text"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder="Filter tasks by title, description or category..."
                  className="w-full bg-white/5 border border-white/10 pl-10 pr-10 py-2.5 text-xs font-mono outline-none text-white placeholder-white/30 rounded-xl focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-[0_0_15px_rgba(99,102,241,0.02)]"
                />
                {taskSearchQuery && (
                  <button 
                    type="button"
                    onClick={() => setTaskSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Advanced inline status & due date selectors */}
              <div className="grid grid-cols-2 gap-2 mb-3 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-1">Filter Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 text-[11px] font-mono text-white/80 p-1.5 rounded-lg focus:border-indigo-500/50 outline-none cursor-pointer [color-scheme:dark]"
                  >
                    <option value="all">All States</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-1">Filter Due:</span>
                  <select
                    value={dueDateFilter}
                    onChange={(e: any) => setDueDateFilter(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 text-[11px] font-mono text-white/80 p-1.5 rounded-lg focus:border-indigo-500/50 outline-none cursor-pointer [color-scheme:dark]"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Category Filter Pills Row (Integrated Visual Badges Tracker with Auto-Discovered Custom Domains) */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 border-b border-white/5 pb-3">
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest mr-1">Filter Domain:</span>
                {(() => {
                  const defaultCats = ["All", "Work", "Personal", "Urgent", "Idea", "General"];
                  const dynamicCats = [...defaultCats];
                  tasks.forEach(t => {
                    const cat = t.category;
                    if (cat && !dynamicCats.includes(cat)) {
                      dynamicCats.push(cat);
                    }
                  });
                  return dynamicCats.map((filterCat) => {
                    const isActive = selectedCategoryFilter === filterCat;
                    let colorClasses = "bg-white/5 text-white/60 border-white/5 hover:border-white/10 hover:text-white";
                    if (isActive) {
                      if (filterCat === "All") colorClasses = "bg-white text-black border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.1)]";
                      else if (filterCat === "Work") colorClasses = "bg-blue-500/25 text-blue-300 border-blue-500/40 font-bold shadow-[0_0_10px_rgba(59,130,246,0.15)]";
                      else if (filterCat === "Personal") colorClasses = "bg-purple-500/25 text-purple-300 border-purple-500/40 font-bold shadow-[0_0_10px_rgba(168,85,247,0.15)]";
                      else if (filterCat === "Urgent") colorClasses = "bg-rose-500/25 text-rose-300 border-rose-500/40 font-bold shadow-[0_0_10px_rgba(244,63,94,0.15)]";
                      else if (filterCat === "Idea") colorClasses = "bg-amber-500/25 text-amber-300 border-amber-500/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.15)]";
                      else if (filterCat === "General") colorClasses = "bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]";
                      else {
                        // Dynamic styling for custom categories in filter selection row
                        let hash = 0;
                        for (let i = 0; i < filterCat.length; i++) {
                          hash = filterCat.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        const customColors = [
                          "bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]",
                          "bg-fuchsia-500/25 text-fuchsia-300 border-fuchsia-500/40 shadow-[0_0_10px_rgba(217,70,239,0.25)]",
                          "bg-pink-500/25 text-pink-300 border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.25)]",
                          "bg-orange-500/25 text-orange-300 border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.25)]",
                          "bg-yellow-500/25 text-yellow-300 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.25)]",
                          "bg-indigo-500/25 text-indigo-300 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                        ];
                        const index = Math.abs(hash) % customColors.length;
                        colorClasses = `${customColors[index]} font-bold`;
                      }
                    }
                    return (
                      <button
                        key={filterCat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(filterCat)}
                        className={`px-3 py-1 rounded-full text-[10px] font-mono border transition-all cursor-pointer ${colorClasses}`}
                      >
                        {filterCat}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Task Grid lists */}
              <motion.div 
                animate={advisorStatus === "speaking" ? {
                  scale: [1, 1.006, 1],
                  boxShadow: [
                    "0 0 0px rgba(33, 78, 245, 0)",
                    "0 0 20px rgba(33, 78, 245, 0.2)",
                    "0 0 0px rgba(33, 78, 245, 0)"
                  ],
                  backgroundColor: ["rgba(0, 0, 0, 0)", "rgba(33, 78, 245, 0.02)", "rgba(0, 0, 0, 0)"]
                } : {
                  scale: 1,
                  boxShadow: "0 0 0px rgba(0,0,0,0)",
                  backgroundColor: "rgba(0, 0, 0, 0)"
                }}
                transition={advisorStatus === "speaking" ? {
                  repeat: Infinity,
                  duration: 2.4,
                  ease: "easeInOut"
                } : undefined}
                className={`grid gap-2.5 max-h-[300px] overflow-y-auto rounded-2xl p-1.5 ${
                  statusFilter === "all"
                    ? "grid-cols-1 md:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {/* ToDo column */}
                {(statusFilter === "all" || statusFilter === "todo") && (
                  <div 
                    onDragOver={(e) => handleDragOver(e, 'todo')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'todo')}
                    className={`p-2.5 rounded-2xl border transition-all duration-200 ${
                      activeDragCol === 'todo' 
                        ? "bg-[#ea3323]/10 border-dashed border-[#ea3323]/50 shadow-[0_0_15px_rgba(234,51,35,0.15)] scale-[1.01]" 
                        : "bg-black/30 border-white/5"
                    }`}
                  >
                    <h5 className="text-[10px] font-mono uppercase bg-[#ea3323]/10 p-1.5 rounded-lg font-bold text-[#ea3323] text-center mb-2">To Do</h5>
                    <div className="space-y-1.5">
                      {(() => {
                        const todoTasks = tasks.filter(t => t.status === "todo").filter(t => {
                          // Category filter
                          if (selectedCategoryFilter !== "All" && (t.category || "Work") !== selectedCategoryFilter) return false;
                          
                          // Due date range filter
                          if (dueDateFilter !== "all") {
                            if (!t.dueDate) return false;
                            try {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const due = new Date(t.dueDate);
                              due.setHours(0, 0, 0, 0);
                              if (dueDateFilter === "today") {
                                if (due.getTime() !== today.getTime()) return false;
                              } else if (dueDateFilter === "week") {
                                const nextWeek = new Date(today);
                                nextWeek.setDate(today.getDate() + 7);
                                if (due < today || due > nextWeek) return false;
                              } else if (dueDateFilter === "overdue") {
                                if (!isTaskOverdue(t)) return false;
                              }
                            } catch (err) {
                              return false;
                            }
                          }

                          // Text filter
                          if (!taskSearchQuery) return true;
                          const q = taskSearchQuery.toLowerCase();
                          return (t.title && t.title.toLowerCase().includes(q)) || 
                                 (t.description && t.description.toLowerCase().includes(q)) ||
                                 (t.category && t.category.toLowerCase().includes(q));
                        });

                        return todoTasks.length > 0 ? (
                          <AnimatePresence mode="popLayout" initial={false}>
                            {todoTasks.map(t => {
                              const isOverdue = isTaskOverdue(t);
                              return (
                                <motion.div 
                                  layout
                                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                  key={t.id} 
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, t.id)}
                                  onDragEnd={handleDragEnd}
                                  className={`p-2 px-3 border rounded-xl group flex flex-col justify-between transition-all cursor-grab active:cursor-grabbing ${
                                    isOverdue 
                                      ? "bg-rose-950/25 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)] hover:bg-rose-950/35 overdue-pulse" 
                                      : "bg-white/5 border-white/5 hover:bg-white/10"
                                  } ${
                                    draggingTaskId === t.id ? "opacity-30 border-dashed scale-95" : ""
                                  }`}
                                >
                                  <div className="truncate">
                                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                                      <p className="text-[11px] font-sans font-bold text-white truncate flex-1">{t.title}</p>
                                      {t.priority && (
                                        <span 
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-mono rounded font-bold uppercase ${
                                            t.priority === "high"
                                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                              : t.priority === "medium"
                                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                          }`}
                                          title={`Priority: ${t.priority}`}
                                        >
                                          <Flag className="w-2 h-2 fill-current" />
                                          {t.priority}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[9px] font-mono text-white/40 truncate">{t.description || "No description"}</p>
                                    
                                    {/* Distinct Category and Due Date Badge */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCategoryFilter(t.category || "General");
                                        }}
                                        className={`px-2 py-0.5 text-[9px] font-mono border rounded cursor-pointer transition-all hover:brightness-125 uppercase tracking-wider font-semibold ${getCategoryStyles(t.category || "General")}`}
                                      >
                                        {t.category || "General"}
                                      </button>

                                      {t.dueDate && (
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-medium px-2 py-0.5 border rounded select-none ${
                                          isOverdue 
                                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse font-bold" 
                                            : "bg-white/5 text-white/50 border-white/15"
                                        }`}>
                                          <Calendar className="w-2.5 h-2.5" />
                                          {t.dueDate}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-1 mt-2 border-t border-white/10 pt-1.5">
                                  <button 
                                    onClick={() => handleUpdateTaskStatus(t, 'in_progress')}
                                    className="p-1 hover:bg-[#214ef5]/10 text-neutral-500 hover:text-[#214ef5] transition-colors rounded text-[9px] font-mono"
                                    title="Start Progress"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTaskItem(t.id)}
                                    className="p-1 hover:bg-[#ea3323]/10 text-neutral-500 hover:text-[#ea3323] transition-colors rounded text-[9px]"
                                    title="Delete Task"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        ) : (
                          <p className="text-[9px] font-mono text-white/20 text-center py-4 italic">No pending items</p>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Processing Column */}
                {(statusFilter === "all" || statusFilter === "in_progress") && (
                  <div 
                    onDragOver={(e) => handleDragOver(e, 'in_progress')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'in_progress')}
                    className={`p-2.5 rounded-2xl border transition-all duration-200 ${
                      activeDragCol === 'in_progress' 
                        ? "bg-[#214ef5]/10 border-dashed border-[#214ef5]/50 shadow-[0_0_15px_rgba(33,78,245,0.15)] scale-[1.01]" 
                        : "bg-black/30 border-white/5"
                    }`}
                  >
                    <h5 className="text-[10px] font-mono uppercase bg-[#214ef5]/10 p-1.5 rounded-lg font-bold text-[#214ef5] text-center mb-2">Actively Doing</h5>
                    <div className="space-y-1.5">
                      {(() => {
                        const activeTasks = tasks.filter(t => t.status === "in_progress").filter(t => {
                          // Category filter
                          if (selectedCategoryFilter !== "All" && (t.category || "Work") !== selectedCategoryFilter) return false;

                          // Due date range filter
                          if (dueDateFilter !== "all") {
                            if (!t.dueDate) return false;
                            try {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const due = new Date(t.dueDate);
                              due.setHours(0, 0, 0, 0);
                              if (dueDateFilter === "today") {
                                if (due.getTime() !== today.getTime()) return false;
                              } else if (dueDateFilter === "week") {
                                const nextWeek = new Date(today);
                                nextWeek.setDate(today.getDate() + 7);
                                if (due < today || due > nextWeek) return false;
                              } else if (dueDateFilter === "overdue") {
                                if (!isTaskOverdue(t)) return false;
                              }
                            } catch (err) {
                              return false;
                            }
                          }

                          // Text filter
                          if (!taskSearchQuery) return true;
                          const q = taskSearchQuery.toLowerCase();
                          return (t.title && t.title.toLowerCase().includes(q)) || 
                                 (t.description && t.description.toLowerCase().includes(q)) ||
                                 (t.category && t.category.toLowerCase().includes(q));
                        });

                        return activeTasks.length > 0 ? (
                          <AnimatePresence mode="popLayout" initial={false}>
                            {activeTasks.map(t => {
                              const isOverdue = isTaskOverdue(t);
                              return (
                                <motion.div 
                                  layout
                                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                  key={t.id} 
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, t.id)}
                                  onDragEnd={handleDragEnd}
                                  className={`p-2 px-3 border rounded-xl group flex flex-col justify-between transition-all cursor-grab active:cursor-grabbing ${
                                    isOverdue 
                                      ? "bg-rose-950/25 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)] hover:bg-rose-950/35 overdue-pulse" 
                                      : "bg-white/5 border-white/5 hover:bg-white/10"
                                  } ${
                                    draggingTaskId === t.id ? "opacity-30 border-dashed scale-95" : ""
                                  }`}
                                >
                                  <div className="truncate">
                                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                                      <p className="text-[11px] font-sans font-bold text-white truncate flex-1">{t.title}</p>
                                      {t.priority && (
                                        <span 
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-mono rounded font-bold uppercase ${
                                            t.priority === "high"
                                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                              : t.priority === "medium"
                                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                          }`}
                                          title={`Priority: ${t.priority}`}
                                        >
                                          <Flag className="w-2 h-2 fill-current" />
                                          {t.priority}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[9px] font-mono text-white/40 truncate">{t.description || "No description"}</p>
                                    
                                    {/* Distinct Category and Due Date Badge */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCategoryFilter(t.category || "General");
                                        }}
                                        className={`px-2 py-0.5 text-[9px] font-mono border rounded cursor-pointer transition-all hover:brightness-125 uppercase tracking-wider font-semibold ${getCategoryStyles(t.category || "General")}`}
                                      >
                                        {t.category || "General"}
                                      </button>

                                      {t.dueDate && (
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-medium px-2 py-0.5 border rounded select-none ${
                                          isOverdue 
                                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse font-bold" 
                                            : "bg-white/5 text-white/50 border-white/15"
                                        }`}>
                                          <Calendar className="w-2.5 h-2.5" />
                                          {t.dueDate}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-1 mt-2 border-t border-white/10 pt-1.5">
                                  <button 
                                    onClick={() => handleUpdateTaskStatus(t, 'done')}
                                    className="p-1 hover:bg-emerald-500/10 text-neutral-500 hover:text-emerald-500 transition-colors rounded text-[9px] font-mono"
                                    title="Mark Completed"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTaskItem(t.id)}
                                    className="p-1 hover:bg-[#ea3323]/10 text-neutral-500 hover:text-[#ea3323] transition-colors rounded text-[9px]"
                                    title="Delete Task"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        ) : (
                          <p className="text-[9px] font-mono text-white/20 text-center py-4 italic">No ongoing items</p>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Completed Column */}
                {(statusFilter === "all" || statusFilter === "done") && (
                  <div 
                    onDragOver={(e) => handleDragOver(e, 'done')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'done')}
                    className={`p-2.5 rounded-2xl border transition-all duration-200 ${
                      activeDragCol === 'done' 
                        ? "bg-emerald-500/10 border-dashed border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.01]" 
                        : "bg-black/30 border-white/5"
                    }`}
                  >
                    <h5 className="text-[10px] font-mono uppercase bg-emerald-500/10 p-1.5 rounded-lg font-bold text-emerald-400 text-center mb-2">Completed</h5>
                    <div className="space-y-1.5">
                      {(() => {
                        const completedTaskItems = tasks.filter(t => t.status === "done").filter(t => {
                          // Category filter
                          if (selectedCategoryFilter !== "All" && (t.category || "Work") !== selectedCategoryFilter) return false;

                          // Due date range filter
                          if (dueDateFilter !== "all") {
                            if (!t.dueDate) return false;
                            try {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const due = new Date(t.dueDate);
                              due.setHours(0, 0, 0, 0);
                              if (dueDateFilter === "today") {
                                if (due.getTime() !== today.getTime()) return false;
                              } else if (dueDateFilter === "week") {
                                const nextWeek = new Date(today);
                                nextWeek.setDate(today.getDate() + 7);
                                if (due < today || due > nextWeek) return false;
                              } else if (dueDateFilter === "overdue") {
                                if (!isTaskOverdue(t)) return false;
                              }
                            } catch (err) {
                              return false;
                            }
                          }

                          // Text filter
                          if (!taskSearchQuery) return true;
                          const q = taskSearchQuery.toLowerCase();
                          return (t.title && t.title.toLowerCase().includes(q)) || 
                                 (t.description && t.description.toLowerCase().includes(q)) ||
                                 (t.category && t.category.toLowerCase().includes(q));
                        });

                        return completedTaskItems.length > 0 ? (
                          <AnimatePresence mode="popLayout" initial={false}>
                            {completedTaskItems.map(t => (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                key={t.id} 
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, t.id)}
                                onDragEnd={handleDragEnd}
                                className={`bg-white/5 p-2 px-3 border border-white/5 rounded-xl group opacity-64 flex flex-col justify-between hover:bg-white/10 transition-all cursor-grab active:cursor-grabbing ${
                                  draggingTaskId === t.id ? "opacity-30 border-dashed scale-95" : ""
                                }`}
                              >
                                <div className="truncate">
                                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                                    <p className="text-[11px] font-sans font-bold text-white line-through truncate flex-1">{t.title}</p>
                                    {t.priority && (
                                      <span 
                                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-mono rounded font-bold uppercase ${
                                          t.priority === "high"
                                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                            : t.priority === "medium"
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        }`}
                                        title={`Priority: ${t.priority}`}
                                      >
                                        <Flag className="w-2 h-2 fill-current" />
                                        {t.priority}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] font-mono text-white/40 truncate">{t.description || "No description"}</p>
                                  
                                  {/* Distinct Category and Due Date Badge */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCategoryFilter(t.category || "General");
                                      }}
                                      className={`px-2 py-0.5 text-[9px] font-mono border rounded cursor-pointer transition-all hover:brightness-125 uppercase tracking-wider font-semibold ${getCategoryStyles(t.category || "General")}`}
                                    >
                                      {t.category || "General"}
                                    </button>

                                    {t.dueDate && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-medium px-2 py-0.5 border rounded select-none bg-white/5 text-white/30 border-white/15">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {t.dueDate}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-end gap-1 mt-2 border-t border-neutral-900 pt-1.5">
                                  <button 
                                    onClick={() => handleUpdateTaskStatus(t, 'done')}
                                    className="p-1 hover:bg-emerald-500/10 text-neutral-500 hover:text-emerald-500 transition-colors rounded text-[9px] font-mono"
                                    title="Mark Completed"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTaskItem(t.id)}
                                    className="p-1 hover:bg-[#ea3323]/10 text-neutral-500 hover:text-[#ea3323] transition-colors rounded text-[9px]"
                                    title="Delete Task"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        ) : (
                          <p className="text-[9px] font-mono text-white/20 text-center py-4 italic">No completed items</p>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            </section>

            {/* Schedules Organizer Panel */}
            <section className="bg-white/5 backdrop-blur-xl text-neutral-300 rounded-2xl border border-white/10 p-5 flex flex-col shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#214ef5]" /> Synchronized Schedules
                  </h3>
                  <p className="text-[10px] font-mono text-white/40">Firestore task block planner</p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#214ef5]">
                  {schedules.length} Blocks
                </div>
              </div>

              {/* Fast event adder inside Firestore */}
              <form onSubmit={handleAddNewSchedule} className="mb-4 bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs font-mono">
                <input 
                  type="text"
                  required
                  value={newScheduleTitle}
                  onChange={(e) => setNewScheduleTitle(e.target.value)}
                  placeholder="Advisor block title..."
                  className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono outline-none text-white rounded-xl focus:border-[#214ef5]/50"
                />
                <input 
                  type="text"
                  value={newScheduleDesc}
                  onChange={(e) => setNewScheduleDesc(e.target.value)}
                  placeholder="Block notes (optional)..."
                  className="w-full bg-white/5 border border-white/10 p-2 text-xs font-mono outline-none text-white rounded-xl focus:border-[#214ef5]/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-0.5 pl-1">Start Time:</label>
                    <input 
                      type="datetime-local"
                      required
                      value={newScheduleStart}
                      onChange={(e) => setNewScheduleStart(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-1.5 rounded-xl text-[10px] text-white focus:border-[#214ef5]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-0.5 pl-1">End Time:</label>
                    <input 
                      type="datetime-local"
                      required
                      value={newScheduleEnd}
                      onChange={(e) => setNewScheduleEnd(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-1.5 rounded-xl text-[10px] text-white focus:border-[#214ef5]"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-[#214ef5] to-[#a855f7] hover:opacity-90 text-white font-sans font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer mt-1"
                >
                  Schedule Block
                </button>
              </form>

              {/* Schedules lists */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {schedules.map(evt => (
                  <div key={evt.id} className="bg-white/5 border border-white/5 p-3 rounded-xl flex justify-between gap-2.5 hover:bg-white/10 transition-colors">
                    <div>
                      <h6 className="font-sans font-bold text-neutral-100 text-[11px]">{evt.title}</h6>
                      <p className="text-[9px] font-mono text-white/50">{evt.description || "No additional description"}</p>
                      
                      <div className="flex items-center gap-1.5 text-[8px] font-mono text-white/40 uppercase tracking-widest mt-1.5">
                        <Clock className="w-3 h-3 text-[#214ef5]" />
                        <span>{new Date(evt.startTime).toLocaleTimeString()} - {new Date(evt.endTime).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteScheduleEvent(evt.id)}
                      className="p-1 self-start hover:bg-[#ea3323]/20 text-[#ea3323] transition-all rounded-full ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {schedules.length === 0 && (
                  <p className="text-xs font-mono text-white/30 text-center py-4">No schedules planned. Choose a slice above.</p>
                )}
              </div>
            </section>

            {/* Interaction History Matrix */}
            <section className="bg-black border-2 border-[#0000FF]/30 hover:border-[#FF0000]/40 rounded-2xl p-4 shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3.5">
                <div>
                  <h3 className="text-xs font-bold font-sans text-white uppercase tracking-wider flex items-center gap-1.5 font-bold animate-pulse">
                    <History className="w-3.5 h-3.5 text-[#0000FF]" /> Interaction History Matrix
                  </h3>
                  <p className="text-[9px] font-mono text-white/45">Review and re-run previous actions</p>
                </div>
                {interactionHistory.length > 0 && (
                  <button 
                    onClick={() => {
                      setInteractionHistory([]);
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("shadow_interaction_history");
                      }
                    }}
                    className="text-[9px] font-mono text-[#FF0000] hover:text-white transition-colors uppercase font-black tracking-wider cursor-pointer"
                    title="Clear entire interaction logs"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {interactionHistory.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {interactionHistory.map((item, idx) => {
                    const isVoice = item.type === "voice";
                    const isShortcut = item.type === "shortcut";
                    return (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 hover:border-[#0000FF]/30 rounded-xl p-2.5 transition-all flex flex-col gap-1.5 shadow-sm">
                        <div className="flex justify-between items-center text-[9px] font-mono">
                          <span className={`px-1.5 py-0.5 rounded-md font-bold text-[8px] uppercase tracking-wider ${
                            isVoice 
                              ? "bg-[#0000FF]/25 text-[#0000FF] border border-[#0000FF]/45" 
                              : isShortcut 
                                ? "bg-[#FF0000]/25 text-[#FF0000] border border-[#FF0000]/45" 
                                : "bg-white/10 text-white/60 border border-white/10"
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-white/30">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-[11px] font-mono text-neutral-200 line-clamp-2 select-all break-words leading-tight">
                          "{item.command}"
                        </p>

                        <div className="flex justify-between items-center gap-2 pt-1 border-t border-white/5 mt-0.5">
                          <span className={`text-[8px] font-mono uppercase tracking-widest ${item.success ? "text-emerald-400 font-bold animate-pulse" : "text-[#FF0000]/80"}`}>
                            {item.success ? "● Executed Ready" : "○ Execution Error"}
                          </span>

                          <button
                            onClick={() => {
                              setAssistantLogs(prev => [
                                ...prev,
                                { role: "user", text: `[Re-ran History] "${item.command}"`, time: new Date().toLocaleTimeString() }
                              ]);
                              submitShadowQuery(item.command, isVoiceResponseEnabled, item.type);
                            }}
                            className="flex items-center gap-1.5 text-[9px] font-semibold text-[#0000FF] hover:text-white hover:bg-[#0000FF]/25 hover:border-[#0000FF] border border-[#0000FF]/40 rounded-lg px-2 py-0.5 transition-all cursor-pointer font-sans uppercase tracking-wider"
                            title="Execute this command again immediately"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Re-run</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5">
                  <History className="w-6 h-6 mx-auto mb-1.5 opacity-20 text-white" />
                  <p className="text-[10px] font-mono text-white/30">No interactions registered yet</p>
                </div>
              )}
            </section>

          </motion.div>
        )}
      </AnimatePresence>

    </main>
      )}

      {/* Shadow Voice Command Guide Modal overlay */}
      <AnimatePresence>
        {isCommandGuideOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsCommandGuideOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-neutral-950/90 border border-white/10 p-6 md:p-8 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl backdrop-blur-2xl text-left flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold font-sans tracking-widest text-white uppercase flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" /> SHADOW Command Guide
                  </h2>
                  <p className="text-xs text-white/50 tracking-wide font-mono mt-1">
                    Master your accessibility environment. Click any voice directive to execute instantly in your SHADOW Assistive controller.
                  </p>
                </div>
                <button
                  onClick={() => setIsCommandGuideOpen(false)}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer text-xs font-mono flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Esc</span>
                </button>
              </div>

              {/* Bento Grid Command Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {COMMAND_GUIDE_CATEGORIES.map((category) => (
                  <div 
                    key={category.title}
                    className="p-5 border border-white/5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg border ${category.colorClass} flex items-center justify-center`}>
                          {renderGuideCategoryIcon(category.iconName)}
                        </div>
                        <h3 className="font-sans font-bold text-sm text-white/90">{category.title}</h3>
                      </div>
                      <p className="text-[11px] text-white/40 font-mono mb-4 leading-relaxed">{category.description}</p>
                    </div>

                    <div className="space-y-2 mt-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#214ef5] font-bold block mb-1">Supported Phrases:</span>
                      {category.commands.map((cmd) => (
                        <div 
                          key={cmd.name}
                          onClick={() => {
                            setIsCommandGuideOpen(false);
                            triggerShortcutQuestion(cmd.text);
                          }}
                          className="group border border-white/5 hover:border-[#214ef5]/50 bg-black/40 hover:bg-neutral-950 p-2.5 rounded-xl cursor-pointer text-left transition-all relative overflow-hidden"
                          title="Click to instantly execute this command in SHADOW"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-white group-hover:text-[#ea3323] transition-colors flex items-center gap-1.5 font-sans">
                              {cmd.name}
                            </span>
                            <span className="text-[8px] font-mono uppercase tracking-widest bg-white/5 text-white/50 px-1.5 py-0.5 rounded-full group-hover:bg-[#214ef5]/20 group-hover:text-white transition-colors">
                              Trigger
                            </span>
                          </div>
                          <p className="text-xs text-white/70 italic font-mono mb-1 select-all break-words leading-relaxed">
                            "{cmd.text}"
                          </p>
                          <p className="text-[10px] text-white/40 font-mono flex items-center gap-1.5 leading-normal">
                            <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                            <span>{cmd.purpose}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer instruction note matching aesthetics */}
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] font-mono text-white/40 gap-3">
                <span className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#ea3323] animate-pulse" />
                  <span>Tip: Speak commands aloud using "Hey Shadow" or click spheres directly.</span>
                </span>
                <span>Accessible Cross-Device Assistant Agent v1.0</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer System coordinates */}
      <footer className="bg-black/40 backdrop-blur-md py-4 border-t border-white/10 px-6 text-center text-[10px] font-mono text-neutral-300 uppercase tracking-widest mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:justify-between items-center gap-3">
          <span>&copy; {new Date().getFullYear()} SHADOW ASSISTIVE HOME AGENT FRAMEWORK</span>
          <span className="flex items-center gap-1.5 text-white/60">
            <Database className="w-3.5 h-3.5 text-[#214ef5]" /> Firestore Active Sync &bull; Google OAuth Scoped v1.0
          </span>
        </div>
      </footer>
    </div>
  );
}
