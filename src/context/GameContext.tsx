import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from "firebase/firestore";
import { handleFirestoreError, OperationType, useFirebase } from "@/context/FirebaseContext";
import { useAdmin } from "@/context/AdminContext";

interface LessonProgress {
  completed: boolean;
  score: number;
  stars: number;
}
// ... rest of interfaces remain the same
interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  emoji: string;
  completed: boolean;
  collected?: boolean;
}

interface GameState {
  xp: number;
  starCurrency: number;
  streak: number;
  level: number;
  progress: Record<string, Record<number, Record<number, LessonProgress>>>;
  badges: string[];
  avatar: string;
  playerName: string;
  onboardingDone: boolean;
  dailyQuests: DailyQuest[];
  dailyQuestsDate: string;
  dailyQuestsCollected: Set<string>;
  worldCorrectStats: Record<string, { correct: number; total: number }>;
  powerUps: Record<string, number>;
  userId: string | null;
  loading: boolean;
  lessonsCompletedToday: number;
  perfectScoresToday: number;
  xpEarnedToday: number;
  worldsVisitedToday: Set<string>;
}

interface GameContextType extends GameState {
  completeLesson: (worldId: string, levelIdx: number, lessonIdx: number, score: number, total?: number) => void;
  getLessonProgress: (worldId: string, levelIdx: number, lessonIdx: number) => LessonProgress | undefined;
  isLessonUnlocked: (worldId: string, levelIdx: number, lessonIdx: number) => boolean;
  isLevelUnlocked: (worldId: string, levelIdx: number) => boolean;
  getWorldProgress: (worldId: string) => { completed: number; total: number; levelProgress: number[] };
  spendStars: (amount: number) => boolean;
  setOnboardingDone: () => void;
  resetOnboarding: () => void;
  updatePlayerName: (name: string) => void;
  updateAvatar: (avatar: string) => void;
  visitWorld: (worldId: string) => void;
  collectQuest: (questId: string) => void;
  usePowerUp: (powerUpId: string) => boolean;
  buyPowerUp: (powerUpId: string, cost: number) => boolean;
  getSkillMastery: (worldId: string) => number;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
};

const QUEST_POOL: Record<"q1" | "q2" | "q3" | "q4", DailyQuest[]> = {
  q1: [
    { id: "q1", title: "Lesson Learner", description: "Complete 2 lessons", target: 2, current: 0, reward: 30, emoji: "📚", completed: false },
    { id: "q1", title: "Cosmic Cadet", description: "Complete 3 lessons", target: 3, current: 0, reward: 45, emoji: "🛸", completed: false },
    { id: "q1", title: "Quick Sprint", description: "Complete 1 lesson", target: 1, current: 0, reward: 20, emoji: "⚡", completed: false },
    { id: "q1", title: "Marathon Mind", description: "Complete 4 lessons", target: 4, current: 0, reward: 60, emoji: "🏃", completed: false },
  ],
  q2: [
    { id: "q2", title: "Perfect Score", description: "Get 8/8 on any quiz", target: 1, current: 0, reward: 50, emoji: "🎯", completed: false },
    { id: "q2", title: "Sharpshooter", description: "Get 2 perfect scores", target: 2, current: 0, reward: 80, emoji: "🏹", completed: false },
    { id: "q2", title: "Bullseye", description: "Get 8/8 on any quiz", target: 1, current: 0, reward: 40, emoji: "🎪", completed: false },
  ],
  q3: [
    { id: "q3", title: "XP Hunter", description: "Earn 100 XP today", target: 100, current: 0, reward: 25, emoji: "⚡", completed: false },
    { id: "q3", title: "Power Surge", description: "Earn 150 XP today", target: 150, current: 0, reward: 40, emoji: "🔋", completed: false },
    { id: "q3", title: "Stardust Run", description: "Earn 75 XP today", target: 75, current: 0, reward: 20, emoji: "✨", completed: false },
    { id: "q3", title: "Big XP Push", description: "Earn 200 XP today", target: 200, current: 0, reward: 55, emoji: "🚀", completed: false },
  ],
  q4: [
    { id: "q4", title: "Explorer", description: "Visit 3 different worlds", target: 3, current: 0, reward: 20, emoji: "🌍", completed: false },
    { id: "q4", title: "Galaxy Tour", description: "Visit 4 different worlds", target: 4, current: 0, reward: 35, emoji: "🪐", completed: false },
    { id: "q4", title: "Two-World Trek", description: "Visit 2 different worlds", target: 2, current: 0, reward: 15, emoji: "🌗", completed: false },
    { id: "q4", title: "Full Constellation", description: "Visit all 5 worlds", target: 5, current: 0, reward: 60, emoji: "🌌", completed: false },
  ],
};

