import React, { useState } from "react";
import { useFirebase } from "@/context/FirebaseContext";
import { useAdmin } from "@/context/AdminContext";
import { Button } from "@/components/ui/button";
import { Clock, SkipForward, RotateCcw, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const TimeWarp: React.FC = () => {
  const { isAdmin } = useAdmin();
  const { mockDate, setMockDate, refreshStreak, userData } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAdmin) return null;

  const currentTime = mockDate || new Date();

  const addTime = (hours: number) => {
    const next = new Date(currentTime.getTime() + hours * 60 * 60 * 1000);
    setMockDate(next);
  };

  const addDays = (days: number) => {
    const next = new Date(currentTime.getTime() + days * 24 * 60 * 60 * 1000);
    setMockDate(next);
  };

  const reset = () => {
    setMockDate(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow-lg border-2 border-primary/20 bg-background/80 backdrop-blur-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Clock className={`w-5 h-5 ${mockDate ? "text-streak animate-pulse" : "text-primary"}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-14 right-0 w-64 p-4 rounded-2xl bg-background/95 backdrop-blur-md border border-primary/10 shadow-2xl space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Time Warp Mode
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Testing streaks and daily resets.
              </p>
            </div>

            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Current Time</div>
              <div className="text-xs font-mono font-bold truncate">
                {currentTime.toLocaleString()}
              </div>
              {mockDate && (
                <div className="text-[10px] text-streak font-bold mt-1">
                  ⚠️ WATCH ACTIVE
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => addTime(1)}>
                +1 Hour
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => addDays(1)}>
                +1 Day
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => addDays(2)}>
                +2 Days
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => addDays(7)}>
                +1 Week
              </Button>
            </div>

            <div className="space-y-2 pt-2 border-t border-primary/5">
              <Button 
                size="sm" 
                className="w-full h-8 gap-2 bg-streak hover:bg-streak/90" 
                onClick={() => {
                  refreshStreak();
                  setIsOpen(false);
                }}
              >
                <SkipForward className="w-3 h-3" />
                Simulate Login
              </Button>
              <Button size="sm" variant="ghost" className="w-full h-8 gap-2 text-muted-foreground" onClick={reset}>
                <RotateCcw className="w-3 h-3" />
                Reset System Clock
              </Button>
            </div>

            {userData && (
              <div className="text-[10px] p-2 rounded bg-black/5 dark:bg-white/5 font-mono">
                Streak: {userData.current_streak} | Last: {new Date(userData.last_login_date).toLocaleDateString()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
