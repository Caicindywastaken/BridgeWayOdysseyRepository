import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Star, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/context/FirebaseContext";
import AvatarSVG, {
  AvatarCustomization,
  defaultCustomization,
  SKIN_TONES,
  HAIR_STYLES,
  EYE_TYPES,
  ACCESSORIES,
  AccessoryIcon,
  FACE_STRUCTURES,
} from "@/components/AvatarSVG";
import AvatarRenderer from "@/components/AvatarRenderer";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";

const CustomizeAvatar = () => {
  const navigate = useNavigate();
  const { starCurrency, spendStars, userId, loading } = useGame();
  const { toast } = useToast();
  const [customization, setCustomization] = useState<AvatarCustomization>(defaultCustomization);
  const [ownedAccessories, setOwnedAccessories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !userId) {
      navigate("/auth");
      return;
    }
    if (userId) {
      getDoc(doc(db, "users", userId))
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.avatar_customization) {
              const c = data.avatar_customization;
              setCustomization({
                skinTone: c.skinTone || defaultCustomization.skinTone,
                hairStyle: c.hairStyle || defaultCustomization.hairStyle,
                eyeType: c.eyeType || defaultCustomization.eyeType,
                accessories: c.accessories || [],
                faceStructure: c.faceStructure || defaultCustomization.faceStructure,
              });
              setOwnedAccessories(c.ownedAccessories || c.accessories || []);
            }
          }
        })
        .catch(error => handleFirestoreError(error, OperationType.GET, `users/${userId}`));
    }
  }, [userId, loading, navigate]);

  const { isAdmin } = useAdmin();

  const handleBuyAccessory = (id: string, cost: number) => {
    if (ownedAccessories.includes(id)) {
      // Toggle equip
      setCustomization((prev) => ({
        ...prev,
        accessories: prev.accessories.includes(id)
          ? prev.accessories.filter((a) => a !== id)
          : [...prev.accessories, id],
      }));
      return;
    }
    // Admins get everything free; regular users pay
    if (!isAdmin && cost > 0) {
      if (!spendStars(cost)) {
        toast({ title: "Not enough Stars ⭐", description: `You need ${cost} stars for this item.`, variant: "destructive" });
        return;
      }
    }
    setOwnedAccessories((prev) => [...prev, id]);
    setCustomization((prev) => ({ ...prev, accessories: [...prev.accessories, id] }));
    toast({ title: "Accessory unlocked! 🎉", description: cost > 0 ? `Spent ${cost} stars` : "Free item equipped!" });
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        avatar_customization: { ...customization, ownedAccessories },
      });
      toast({ title: "Persona saved! 🚀" });
      navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    } finally {
      setSaving(false);
    }
  };

  const skinIndex = SKIN_TONES.findIndex((s) => s.color === customization.skinTone);

  return (
    <AppLayout hideNav>
      <PageTransition>
        <div className="px-4 py-4 pb-24">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl glass-card border border-border flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-extrabold font-display text-glow text-primary">Cosmic Persona Lab</h1>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-40 h-40 rounded-full gradient-purple-blue glow-primary flex items-center justify-center p-2 animate-float">
              <AvatarRenderer customization={customization} size={140} />
            </div>
            <div className="flex items-center gap-1 mt-3">
              <Star className="w-4 h-4 text-stars fill-stars" />
              <span className="text-sm font-bold">{starCurrency} Stars</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              <Sparkles className="w-3 h-3 inline mr-0.5" />
              Aura reflects your highest-skill world
            </p>
          </div>

          <Tabs defaultValue="skin" className="w-full">
            <TabsList className="w-full grid grid-cols-5 glass-card border border-border rounded-2xl h-10 mb-4">
              <TabsTrigger value="skin" className="text-[10px] rounded-xl">Skin</TabsTrigger>
              <TabsTrigger value="face" className="text-[10px] rounded-xl">Face</TabsTrigger>
              <TabsTrigger value="hair" className="text-[10px] rounded-xl">Hair</TabsTrigger>
              <TabsTrigger value="eyes" className="text-[10px] rounded-xl">Eyes</TabsTrigger>
              <TabsTrigger value="gear" className="text-[10px] rounded-xl">Gear</TabsTrigger>
            </TabsList>

            <TabsContent value="face" className="space-y-4">
              <p className="text-sm text-muted-foreground">Pick a facial structure</p>
              <div className="grid grid-cols-3 gap-3">
                {FACE_STRUCTURES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCustomization((p) => ({ ...p, faceStructure: f.id }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      (customization.faceStructure || "oval") === f.id ? "border-primary glow-primary" : "border-border glass-card"
                    }`}
                  >
                    <AvatarSVG customization={{ ...customization, faceStructure: f.id, accessories: [], apparel: [] }} size={50} />
                    <span className="text-xs font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            </TabsContent>


            <TabsContent value="skin" className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose your skin tone — from human to interstellar!</p>
              <div className="grid grid-cols-5 gap-2">
                {SKIN_TONES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCustomization((p) => ({ ...p, skinTone: s.color }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all ${
                      customization.skinTone === s.color ? "border-primary glow-primary" : "border-border glass-card"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="hair" className="space-y-4">
              <p className="text-sm text-muted-foreground">Pick a gravity-defying style</p>
              <div className="grid grid-cols-3 gap-3">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setCustomization((p) => ({ ...p, hairStyle: h.id }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      customization.hairStyle === h.id ? "border-primary glow-primary" : "border-border glass-card"
                    }`}
                  >
                    <AvatarSVG customization={{ ...customization, hairStyle: h.id, accessories: [] }} size={50} />
                    <span className="text-xs font-medium">{h.label}</span>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="eyes" className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose your gaze</p>
              <div className="grid grid-cols-2 gap-3">
                {EYE_TYPES.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setCustomization((p) => ({ ...p, eyeType: e.id }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      customization.eyeType === e.id ? "border-primary glow-primary" : "border-border glass-card"
                    }`}
                  >
                    <AvatarSVG customization={{ ...customization, eyeType: e.id, accessories: [] }} size={50} />
                    <span className="text-xs font-medium">{e.label}</span>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gear" className="space-y-4">
              <p className="text-sm text-muted-foreground">Unlock accessories with Stars</p>
              <div className="grid grid-cols-2 gap-3">
                {ACCESSORIES.map((a) => {
                  const owned = ownedAccessories.includes(a.id);
                  const equipped = customization.accessories.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleBuyAccessory(a.id, a.cost)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                        equipped ? "border-primary glow-primary" : owned ? "border-success/40" : "border-border glass-card"
                      }`}
                    >
                      <div className="h-10 flex items-center justify-center">
                        <AccessoryIcon id={a.id} size={36} />
                      </div>
                      <span className="text-xs font-medium">{a.label}</span>
                      {owned ? (
                        <span className="text-[10px] text-success flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> {equipped ? "Equipped" : "Owned"}
                        </span>
                      ) : a.cost > 0 ? (
                        <span className="text-[10px] text-stars flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-stars" /> {a.cost}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Special
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 glass-card border-t border-border z-40 max-w-lg mx-auto">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-purple-blue text-primary-foreground h-12 rounded-2xl font-bold glow-primary"
            >
              {saving ? "Saving..." : "Save Persona 🚀"}
            </Button>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default CustomizeAvatar;
