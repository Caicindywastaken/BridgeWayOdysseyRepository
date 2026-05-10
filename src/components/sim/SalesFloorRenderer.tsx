import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gradeChallenge } from "@/services/gradingService";
import { toast } from "sonner";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";
import { Button } from "@/components/ui/button";
import { ChevronRight, Eye, Command } from "lucide-react";
import InstructionHub from "./sales/InstructionHub";
import SalesReviewModal from "./sales/SalesReviewModal";
import RetailFloorSim from "./sales/RetailFloorSim";
import LiveChatInterface from "./sales/LiveChatInterface";
import VideoCallSim from "./sales/VideoCallSim";
import StressTestSim from "./sales/StressTestSim";
import ObjectionHandler from "./sales/ObjectionHandler";
import ShoppingBasketSim from "./sales/ShoppingBasketSim";
import RapidResponseHUD from "./sales/RapidResponseHUD";
import type { SalesSimTask, SalesCritique } from "./sales/types";

interface Props {
  task: SalesSimTask;
  showResult: boolean;
  onAnswer: (passed: boolean) => void;
  onNext: () => void;
}

const sub = (s: string | undefined, name: string) => typeof s === "string" ? s.replace(/\{playerName\}/g, name) : s;

const SalesFloorRenderer = ({ task, showResult, onAnswer, onNext }: Props) => {
  const { playerName } = useGame();
  const { isAdmin } = useAdmin();
  const name = (playerName && playerName.trim() && playerName !== "Space Cadet") ? playerName : "Cadet";
  const [submitting, setSubmitting] = useState(false);
  const [critique, setCritique] = useState<SalesCritique | null>(null);
  const [objective, setObjective] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd/Ctrl+K opens admin palette (admin only)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (!isAdmin) return;
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isAdmin]);

  const submit = async (submission: any) => {
    setSubmitting(true);
    setObjective(task.objectives.length - 1);
    try {
      const data = await gradeChallenge(
        "sales_sim",
        submission,
        {
          tool: task.tool,
          lessonTitle: task.lessonTitle,
          clientBrief: sub(task.clientBrief, name),
          objectives: task.objectives,
          gradingFocus: task.gradingFocus,
        },
        task.gradingFocus,
        name
      );
      const score = typeof (data as any)?.score === "number" ? (data as any).score : 70;
      const fb: SalesCritique = {
        score,
        passed: typeof (data as any)?.passed === "boolean" ? (data as any).passed : score >= 70,
        rating: (data as any)?.rating || (score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : "C"),
        directorNote: (data as any)?.directorNote || (data as any)?.coaches_note || "Solid customer instincts.",
        commission: typeof (data as any)?.commission === "number" ? (data as any).commission : Math.max(0, Math.round((score - 60) * 5)),
        criteria_scores: (data as any)?.criteria_scores,
      };
      setCritique(fb);
      onAnswer(fb.passed);
    } catch (e) {
      console.error("sales grading error:", e);
      toast.error("Grading hiccup. Try again.");
    }
    setSubmitting(false);
  };

  const render = () => {
    const props = { task, onSubmit: submit, submitting };
    switch (task.tool) {
      case "retail_floor": return <RetailFloorSim {...props} />;
      case "live_chat": return <LiveChatInterface {...props} />;
      case "video_call": return <VideoCallSim {...props} />;
      case "stress_test": return <StressTestSim {...props} />;
      case "objection": return <ObjectionHandler {...props} />;
      case "basket": return <ShoppingBasketSim {...props} />;
      case "rapid": return <RapidResponseHUD {...props} />;
      default: return null;
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-4 -mx-1 relative overflow-hidden border border-slate-200/60">
      {isAdmin && (
        <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-800">
          <span>🔓 Creator Mode · <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono">⌘K</kbd> palette · Tool: <code className="font-mono font-bold">{task.tool}</code></span>
          <Button size="sm" variant="ghost" onClick={() => setShowAnswer(s => !s)} className="h-6 text-[11px] text-indigo-800 hover:bg-indigo-100">
            <Eye className="w-3 h-3 mr-1" /> {showAnswer ? "Hide" : "Show"} answer scheme
          </Button>
        </div>
      )}

      {showAnswer && isAdmin && task.answerScheme && (
        <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[11px] text-emerald-900 whitespace-pre-wrap">
          <p className="font-bold mb-1 text-emerald-700">📝 Dev Answer Scheme</p>
          {task.answerScheme}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <InstructionHub
          playerName={name}
          lessonTitle={task.lessonTitle}
          clientBrief={sub(task.clientBrief, name) || ""}
          objectives={task.objectives}
          currentObjective={objective}
          referenceNotes={task.referenceNotes}
        />
        <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm p-4 min-h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div key={task.tool} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {render()}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {critique && (
        <SalesReviewModal critique={critique} onClose={() => setCritique(null)} onContinue={() => { setCritique(null); onNext(); }} />
      )}

      {showResult && !critique && (
        <Button onClick={onNext} className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white h-12 rounded-2xl font-bold">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}

      {/* Admin command palette */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white border border-indigo-300 rounded-xl shadow-2xl p-3 w-[360px]">
            <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold flex items-center gap-1 mb-2">
              <Command className="w-3 h-3" /> Creator Palette
            </p>
            <Button onClick={() => { onAnswer(true); setPaletteOpen(false); toast.success("Lesson auto-passed."); }} className="w-full bg-indigo-600 text-white">Auto-pass lesson</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalesFloorRenderer;
