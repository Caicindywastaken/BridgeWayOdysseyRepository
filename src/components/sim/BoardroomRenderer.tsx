import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gradeChallenge } from "@/services/gradingService";
import { toast } from "sonner";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";
import { Button } from "@/components/ui/button";
import { ChevronRight, Terminal, Eye } from "lucide-react";
import ExecutiveCoachHub from "./boardroom/ExecutiveCoachHub";
import BoardroomReviewModal from "./boardroom/BoardroomReviewModal";
import MeetingStageBuilder from "./boardroom/MeetingStageBuilder";
import SkillMappingGrid from "./boardroom/SkillMappingGrid";
import OneOnOneConversator from "./boardroom/OneOnOneConversator";
import MediationInterface from "./boardroom/MediationInterface";
import FeedbackFeedbackLoop from "./boardroom/FeedbackFeedbackLoop";
import RiskAssessmentHUD from "./boardroom/RiskAssessmentHUD";
import CrisisCallSimulator from "./boardroom/CrisisCallSimulator";
import TheCommandCenter from "./boardroom/TheCommandCenter";
import type { BoardroomSimTask, BoardroomCritique } from "./boardroom/types";

interface Props {
  task: BoardroomSimTask;
  showResult: boolean;
  onAnswer: (passed: boolean) => void;
  onNext: () => void;
}

const sub = (s: string | undefined, name: string) => typeof s === "string" ? s.replace(/\{playerName\}/g, name) : s;

const BoardroomRenderer = ({ task, showResult, onAnswer, onNext }: Props) => {
  const { playerName } = useGame();
  const { isAdmin } = useAdmin();
  const name = (playerName && playerName.trim() && playerName !== "Space Cadet") ? playerName : "Cadet";
  const [submitting, setSubmitting] = useState(false);
  const [critique, setCritique] = useState<BoardroomCritique | null>(null);
  const [objective, setObjective] = useState(0);
  const [morale, setMorale] = useState(task.initialMorale ?? 70);
  const [velocity, setVelocity] = useState(task.initialVelocity ?? 60);
  const [devOpen, setDevOpen] = useState(false);
  const [devCmd, setDevCmd] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  // ~ tilde key opens dev console
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "`" || e.key === "~") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setDevOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const runDev = () => {
    if (!isAdmin) { toast.error("Admin privileges required."); return; }
    if (devCmd.trim() === "/unlock-all") {
      toast.success("🔓 Admin: lesson auto-pass triggered.");
      onAnswer(true);
      setDevOpen(false);
      setDevCmd("");
    } else {
      toast.error(`Unknown command: ${devCmd}`);
    }
  };

  const submit = async (submission: any) => {
    setSubmitting(true);
    setObjective(task.objectives.length - 1);
    // Reflect submission impact on vitals (visual)
    setMorale(m => Math.min(100, m + 10));
    setVelocity(v => Math.min(100, v + 8));
    try {
      const data = await gradeChallenge(
        "boardroom_sim",
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
      const fb: BoardroomCritique = {
        score: typeof data?.score === "number" ? (data as any).score : 70,
        passed: !!(data as any)?.passed,
        rating: (data as any)?.rating || ((data as any)?.score >= 85 ? "A" : (data as any)?.score >= 70 ? "B" : "C"),
        boardroomCritique: (data as any)?.boardroomCritique || (data as any)?.coaches_note || "Solid leadership instincts.",
        attritionRisk: !!(data as any)?.attritionRisk,
        criteria_scores: (data as any)?.criteria_scores,
      };
      setCritique(fb);
      onAnswer(fb.passed);
    } catch (e) {
      console.error("boardroom grading error:", e);
      toast.error("Grading hiccup. Try again.");
    }
    setSubmitting(false);
  };

  const render = () => {
    const props = { task, onSubmit: submit, submitting };
    switch (task.tool) {
      case "meeting": return <MeetingStageBuilder {...props} />;
      case "delegation": return <SkillMappingGrid {...props} />;
      case "oneonone": return <OneOnOneConversator {...props} />;
      case "mediation": return <MediationInterface {...props} />;
      case "feedback": return <FeedbackFeedbackLoop {...props} />;
      case "pressure": return <RiskAssessmentHUD {...props} />;
      case "crisis": return <CrisisCallSimulator {...props} />;
      case "command": return <TheCommandCenter {...props} />;
      default: return null;
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 -mx-1 relative overflow-hidden">
      {/* subtle grid backdrop */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {isAdmin && (
        <div className="relative mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
          <span>🔓 Admin Mode · Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">~</kbd> for DevConsole · Tool: <code className="font-mono font-bold">{task.tool}</code></span>
          <Button size="sm" variant="ghost" onClick={() => setShowAnswer(s => !s)} className="h-6 text-[11px] text-amber-300 hover:bg-amber-500/20">
            <Eye className="w-3 h-3 mr-1" /> {showAnswer ? "Hide" : "Show"} answer scheme
          </Button>
        </div>
      )}

      {showAnswer && isAdmin && task.answerScheme && (
        <div className="relative mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-[11px] text-emerald-200 whitespace-pre-wrap">
          <p className="font-bold mb-1 text-emerald-400">📝 Dev Answer Scheme</p>
          {task.answerScheme}
        </div>
      )}

      <div className="relative grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <ExecutiveCoachHub
          playerName={name}
          lessonTitle={task.lessonTitle}
          clientBrief={sub(task.clientBrief, name) || ""}
          objectives={task.objectives}
          currentObjective={objective}
          morale={morale}
          velocity={velocity}
          referenceNotes={task.referenceNotes}
        />
        <section className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm p-4 min-h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div key={task.tool} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              {render()}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {critique && (
        <BoardroomReviewModal
          critique={critique}
          onClose={() => setCritique(null)}
          onContinue={() => { setCritique(null); onNext(); }}
        />
      )}

      {showResult && !critique && (
        <Button onClick={onNext} className="relative w-full mt-4 bg-emerald-400 hover:bg-emerald-500 text-slate-950 h-12 rounded-2xl font-bold">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}

      {/* Dev Console */}
      <AnimatePresence>
        {devOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-950 border border-emerald-400/60 rounded-xl shadow-2xl p-3 w-[360px]">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1 mb-1">
              <Terminal className="w-3 h-3" /> DevConsole {isAdmin ? "" : "(read-only — admin required)"}
            </p>
            <div className="flex gap-1">
              <span className="text-emerald-400 font-mono">$</span>
              <input
                autoFocus
                value={devCmd}
                onChange={e => setDevCmd(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runDev()}
                placeholder="/unlock-all"
                className="flex-1 bg-transparent outline-none text-emerald-200 font-mono text-sm"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BoardroomRenderer;
