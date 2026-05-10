import { useEffect, useState } from "react";
import { Flame, Sparkles, Star, Sun, Moon } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useTheme } from "@/context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import AvatarSVG, { AvatarCustomization, defaultCustomization } from "@/components/AvatarSVG";

const TopBar = () => {
  const { xp, starCurrency, streak, playerName, userId } = useGame();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const xpInLevel = xp % 200;
  const xpProgress = (xpInLevel / 200) * 100;

  const [avatar, setAvatar] = useState<AvatarCustomization>(defaultCustomization);

  useEffect(() => {
    if (!userId) return;
    
    // Subscribe to user doc for avatar customization
    const unsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.avatar_customization) {
          const c = data.avatar_customization;
          setAvatar({
            skinTone: c.skinTone || defaultCustomization.skinTone,
            hairStyle: c.hairStyle || defaultCustomization.hairStyle,
            eyeType: c.eyeType || defaultCustomization.eyeType,
            accessories: c.accessories || [],
          });
        }
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const displayName = playerName && playerName !== "Space Cadet" ? playerName : "Your";

  return (
    <div data-tour="topbar" className="sticky top-0 z-30 glass-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate("/profile")} className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full gradient-purple-blue flex items-center justify-center glow-primary p-0.5 shrink-0 overflow-hidden">
            <AvatarSVG customization={avatar} size={32} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{displayName}'s Universe</p>
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full gradient-purple-blue rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </button>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl glass-card border border-border flex items-center justify-center hover:scale-110 transition-all"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-stars" /> : <Moon className="w-4 h-4 text-primary" />}
          </button>
          <div className="flex items-center gap-1" title="Login streak">
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-streak" : "text-muted-foreground"}`} />
            <span className="text-sm font-bold">{streak}</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-5 h-5 text-xp" />
            <span className="text-sm font-bold">{xp}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 text-stars fill-stars" />
            <span className="text-sm font-bold">{starCurrency}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
