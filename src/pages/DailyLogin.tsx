import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Gift, Sparkles, ChevronRight, Lock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PageTransition from "@/components/PageTransition";
import Confetti from "@/components/Confetti";
import { useFirebase } from "@/context/FirebaseContext";

const getReward = (streak: number): { stars: number; bonus?: string } => {
  if (streak === 1) return { stars: 10 };
  if (streak >= 2 && streak <= 6) return { stars: 10 * streak };
  if (streak === 7) return { stars: 300, bonus: "Commander's Visor 🎖️" };
  if (streak >= 8 && streak <= 13) return { stars: 15 * streak };
  if (streak === 14) return { stars: 1000, bonus: "Alien Artifact Mystery Box 💎" };
  return { stars: 10 + streak };
};

const TOTAL_DAYS = 14;

const DailyLogin = () => {
  const navigate = useNavigate();
  const { userData, loading: firebaseLoading } = useFirebase();
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!firebaseLoading) {
      if (!userData) {
        // Not logged in or data not yet loaded
        // FirebaseContext should handle the initial data creation
      } else {
        setDataLoaded(true);
      }
    }
  }, [firebaseLoading, userData]);

  const handleContinue = () => {
    navigate("/");
  };

  if (firebaseLoading || !dataLoaded) {
    return (
      <div className="min-h-screen max-w-lg mx-auto nebula-bg relative flex items-center justify-center">
        <div className="starfield" />
        <div className="relative z-10 text-center animate-pulse-glow">
          <div className="w-16 h-16 rounded-full gradient-purple-blue mx-auto flex items-center justify-center text-3xl glow-primary animate-float">⭐</div>
          <p className="text-sm text-muted-foreground font-display mt-3">Syncing with galactic central...</p>
        </div>
      </div>
    );
  }

  const currentStreak = userData?.current_streak || 1;
  const highestStreak = userData?.highest_streak || 1;
  const isWeekTwo = currentStreak > 7;

  return (
    <PageTransition>
      <div className="min-h-screen max-w-lg mx-auto nebula-bg relative overflow-hidden">
        <div className="starfield" />
        <Confetti active={showConfetti} />

        <div className="relative z-10 px-4 py-6">
          {/* Header */}
          <div className="text-center mb-6 animate-slide-up">
            <h1 className="text-2xl font-extrabold font-display text-glow text-primary mb-1">
              {isWeekTwo ? "🌌 Deep Space Phase" : "🚀 Launch Phase"}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              Streak: <span className="text-primary font-bold">{currentStreak}</span> / {TOTAL_DAYS}
            </p>
          </div>

          {/* Constellation Path */}
          <div className="relative mx-auto" style={{ maxWidth: 340 }}>
            <svg viewBox="0 0 340 420" className="w-full h-auto">
              {/* Connection lines (constellation) */}
              {Array.from({ length: TOTAL_DAYS - 1 }).map((_, i) => {
                const from = getNodePos(i);
                const to = getNodePos(i + 1);
                const dayNum = i + 1;
                const isComplete = dayNum < currentStreak;
                return (
                  <line
                    key={`line-${i}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isComplete ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                    strokeWidth={isComplete ? 2.5 : 1.5}
                    strokeDasharray={isComplete ? "none" : "4 4"}
                    opacity={isComplete ? 0.8 : 0.3}
                  />
                );
              })}

              {/* Day nodes */}
              {Array.from({ length: TOTAL_DAYS }).map((_, i) => {
                const dayNum = i + 1;
                const pos = getNodePos(i);
                const reward = getReward(dayNum);
                const isClaimed = dayNum < currentStreak;
                const isCurrent = dayNum === currentStreak;
                const isMilestone = dayNum === 7 || dayNum === 14;

                return (
                  <g key={dayNum}>
                    {/* Glow for current */}
                    {isCurrent && (
                      <circle cx={pos.x} cy={pos.y} r={isMilestone ? 26 : 20} fill="hsl(var(--primary))" opacity="0.15">
                        <animate attributeName="r" values={isMilestone ? "26;30;26" : "20;24;20"} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.15;0.25;0.15" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Node circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isMilestone ? 22 : 16}
                      fill={isClaimed ? "hsl(var(--primary))" : isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                      opacity={isClaimed ? 1 : isCurrent ? 0.9 : 0.4}
                      stroke={isMilestone ? "hsl(var(--stars, 45 93% 47%))" : "none"}
                      strokeWidth={isMilestone ? 2 : 0}
                    />

                    {/* Day label */}
                    <text
                      x={pos.x}
                      y={pos.y - (isMilestone ? 28 : 22)}
                      textAnchor="middle"
                      fill="hsl(var(--muted-foreground))"
                      fontSize="9"
                      fontWeight="600"
                    >
                      Day {dayNum}
                    </text>

                    {/* Icon/text inside */}
                    {isClaimed ? (
                      <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="12">✓</text>
                    ) : (
                      <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill={isCurrent ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))"} fontSize={isMilestone ? "12" : "10"} opacity={isCurrent ? 1 : 0.6}>
                        {isMilestone ? "🎁" : `${reward.stars}`}
                      </text>
                    )}

                    {/* Stars label below */}
                    <text
                      x={pos.x}
                      y={pos.y + (isMilestone ? 32 : 28)}
                      textAnchor="middle"
                      fill="hsl(var(--stars, 45 93% 47%))"
                      fontSize="8"
                      opacity={isClaimed ? 0.5 : isCurrent ? 1 : 0.4}
                    >
                      ⭐{reward.stars}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Streak Status Card */}
          <div className="mt-4 space-y-3">
            <div className="glass-card rounded-3xl p-6 border border-primary/30 text-center relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
               <div className="relative z-10">
                 <div className="flex items-center justify-center gap-2 mb-4">
                   <div className="p-2 rounded-xl bg-orange-500/20">
                     <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
                   </div>
                   <span className="text-2xl font-bold font-display">Streak Active!</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Current</p>
                      <p className="text-3xl font-extrabold text-primary">{currentStreak}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Highest</p>
                      <p className="text-3xl font-extrabold text-stars">{highestStreak}</p>
                    </div>
                 </div>

                 <p className="text-sm text-muted-foreground mb-6">
                    Last login recorded on:<br/>
                    <span className="text-foreground font-mono text-xs">
                      {new Date(userData?.last_login_date || "").toLocaleString()}
                    </span>
                 </p>

                 <Button
                   onClick={handleContinue}
                   className="w-full gradient-purple-blue text-primary-foreground h-14 rounded-2xl font-bold glow-primary text-lg"
                 >
                   Continue Mission <ChevronRight className="w-6 h-6 ml-1" />
                 </Button>
               </div>
            </div>
            
            <p className="text-center text-[10px] text-muted-foreground/60 px-8 uppercase tracking-[0.2em]">
              BridgeWay Odyssey • Secure Habitat Protocol • Version 2.0
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

// Constellation node positions — zigzag flight path
function getNodePos(index: number): { x: number; y: number } {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const isEvenRow = row % 2 === 0;
  const x = isEvenRow ? 60 + col * 110 : 280 - col * 110;
  const y = 40 + row * 80;
  return { x, y };
}

export default DailyLogin;
