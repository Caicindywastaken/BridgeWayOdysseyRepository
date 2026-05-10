import { useState, useEffect } from "react";
import { Flame, Sparkles, Star, Award, LogOut, Edit2, Palette, Clock, Shield, Eye, Zap } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";
import { worlds } from "@/data/courseData";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { handleFirestoreError, OperationType } from "@/context/FirebaseContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import AvatarSVG, { AvatarCustomization, defaultCustomization } from "@/components/AvatarSVG";
import AvatarRenderer from "@/components/AvatarRenderer";


const powerUps = [
  { id: "freeze", name: "Time Freeze", desc: "Pause the timer for 30s", cost: 3, emoji: "❄️", icon: Clock },
  { id: "shield", name: "Shield", desc: "Block one wrong answer", cost: 5, emoji: "🛡️", icon: Shield },
  { id: "reveal", name: "Reveal Hint", desc: "Show a hint for any question", cost: 2, emoji: "👁️", icon: Eye },
  { id: "double", name: "Double XP", desc: "Earn 2x XP for one lesson", cost: 4, emoji: "⚡", icon: Zap },
];

const Profile = () => {
  const { xp, level, streak, starCurrency, getWorldProgress, playerName, updatePlayerName, userId, badges, buyPowerUp, powerUps: ownedPowerUps } = useGame();
  const { isAdmin } = useAdmin();
  const { playPurchase, playWrong } = useSoundEffects();
  const [avatarCustomization, setAvatarCustomization] = useState<AvatarCustomization>(defaultCustomization);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  // Daily-login streak (driven by claiming the daily reward, not by lesson plays)
  const [loginStreakDay, setLoginStreakDay] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalCompleted = worlds.reduce((acc, w) => acc + getWorldProgress(w.id).completed, 0);
  const totalLessons = worlds.length * 24;

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.avatar_customization) {
          const c = data.avatar_customization;
          setAvatarCustomization({
            skinTone: c.skinTone || defaultCustomization.skinTone,
            hairStyle: c.hairStyle || defaultCustomization.hairStyle,
            eyeType: c.eyeType || defaultCustomization.eyeType,
            accessories: c.accessories || [],
            faceStructure: c.faceStructure || defaultCustomization.faceStructure,
            apparel: c.apparel || [],
          });
        }
        
        const lastClaim = data.last_login_date; // ISO timestamp
        const day = data.current_streak || 0;
        setLoginStreakDay(day);
        
        const lastLoginDateObj = new Date(lastClaim);
        const isToday = lastLoginDateObj.toDateString() === new Date().toDateString();
        setClaimedToday(isToday);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    });

    return () => unsubscribe();
  }, [userId]);

  // Reflect newly-claimed reward without a page reload (now handled by the onSnapshot above)

  const handleLogout = async () => {
    await signOut(auth);
    toast({ title: "See you later! 👋", description: "Your progress has been saved." });
    navigate("/auth");
  };

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    updatePlayerName(nameInput.trim());
    setEditingName(false);
    toast({ title: "Name updated! 🎉" });
  };

  const handleBuyPowerUp = (id: string, cost: number, name: string) => {
    if (isAdmin) {
      buyPowerUp(id, 0);
      playPurchase();
      toast({ title: `${name} acquired free! 🛡️`, description: "Admin perk — no cost." });
      return;
    }
    if (buyPowerUp(id, cost)) {
      playPurchase();
      toast({ title: `${name} acquired! 🎉`, description: "Use it in your next challenge." });
    } else {
      playWrong();
      toast({ title: "Not enough stars! ⭐", description: "Complete more lessons to earn stars.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="px-4 py-4">
        <div className="text-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full gradient-purple-blue mx-auto flex items-center justify-center glow-primary animate-float mb-1 p-1">
              <AvatarRenderer customization={avatarCustomization} size={88} />
            </div>
            <button
              onClick={() => navigate("/customize-avatar")}
              className="absolute bottom-0 right-1/2 translate-x-8 w-8 h-8 rounded-full gradient-purple-blue flex items-center justify-center border-2 border-background glow-primary"
            >
              <Palette className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>

          {editingName ? (
            <div className="flex items-center justify-center gap-2 mb-1">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveName()}
                className="text-xl font-extrabold font-display bg-transparent border-b-2 border-primary outline-none text-center w-40"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName} className="gradient-purple-blue text-primary-foreground rounded-xl h-8 text-xs">
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-extrabold font-display">{playerName}</h1>
              <button onClick={() => { setNameInput(playerName); setEditingName(true); }} className="text-muted-foreground hover:text-primary">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">Level {level} Explorer</p>

        </div>


        {/* Auth section */}
        <div className="mb-6">
          {userId ? (
            <div className="glass-card rounded-2xl p-3 border border-border flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Signed in</p>
                <p className="text-sm font-bold">Progress is saved ✅</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleLogout} className="rounded-xl border-border glass-card">
                <LogOut className="w-4 h-4 mr-1" /> Log Out
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate("/auth")} className="w-full gradient-purple-blue text-primary-foreground h-12 rounded-2xl font-bold glow-primary">
              Sign In to Save Progress
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Total XP", value: xp, icon: <Sparkles className="w-5 h-5 text-xp" /> },
            { label: "Stars", value: starCurrency, icon: <Star className="w-5 h-5 text-stars fill-stars" /> },
            {
              label: claimedToday ? "Login Streak ✅" : "Login Streak",
              value: `${loginStreakDay} day${loginStreakDay === 1 ? "" : "s"}`,
              icon: <Flame className={`w-5 h-5 ${loginStreakDay > 0 ? "text-streak" : "text-muted-foreground"}`} />,
            },
            { label: "Lessons", value: `${totalCompleted}/${totalLessons}`, icon: <Award className="w-5 h-5 text-success" /> },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-3 border border-border flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {!claimedToday && userId && (
          <button
            onClick={() => navigate("/daily-login")}
            className="w-full glass-card rounded-2xl p-3 border border-stars/40 mb-6 flex items-center justify-center gap-2 text-sm font-bold text-stars hover:border-stars transition"
          >
            🎁 Claim today's reward to grow your streak →
          </button>
        )}

        {/* Power-Up Shop */}
        <h2 className="text-lg font-bold font-display mb-3">⚡ Power-Up Shop</h2>
        <div className="glass-card rounded-2xl p-3 border border-border mb-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-stars fill-stars" />
          <span className="text-sm font-bold">{starCurrency}</span>
          <span className="text-xs text-muted-foreground">Stars Available</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {powerUps.map(p => {
            const owned = ownedPowerUps[p.id] || 0;
            return (
              <div key={p.id} className="glass-card rounded-2xl p-3 border border-border text-center">
                <span className="text-3xl">{p.emoji}</span>
                <h3 className="text-sm font-bold mt-2">{p.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                {owned > 0 && <p className="text-[10px] font-bold text-success mt-1">Owned: {owned}</p>}
                <Button
                  onClick={() => handleBuyPowerUp(p.id, p.cost, p.name)}
                  size="sm"
                  className="mt-2 w-full gradient-orange-yellow text-background rounded-xl text-xs font-bold h-8 glow-stars"
                >
                  {isAdmin ? "Free" : <><Star className="w-3 h-3 mr-1 fill-background" /> {p.cost}</>}
                </Button>
              </div>
            );
          })}
        </div>

      </div>
    </AppLayout>
  );
};

export default Profile;
