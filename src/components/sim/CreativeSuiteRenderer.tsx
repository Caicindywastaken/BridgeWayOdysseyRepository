import { useState, useEffect } from "react";

import { gradeChallenge } from "@/services/gradingService";
import { toast } from "sonner";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import CreativeDirectorSidebar from "./creative/CreativeDirectorSidebar";
import CritiqueOverlay from "./creative/CritiqueOverlay";
import PosterCanvasEditor from "./creative/PosterCanvasEditor";
import SocialFeedSimulator from "./creative/SocialFeedSimulator";
import CopywriterTerminal from "./creative/CopywriterTerminal";
import BrandArchitect from "./creative/BrandArchitect";
import SearchOptimizerDashboard from "./creative/SearchOptimizerDashboard";
import CampaignPlannerBoard from "./creative/CampaignPlannerBoard";
import SurveyArchitect from "./creative/SurveyArchitect";
import TheExecutiveLaunchpad from "./creative/TheExecutiveLaunchpad";

export type CreativeTool =
  | "poster" | "social" | "copy" | "brand" | "seo" | "campaign" | "survey" | "launchpad";

export interface CreativeSuiteTask {
  tool: CreativeTool;
  lessonTitle: string;
  clientBrief: string;
  requirements: string[];
  milestones: string[];
  gradingFocus: string[];
  // tool-specific config
  brandName?: string;
  productName?: string;
  topic?: string;
  targetKeywords?: string[];
  budget?: number;
  referenceNotes?: { title: string; body: string }[];
}

interface Props {
  task: CreativeSuiteTask;
  showResult: boolean;
  onAnswer: (passed: boolean) => void;
  onNext: () => void;
}

const sub = (s: string | undefined, name: string) =>
  typeof s === "string" ? s.replace(/\{playerName\}/g, name) : s;

const CreativeSuiteRenderer = ({ task, showResult, onAnswer, onNext }: Props) => {
  const { playerName } = useGame();
  const { isAdmin } = useAdmin();
  const name = (playerName && playerName.trim() && playerName !== "Space Cadet") ? playerName : "Cadet";
  const [submitting, setSubmitting] = useState(false);
  const [critique, setCritique] = useState<any>(null);
  const [milestone, setMilestone] = useState(0);
  const [adminBar, setAdminBar] = useState(false);

  // Ctrl+Shift+M admin breadcrumb toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isAdmin && e.ctrlKey && e.shiftKey && (e.key === "M" || e.key === "m")) {
        e.preventDefault();
        setAdminBar(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdmin]);

  const submit = async (submission: any) => {
    setSubmitting(true);
    setMilestone(task.milestones.length - 1);
    try {
      const data = await gradeChallenge(
        "creative_suite",
        submission,
        {
          tool: task.tool,
          lessonTitle: task.lessonTitle,
          clientBrief: sub(task.clientBrief, name),
          requirements: task.requirements,
          gradingFocus: task.gradingFocus,
        },
        task.gradingFocus,
        name
      );
      // Normalize feedback
      const fb = {
        score: typeof (data as any)?.score === "number" ? (data as any).score : 70,
        passed: !!(data as any)?.passed,
        directorCritique: (data as any)?.directorCritique || (data as any)?.coaches_note || "Solid work.",
        marketImpact: (data as any)?.marketImpact || "Reasonable market impact projected.",
        criteria_scores: (data as any)?.criteria_scores,
      };
      setCritique(fb);
      onAnswer(fb.passed);
    } catch (e) {
      console.error("creative suite grading error:", e);
      toast.error("Grading hiccup. Try again.");
    }
    setSubmitting(false);
  };

  const renderTool = () => {
    switch (task.tool) {
      case "poster": return <PosterCanvasEditor onSubmit={submit} submitting={submitting} />;
      case "social": return <SocialFeedSimulator onSubmit={submit} submitting={submitting} />;
      case "copy": return <CopywriterTerminal onSubmit={submit} submitting={submitting} />;
      case "brand": return <BrandArchitect brandName={task.brandName || "NovaBrand"} onSubmit={submit} submitting={submitting} />;
      case "seo": return <SearchOptimizerDashboard targetKeywords={task.targetKeywords || ["marketing"]} onSubmit={submit} submitting={submitting} />;
      case "campaign": return <CampaignPlannerBoard budget={task.budget || 5000} onSubmit={submit} submitting={submitting} />;
      case "survey": return <SurveyArchitect topic={task.topic || "Customer needs"} onSubmit={submit} submitting={submitting} />;
      case "launchpad": return <TheExecutiveLaunchpad productName={task.productName || "Your Product"} onSubmit={submit} submitting={submitting} />;
      default: return null;
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-50 text-zinc-900 p-4 -mx-1">
      {adminBar && isAdmin && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-100 border border-amber-300 text-[11px] text-amber-900">
          🔓 Admin Mode · Tool: <code className="font-mono font-bold">{task.tool}</code> · Milestone {milestone + 1}/{task.milestones.length}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        <CreativeDirectorSidebar
          playerName={name}
          lessonTitle={task.lessonTitle}
          clientBrief={sub(task.clientBrief, name) || ""}
          requirements={task.requirements}
          milestones={task.milestones}
          currentMilestone={milestone}
          referenceNotes={task.referenceNotes}
        />
        <section className="rounded-2xl bg-white border border-zinc-200 p-4 min-h-[400px]">
          <div key={task.tool} className="animate-in fade-in slide-in-from-bottom-2">
            {renderTool()}
          </div>
        </section>
      </div>

      {critique && (
        <CritiqueOverlay
          critique={critique}
          onClose={() => setCritique(null)}
          onContinue={() => { setCritique(null); onNext(); }}
        />
      )}

      {showResult && !critique && (
        <Button onClick={onNext} className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 text-white h-12 rounded-2xl font-bold">
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
};

export default CreativeSuiteRenderer;
