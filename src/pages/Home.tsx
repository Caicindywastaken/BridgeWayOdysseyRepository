import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Scroll, Shield, X } from "lucide-react";
import { worlds } from "@/data/courseData";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import DailyQuests from "@/components/DailyQuests";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { worldThemeStyle } from "@/lib/worldTheme";

const Home = () => {
  const navigate = useNavigate();
  const { getWorldProgress, level, onboardingDone, setOnboardingDone, loading, userId } = useGame();
  const { isAdmin } = useAdmin();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!loading && !userId) {
      navigate("/auth");
    }
  }, [loading, userId, navigate]);

  useEffect(() => {
    if (!loading && userId && onboardingDone === false) {
      setShowTutorial(true);
    } else if (onboardingDone === true) {
      setShowTutorial(false);
    }
  }, [loading, userId, onboardingDone]);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    setOnboardingDone();
  };

  if (loading) {
    return (
      <div className="min-h-screen max-w-lg mx-auto nebula-bg relative flex items-center justify-center">
        <div className="starfield" />
        <div className="relative z-10 text-center animate-pulse-glow">
          <div className="w-20 h-20 rounded-full gradient-purple-blue mx-auto flex items-center justify-center text-4xl glow-primary animate-float mb-4">👽</div>
          <p className="text-sm text-muted-foreground font-display">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
      {showTutorial && <OnboardingTutorial onComplete={handleTutorialComplete} />}

      {/* Dev Mode indicator for admins */}
      {isAdmin && (
        <div className="fixed top-16 right-2 z-40 flex items-center gap-1 glass-card rounded-full px-2.5 py-1 border border-primary/30 opacity-80">
          <Shield className="w-3 h-3 text-primary" />
          <span className="text-[9px] font-bold text-primary">DEV MODE</span>
        </div>
      )}

      {/* Floating Quests Button */}
      <Sheet>
        <SheetTrigger asChild>
          <button data-tour="quest-button" className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full gradient-purple-blue glow-primary flex items-center justify-center shadow-elevated animate-float">
            <Scroll className="w-6 h-6 text-primary-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85%] sm:max-w-sm glass-card border-l border-border p-0 overflow-y-auto">
          <SheetHeader className="p-4 pb-0">
            <SheetTitle className="text-xl font-extrabold font-display">🎯 Daily Quests</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <DailyQuests />
          </div>
        </SheetContent>
      </Sheet>

      <div className="px-4 py-4">
        <div className="text-center mb-6 animate-slide-up">
          <h1 className="text-2xl font-extrabold font-display text-glow text-primary mb-1">
            Choose Your World
          </h1>
          <p className="text-sm text-muted-foreground">Tap a planet to begin your mission</p>
        </div>

        <div data-tour="worlds" className="grid gap-5">
          {worlds.map((world, wi) => {
            const { completed, total } = getWorldProgress(world.id);
            const pct = Math.round((completed / total) * 100);
            const levelDone = Math.floor(completed / 8);

            return (
              <button
                key={world.id}
                onClick={() => navigate(`/world/${world.id}`)}
                className="text-left animate-slide-up"
                style={{ animationDelay: `${wi * 0.08}s`, ...worldThemeStyle(world.id) }}
              >
                <div className="glass-card rounded-3xl p-4 shadow-card hover:shadow-elevated transition-all hover:scale-[1.02] active:scale-[0.98] world-themed-border-strong border-2">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full world-themed-gradient world-themed-glow flex items-center justify-center text-3xl animate-float"
                        style={{ animationDelay: `${wi * 0.5}s` }}>
                        {world.emoji}
                      </div>
                      <div className="absolute inset-[-4px] rounded-full world-themed-border animate-orbit" style={{ animationDuration: `${6 + wi}s` }}>
                        <div className="w-2 h-2 rounded-full bg-stars absolute top-0 left-1/2 -translate-x-1/2" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base font-display text-foreground">{world.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{world.tagline}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Level {levelDone}/3</span>
                          <span>{pct}% XP</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full world-themed-gradient transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="w-10 h-10 rounded-2xl world-themed-gradient flex items-center justify-center world-themed-glow">
                      <Play className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      </PageTransition>
    </AppLayout>
  );
};

export default Home;
