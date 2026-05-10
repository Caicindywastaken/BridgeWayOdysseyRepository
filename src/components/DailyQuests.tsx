import { useEffect, useState } from "react";
import { Flame, Sparkles, CheckCircle2, Star, Gift } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/context/FirebaseContext";

const DailyQuests = () => {
  const { dailyQuests, dailyQuestsCollected, collectQuest, userId } = useGame();
  const [loginStreak, setLoginStreak] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    
    const unsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lastClaim = data.last_login_date; // ISO timestamp
        const day = data.current_streak || 0;
        
        // streak logic already handled by FirebaseContext
        setLoginStreak(day);
        
        // Since FirebaseContext updates last_login_date on every login, 
        // we can check if it was updated today.
        const lastLoginDateObj = new Date(lastClaim);
        const isToday = lastLoginDateObj.toDateString() === new Date().toDateString();
        setClaimedToday(isToday);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    });

    return () => unsubscribe();
  }, [userId]);
  const streak = loginStreak;

  const completedCount = dailyQuests.filter(q => q.completed || dailyQuestsCollected.has(q.id)).length;

  return (
    <div className="space-y-3">
      {/* Streak header */}
      <div className="glass-card rounded-3xl p-4 border-2 border-streak/30 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full gradient-pink-orange flex items-center justify-center glow-accent animate-pulse-glow">
          <Flame className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-extrabold font-display text-streak">{streak} Day Streak 🔥</p>
          <p className="text-xs text-muted-foreground">
            {claimedToday ? "Claimed today ✅ — come back tomorrow!" : "Claim your daily reward to grow your streak!"}
          </p>
        </div>
      </div>

      {/* Daily quests */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold font-display flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-primary" /> Daily Quests
        </h3>
        <span className="text-xs text-muted-foreground">{completedCount}/{dailyQuests.length} done</span>
      </div>

      {dailyQuests.map((quest) => {
        const isCollected = dailyQuestsCollected.has(quest.id);
        const isDone = quest.completed;
        const progress = Math.min((quest.current / quest.target) * 100, 100);

        return (
          <div
            key={quest.id}
            className={`glass-card rounded-2xl p-3 border transition-all ${
              isCollected ? "border-success/30 opacity-60" : isDone ? "border-stars/30" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{quest.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{quest.title}</p>
                  {isCollected && <CheckCircle2 className="w-4 h-4 text-success" />}
                </div>
                <p className="text-xs text-muted-foreground">{quest.description}</p>
                {!isCollected && (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-purple-blue transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{quest.current}/{quest.target}</p>
                  </div>
                )}
              </div>
              {isDone && !isCollected ? (
                <button
                  onClick={() => collectQuest(quest.id)}
                  className="px-3 py-1.5 rounded-xl gradient-orange-yellow text-background text-xs font-bold glow-stars animate-pulse-glow"
                >
                  Claim!
                </button>
              ) : (
                <div className="flex items-center gap-1 text-xp">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">+{quest.reward}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Bonus reward for completing all */}
      <div className={`glass-card rounded-2xl p-3 border-2 text-center transition-all ${
        completedCount === dailyQuests.length ? "border-stars/40 glow-stars" : "border-border opacity-50"
      }`}>
        <div className="flex items-center justify-center gap-2">
          <Star className="w-5 h-5 text-stars fill-stars" />
          <span className="text-sm font-bold">Complete all quests for bonus reward!</span>
          <Star className="w-5 h-5 text-stars fill-stars" />
        </div>
      </div>
    </div>
  );
};

export default DailyQuests;