const dateSeed = (dateStr: string) => {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const generateDailyQuests = (dateStr?: string): DailyQuest[] => {
  const seed = dateSeed(dateStr || new Date().toISOString().split("T")[0]);
  const pick = <T,>(arr: T[], offset: number) => arr[(seed + offset) % arr.length];
  return [
    { ...pick(QUEST_POOL.q1, 0) },
    { ...pick(QUEST_POOL.q2, 1) },
    { ...pick(QUEST_POOL.q3, 2) },
    { ...pick(QUEST_POOL.q4, 3) },
  ];
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { mockDate } = useFirebase();
  const today = (mockDate || new Date()).toISOString().split("T")[0];
  const { isAdmin } = useAdmin();

  const [state, setState] = useState<GameState>({
    xp: 0,
    starCurrency: 5,
    streak: 0,
    level: 1,
    progress: {},
    badges: [],
    avatar: "alien1",
    playerName: "Space Cadet",
    onboardingDone: false,
    dailyQuests: generateDailyQuests(today),
    dailyQuestsDate: today,
    dailyQuestsCollected: new Set(),
    worldCorrectStats: {},
    powerUps: {},
    userId: null,
    loading: true,
    lessonsCompletedToday: 0,
    perfectScoresToday: 0,
    xpEarnedToday: 0,
    worldsVisitedToday: new Set(),
  });

  // Load/Sync with Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const isNewDay = data.daily_quests_date !== today;
            
            setState(prev => ({
              ...prev,
              userId: user.uid,
              loading: false,
              playerName: data.playerName || user.displayName || "Space Cadet",
              avatar: data.avatar || "alien1",
              onboardingDone: data.onboardingDone || false,
              xp: data.xp || 0,
              starCurrency: data.starCurrency || 5,
              streak: data.current_streak || 0,
              level: data.level || 1,
              progress: data.progress || {},
              badges: data.badges || [],
              worldCorrectStats: data.worldCorrectStats || {},
              powerUps: data.powerUps || {},
              dailyQuests: isNewDay ? generateDailyQuests(today) : (data.dailyQuests || generateDailyQuests(today)),
              dailyQuestsDate: today,
              dailyQuestsCollected: isNewDay
                ? new Set()
                : new Set((data.dailyQuests || [] as DailyQuest[]).filter((q: any) => q.collected).map((q: any) => q.id)),
              lessonsCompletedToday: isNewDay ? 0 : data.lessonsCompletedToday || 0,
              perfectScoresToday: isNewDay ? 0 : data.perfectScoresToday || 0,
              xpEarnedToday: isNewDay ? 0 : data.xpEarnedToday || 0,
              worldsVisitedToday: isNewDay ? new Set() : new Set(data.worldsVisitedToday || []),
            }));
          } else {
            // Document will be created by FirebaseContext handleStreakLogic
            // but we can set basic state here
            setState(prev => ({ ...prev, userId: user.uid, loading: false }));
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });

        return () => unsubscribeDoc();
      } else {
        setState(prev => ({ ...prev, userId: null, loading: false, playerName: "Space Cadet" }));
      }
    });

    return () => unsubscribeAuth();
  }, [today]);

  const saveToDb = useCallback(async (newState: GameState) => {
    if (!newState.userId) return;
    const userDocRef = doc(db, "users", newState.userId);
    try {
      await updateDoc(userDocRef, {
        xp: newState.xp,
        starCurrency: newState.starCurrency,
        level: newState.level,
        progress: newState.progress,
        badges: newState.badges,
        dailyQuests: newState.dailyQuests,
        dailyQuestsDate: newState.dailyQuestsDate,
        worldCorrectStats: newState.worldCorrectStats,
        powerUps: newState.powerUps,
        lessonsCompletedToday: newState.lessonsCompletedToday,
        perfectScoresToday: newState.perfectScoresToday,
        xpEarnedToday: newState.xpEarnedToday,
        worldsVisitedToday: Array.from(newState.worldsVisitedToday),
        onboardingDone: newState.onboardingDone,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${newState.userId}`);
    }
  }, []);

  const completeLesson = useCallback((worldId: string, levelIdx: number, lessonIdx: number, score: number, total: number = 8) => {
    const safeTotal = Math.max(1, total);
    const pct = score / safeTotal;
    const stars = pct >= 1 ? 3 : pct >= 0.9 ? 2 : pct >= 0.8 ? 1 : 0;
    const passed = pct >= 0.8;
    const xpGain = passed ? 50 + (stars * 20) : 10;
    // Level-based star rewards: L1=10, L2=20, L3=30
    const levelStarReward = passed ? (levelIdx + 1) * 10 : 0;

    setState(prev => {
      const newProgress = { ...prev.progress };
      if (!newProgress[worldId]) newProgress[worldId] = {};
      if (!newProgress[worldId][levelIdx]) newProgress[worldId][levelIdx] = {};

      const existing = newProgress[worldId][levelIdx][lessonIdx];
      if (existing && existing.stars >= stars) return prev;

      newProgress[worldId][levelIdx][lessonIdx] = { completed: passed, score, stars };

      const newXp = prev.xp + xpGain;
      const newLevel = Math.floor(newXp / 200) + 1;
      const newStreak = prev.streak === 0 ? 1 : prev.streak;

      // Update world correct stats
      const newStats = { ...prev.worldCorrectStats };
      if (!newStats[worldId]) newStats[worldId] = { correct: 0, total: 0 };
      newStats[worldId] = {
        correct: newStats[worldId].correct + score,
        total: newStats[worldId].total + safeTotal,
      };

      // Update daily quest progress
      const newLessonsToday = prev.lessonsCompletedToday + (passed ? 1 : 0);
      const newPerfectToday = prev.perfectScoresToday + (pct >= 1 ? 1 : 0);
      const newXpToday = prev.xpEarnedToday + xpGain;

      const newQuests = prev.dailyQuests.map(q => {
        if (q.id === "q1") return { ...q, current: newLessonsToday, completed: newLessonsToday >= q.target };
        if (q.id === "q2") return { ...q, current: newPerfectToday, completed: newPerfectToday >= q.target };
        if (q.id === "q3") return { ...q, current: Math.min(newXpToday, q.target), completed: newXpToday >= q.target };
        if (q.id === "q4") return { ...q, current: prev.worldsVisitedToday.size, completed: prev.worldsVisitedToday.size >= q.target };
        return q;
      });

      // Check for new badges (criteria intentionally distinct from daily quests)
      const newBadges = [...prev.badges];
      const totalCompleted = Object.values(newProgress).reduce((acc, levels) =>
        acc + Object.values(levels).reduce((a, lessons) =>
          a + Object.values(lessons).filter(l => l.completed).length, 0), 0);

      // first_steps -> Complete an entire level (8 lessons in same level)
      const completedAFullLevel = Object.values(newProgress).some(levels =>
        Object.values(levels).some(lessons => {
          const arr = Object.values(lessons);
          return arr.length >= 8 && arr.filter(l => l.completed).length >= 8;
        })
      );
      if (completedAFullLevel && !newBadges.includes("first_steps")) newBadges.push("first_steps");

      // quick_learner -> Reach player level 5
      if (newLevel >= 5 && !newBadges.includes("quick_learner")) newBadges.push("quick_learner");

      // world_explorer -> Reach Level 1 in every world (each world has 8 lessons completed in level 0)
      const worldIds = Object.keys(newProgress);
      const allWorldsHaveL1 = worldIds.length >= 5 && worldIds.every(wId => {
        const l0 = newProgress[wId]?.[0];
        if (!l0) return false;
        for (let i = 0; i < 8; i++) if (!l0[i]?.completed) return false;
        return true;
      });
      if (allWorldsHaveL1 && !newBadges.includes("world_explorer")) newBadges.push("world_explorer");

      // star_collector -> 200 stars accumulated
      if (prev.starCurrency + stars + levelStarReward >= 200 && !newBadges.includes("star_collector")) newBadges.push("star_collector");

      // admin_pro -> Earn ANY world certificate (all 24 lessons in a world)
      const earnedAnyCert = worldIds.some(wId => {
        const w = newProgress[wId];
        if (!w) return false;
        for (let l = 0; l < 3; l++) {
          for (let i = 0; i < 8; i++) {
            if (!w[l]?.[i]?.completed) return false;
          }
        }
        return true;
      });
      if (earnedAnyCert && !newBadges.includes("admin_pro")) newBadges.push("admin_pro");

      // streak_master is awarded by the daily-login claim flow (14-day streak), not here.

      const newState = {
        ...prev,
        xp: newXp,
        starCurrency: prev.starCurrency + stars + levelStarReward,
        level: newLevel,
        streak: newStreak,
        progress: newProgress,
        badges: newBadges,
        worldCorrectStats: newStats,
        dailyQuests: newQuests,
        lessonsCompletedToday: newLessonsToday,
        perfectScoresToday: newPerfectToday,
        xpEarnedToday: newXpToday,
      };

      saveToDb(newState);
      return newState;
    });
  }, [saveToDb]);

  const getLessonProgress = useCallback((worldId: string, levelIdx: number, lessonIdx: number) => {
    return state.progress[worldId]?.[levelIdx]?.[lessonIdx];
  }, [state.progress]);

  const isLessonUnlocked = useCallback((worldId: string, levelIdx: number, lessonIdx: number) => {
    if (isAdmin) return true;
    if (levelIdx > 0 && !isLevelUnlocked(worldId, levelIdx)) return false;
    if (lessonIdx === 0) return true;
    const prev = state.progress[worldId]?.[levelIdx]?.[lessonIdx - 1];
    return prev?.completed === true;
  }, [state.progress, isAdmin]);

  const isLevelUnlocked = useCallback((worldId: string, levelIdx: number) => {
    if (isAdmin) return true;
    if (levelIdx === 0) return true;
    const prevLevel = state.progress[worldId]?.[levelIdx - 1];
    if (!prevLevel) return false;
    for (let i = 0; i < 8; i++) {
      if (!prevLevel[i]?.completed) return false;
    }
    return true;
  }, [state.progress, isAdmin]);

  const getWorldProgress = useCallback((worldId: string) => {
    let completed = 0;
    const total = 24;
    const levelProgress = [0, 0, 0];
    for (let l = 0; l < 3; l++) {
      let levelCompleted = 0;
      for (let i = 0; i < 8; i++) {
        if (state.progress[worldId]?.[l]?.[i]?.completed) {
          completed++;
          levelCompleted++;
        }
      }
      levelProgress[l] = levelCompleted;
    }
    return { completed, total, levelProgress };
  }, [state.progress]);

  const spendStars = useCallback((amount: number) => {
    if (state.starCurrency < amount) return false;
    setState(prev => {
      const newState = { ...prev, starCurrency: prev.starCurrency - amount };
      saveToDb(newState);
      return newState;
    });
    return true;
  }, [state.starCurrency, saveToDb]);

  const setOnboardingDone = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, onboardingDone: true };
      if (prev.userId) {
        updateDoc(doc(db, "users", prev.userId), { onboardingDone: true })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `users/${prev.userId}`));
      }
      return newState;
    });
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, onboardingDone: false };
      if (prev.userId) {
        updateDoc(doc(db, "users", prev.userId), { onboardingDone: false })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `users/${prev.userId}`));
      }
      return newState;
    });
  }, []);

  const updatePlayerName = useCallback((name: string) => {
    setState(prev => {
      const newState = { ...prev, playerName: name };
      try { localStorage.setItem("user_name", name); } catch {}
      if (prev.userId) {
        updateDoc(doc(db, "users", prev.userId), { playerName: name })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `users/${prev.userId}`));
      }
      return newState;
    });
  }, []);

  const updateAvatar = useCallback((avatar: string) => {
    setState(prev => {
      const newState = { ...prev, avatar };
      if (prev.userId) {
        updateDoc(doc(db, "users", prev.userId), { avatar })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `users/${prev.userId}`));
      }
      return newState;
    });
  }, []);

  const visitWorld = useCallback((worldId: string) => {
    setState(prev => {
      const newVisited = new Set(prev.worldsVisitedToday);
      newVisited.add(worldId);
      const newQuests = prev.dailyQuests.map(q => {
        if (q.id === "q4") return { ...q, current: newVisited.size, completed: newVisited.size >= q.target };
        return q;
      });
      const newState = { ...prev, worldsVisitedToday: newVisited, dailyQuests: newQuests };
      saveToDb(newState);
      return newState;
    });
  }, [saveToDb]);

  const collectQuest = useCallback((questId: string) => {
    setState(prev => {
      const quest = prev.dailyQuests.find(q => q.id === questId);
      if (!quest || !quest.completed || prev.dailyQuestsCollected.has(questId)) return prev;
      const newCollected = new Set(prev.dailyQuestsCollected);
      newCollected.add(questId);
      const newQuests = prev.dailyQuests.map(q => q.id === questId ? { ...q, collected: true } : q);
      const newState = { ...prev, xp: prev.xp + quest.reward, dailyQuests: newQuests, dailyQuestsCollected: newCollected };
      saveToDb(newState);
      return newState;
    });
  }, [saveToDb]);

  const usePowerUp = useCallback((powerUpId: string) => {
    if (isAdmin) return true; // Infinite power-ups for admins
    if (!state.powerUps[powerUpId] || state.powerUps[powerUpId] <= 0) return false;
    setState(prev => {
      const newPowerUps = { ...prev.powerUps, [powerUpId]: (prev.powerUps[powerUpId] || 0) - 1 };
      const newState = { ...prev, powerUps: newPowerUps };
      saveToDb(newState);
      return newState;
    });
    return true;
  }, [state.powerUps, saveToDb]);

  const buyPowerUp = useCallback((powerUpId: string, cost: number) => {
    if (state.starCurrency < cost) return false;
    setState(prev => {
      const newPowerUps = { ...prev.powerUps, [powerUpId]: (prev.powerUps[powerUpId] || 0) + 1 };
      const newState = { ...prev, starCurrency: prev.starCurrency - cost, powerUps: newPowerUps };
      saveToDb(newState);
      return newState;
    });
    return true;
  }, [state.starCurrency, saveToDb]);

  const getSkillMastery = useCallback((worldId: string) => {
    const stats = state.worldCorrectStats[worldId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.correct / stats.total) * 100);
  }, [state.worldCorrectStats]);

  return (
    <GameContext.Provider value={{
      ...state,
      completeLesson,
      getLessonProgress,
      isLessonUnlocked,
      isLevelUnlocked,
      getWorldProgress,
      spendStars,
      setOnboardingDone,
      resetOnboarding,
      updatePlayerName,
      updateAvatar,
      visitWorld,
      collectQuest,
      usePowerUp,
      buyPowerUp,
      getSkillMastery,
    }}>
      {children}
    </GameContext.Provider>
  );
};
