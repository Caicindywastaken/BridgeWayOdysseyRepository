import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Send, CheckCircle2, XCircle, KeyRound, ChevronDown, ChevronRight,
  Users, MessageSquare, Hash, AlertTriangle, ArrowUp, ArrowDown, Terminal, Slack,
} from "lucide-react";
import { gradeChallenge } from "@/services/gradingService";
import { toast } from "sonner";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";

/* ===================== Types ===================== */
export interface Employee {
  id: string;
  name: string;
  avatar: string; // emoji
  role: string;
  strengths: string[];
  weaknesses: string[];
}

export interface DelegationTaskItem {
  id: string;
  title: string;
  description: string;
  correctEmployeeId: string;
}

export interface CommsParticipant {
  name: string;
  avatar: string; // emoji
  role?: string;
}

export type ManagementConsoleTask =
  | {
      kind: "delegation";
      lessonTitle: string;
      managerInstructions: string; // may include {playerName}
      employees: Employee[];
      tasks: DelegationTaskItem[];
      goal: string;
      criteria: string[];
      hiddenRubric: string[];
    }
  | {
      kind: "comms_sms";
      lessonTitle: string;
      managerInstructions: string;
      participant: CommsParticipant;
      incomingMessage: string;
      goal: string;
      skill: string;
      criteria: string[];
      hiddenRubric: string[];
    }
  | {
      kind: "comms_dm";
      lessonTitle: string;
      managerInstructions: string;
      channel: string; // e.g. "#team-product"
      participant: CommsParticipant;
      incomingMessage: string;
      goal: string;
      skill: string;
      criteria: string[];
      hiddenRubric: string[];
    }
  | {
      kind: "priority_reorder";
      lessonTitle: string;
      managerInstructions: string;
      alerts: { id: string; title: string; urgency: "P0" | "P1" | "P2" | "P3"; detail: string }[];
      correctOrder: string[]; // ids ordered top->bottom
      goal: string;
      criteria: string[];
      hiddenRubric: string[];
    }
  | {
      kind: "priority_action_plan";
      lessonTitle: string;
      managerInstructions: string;
      alertTitle: string;
      alertBody: string;
      goal: string;
      skill: string;
      criteria: string[];
      hiddenRubric: string[];
    };

interface Props {
  task: ManagementConsoleTask;
  showResult: boolean;
  onAnswer: (passed: boolean) => void;
  onNext: () => void;
}

const sub = (s: string, name: string) => s.replace(/\{playerName\}/g, name);

/* ===================== Dev Rubric ===================== */
const DevRubric = ({ rubric }: { rubric: string[] }) => {
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return (
    <div className="rounded-xl border-2 border-dashed border-amber-500/60 bg-amber-500/5 p-2.5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <KeyRound className="w-3 h-3" />
        <span>Dev · Hidden Rubric (admins only)</span>
      </button>
      {open && (
        <div className="mt-2 text-[11px] text-foreground/85 leading-snug">
          <p className="font-bold text-amber-700 dark:text-amber-400 mb-1">Keywords / criteria for full marks:</p>
          <ul className="list-disc pl-4 space-y-0.5 opacity-90">
            {rubric.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <p className="text-[10px] opacity-70 pt-1.5 mt-1.5 border-t border-amber-500/30">
            Pass threshold: 70/100 · Grader: <code>ai-grade · type: leadership_console</code>
          </p>
        </div>
      )}
    </div>
  );
};

/* ===================== DELEGATION UI ===================== */
const DelegationConsole = ({ task, name, onSubmit, disabled, grading }: any) => {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const ready = task.tasks.every((t: DelegationTaskItem) => assignments[t.id]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1"><Users className="w-3 h-3" /> Team Roster</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
          {task.employees.map((e: Employee) => (
            <div key={e.id} className="rounded-xl border border-border bg-background/60 p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-xl">{e.avatar}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{e.role}</p>
                </div>
              </div>
              <p className="text-[10px] mt-1.5"><span className="font-bold text-success">+ </span>{e.strengths.join(", ")}</p>
              <p className="text-[10px]"><span className="font-bold text-destructive">– </span>{e.weaknesses.join(", ")}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Assign Each Task</p>
        <div className="space-y-2 mt-1.5">
          {task.tasks.map((t: DelegationTaskItem) => (
            <div key={t.id} className="rounded-xl border border-border bg-background/40 p-2.5">
              <p className="text-xs font-semibold">{t.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {task.employees.map((e: Employee) => (
                  <button
                    key={e.id}
                    disabled={disabled}
                    onClick={() => setAssignments(p => ({ ...p, [t.id]: e.id }))}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                      assignments[t.id] === e.id
                        ? "world-themed-gradient text-primary-foreground border-transparent"
                        : "border-border hover:border-primary/60 bg-background/60"
                    }`}
                  >
                    {e.avatar} {e.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={() => onSubmit({ assignments })}
        disabled={!ready || disabled || grading}
        className="w-full world-themed-gradient world-themed-glow text-primary-foreground rounded-xl h-10"
      >
        {grading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Manager reviewing…</> : <><Send className="w-4 h-4 mr-1" /> Submit Delegation Plan</>}
      </Button>
    </div>
  );
};

/* ===================== SMS COMMS UI ===================== */
const SmsConsole = ({ task, name, onSubmit, disabled, grading }: any) => {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <div className="w-full max-w-[340px] mx-auto rounded-[2rem] bg-zinc-900 p-2 shadow-2xl border-4 border-zinc-800">
        <div className="rounded-[1.5rem] bg-white dark:bg-zinc-950 overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
          <div className="flex flex-col items-center gap-0.5 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-lg">{task.participant.avatar}</div>
            <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{task.participant.name}</p>
            {task.participant.role && <p className="text-[9px] text-zinc-500">{task.participant.role}</p>}
          </div>
          <div className="flex-1 px-3 py-2 space-y-1.5 bg-white dark:bg-zinc-950">
            <div className="flex justify-start">
              <div className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[12px] px-3 py-1.5 rounded-2xl rounded-bl-md max-w-[80%] whitespace-pre-line">{sub(task.incomingMessage, name)}</div>
            </div>
            {draft && (
              <div className="flex justify-end">
                <div className="bg-[#0a84ff] text-white text-[12px] px-3 py-1.5 rounded-2xl rounded-br-md max-w-[80%] whitespace-pre-line">{draft}</div>
              </div>
            )}
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50 dark:bg-zinc-900">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} disabled={disabled} placeholder="iMessage" className="min-h-[60px] text-[12px] readable-field rounded-2xl resize-none" />
          </div>
        </div>
      </div>
      <Button onClick={() => onSubmit({ reply: draft })} disabled={!draft.trim() || disabled || grading} className="w-full world-themed-gradient world-themed-glow text-primary-foreground rounded-xl h-10">
        {grading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Coach reviewing…</> : <><Send className="w-4 h-4 mr-1" /> Send Message</>}
      </Button>
    </div>
  );
};

/* ===================== DM/Slack COMMS UI ===================== */
const DmConsole = ({ task, name, onSubmit, disabled, grading }: any) => {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between bg-[#4a154b] text-white px-3 py-2">
          <div className="flex items-center gap-2"><Slack className="w-4 h-4" /><p className="text-xs font-bold">{task.channel}</p></div>
          <Hash className="w-3.5 h-3.5 opacity-80" />
        </div>
        <div className="px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-950 min-h-[160px]">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#4a154b] to-purple-400 flex items-center justify-center text-base text-white">{task.participant.avatar}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">{task.participant.name} <span className="text-[9px] text-slate-500 font-normal ml-1">{task.participant.role}</span></p>
              <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line mt-0.5">{sub(task.incomingMessage, name)}</p>
            </div>
          </div>
          {draft && (
            <div className="flex items-start gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">YOU</div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold">{name} <span className="text-[9px] text-slate-500 font-normal">Manager</span></p>
                <p className="text-xs whitespace-pre-line mt-0.5">{draft}</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} disabled={disabled} placeholder={`Message ${task.channel}…`} className="min-h-[100px] text-xs resize-none readable-field" />
        </div>
      </div>
      <Button onClick={() => onSubmit({ reply: draft })} disabled={!draft.trim() || disabled || grading} className="w-full world-themed-gradient world-themed-glow text-primary-foreground rounded-xl h-10">
        {grading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Coach reviewing…</> : <><Send className="w-4 h-4 mr-1" /> Post Message</>}
      </Button>
    </div>
  );
};

/* ===================== PRIORITY REORDER UI ===================== */
const ReorderConsole = ({ task, onSubmit, disabled, grading }: any) => {
  const [order, setOrder] = useState<string[]>(task.alerts.map((a: any) => a.id));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  const urgencyColor = (u: string) =>
    u === "P0" ? "bg-destructive/20 text-destructive border-destructive/40"
    : u === "P1" ? "bg-amber-500/20 text-amber-600 border-amber-500/40"
    : u === "P2" ? "bg-sky-500/20 text-sky-600 border-sky-500/40"
    : "bg-muted text-muted-foreground border-border";
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <p className="text-[11px] font-bold">System Alerts — Reorder by true priority (top = handle first)</p>
      </div>
      <div className="space-y-2">
        {order.map((id, i) => {
          const a = task.alerts.find((x: any) => x.id === id)!;
          return (
            <div key={id} className="rounded-xl border border-border bg-background/60 p-2.5 flex items-start gap-2">
              <div className="flex flex-col gap-0.5">
                <button disabled={disabled || i === 0} onClick={() => move(i, -1)} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                <button disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${urgencyColor(a.urgency)}`}>{a.urgency}</span>
                  <p className="text-xs font-semibold truncate">{a.title}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">#{i + 1}</div>
            </div>
          );
        })}
      </div>
      <Button onClick={() => onSubmit({ order })} disabled={disabled || grading} className="w-full world-themed-gradient world-themed-glow text-primary-foreground rounded-xl h-10">
        {grading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Reviewing priorities…</> : <><Send className="w-4 h-4 mr-1" /> Submit Priority Order</>}
      </Button>
    </div>
  );
};

/* ===================== ACTION-PLAN TERMINAL UI ===================== */
const ActionPlanConsole = ({ task, name, onSubmit, disabled, grading }: any) => {
  const [plan, setPlan] = useState("");
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-3">
        <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /><p className="text-xs font-bold text-destructive">SYSTEM ALERT · {task.alertTitle}</p></div>
        <p className="text-[11px] mt-1.5 whitespace-pre-line">{sub(task.alertBody, name)}</p>
      </div>
      <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 font-mono">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mb-1.5"><Terminal className="w-3 h-3" /> manager@console ~ % action-plan</div>
        <Textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          disabled={disabled}
          placeholder="1. Step one…&#10;2. Step two…&#10;3. Step three…"
          className="min-h-[140px] text-[12px] readable-field resize-none font-mono"
        />
      </div>
      <Button onClick={() => onSubmit({ plan })} disabled={!plan.trim() || disabled || grading} className="w-full world-themed-gradient world-themed-glow text-primary-foreground rounded-xl h-10">
        {grading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Executive reviewing…</> : <><Send className="w-4 h-4 mr-1" /> Execute Plan</>}
      </Button>
    </div>
  );
};

/* ===================== Main wrapper ===================== */
const ManagementConsoleRenderer = ({ task, showResult, onAnswer, onNext }: Props) => {
  const { playerName } = useGame();
  const name = (playerName && playerName.trim() && playerName !== "Space Cadet") ? playerName : "Manager";
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; passed: boolean; coaches_note?: string; criteria_scores?: Record<string, { score: number; met: boolean }> } | null>(null);

  const handleSubmit = async (userAnswer: any) => {
    if (grading || feedback) return;
    setGrading(true);
    try {
      const data = await gradeChallenge(
        "leadership_console",
        userAnswer,
        {
          kind: task.kind,
          lessonTitle: task.lessonTitle,
          instructions: sub(task.managerInstructions, name),
          // include kind-specific context
          ...(task.kind === "delegation" && { employees: task.employees, tasks: task.tasks }),
          ...(task.kind === "comms_sms" || task.kind === "comms_dm" ? { incomingMessage: task.incomingMessage, participant: task.participant, skill: (task as any).skill } : {}),
          ...(task.kind === "priority_reorder" && { alerts: task.alerts, correctOrder: task.correctOrder }),
          ...(task.kind === "priority_action_plan" && { alertTitle: task.alertTitle, alertBody: task.alertBody, skill: task.skill }),
          goal: task.goal,
        },
        task.criteria,
        name
      );
      setFeedback(data);
      onAnswer(!!data.passed);
    } catch (e) {
      console.error("Mgmt console grading error:", e);
      toast.error("Could not grade your response. Please try again.");
    }
    setGrading(false);
  };

  const kindLabel: Record<ManagementConsoleTask["kind"], string> = {
    delegation: "Delegation Workspace",
    comms_sms: "Internal Chat (SMS)",
    comms_dm: "Enterprise DM",
    priority_reorder: "Priority Dashboard",
    priority_action_plan: "Incident Console",
  };

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="glass-card rounded-2xl p-3 border-2 world-themed-border">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Manager · Brief</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">{kindLabel[task.kind]}</span>
        </div>
        <p className="text-sm font-bold mt-1">{task.lessonTitle}</p>
        <p className="text-xs text-muted-foreground mt-1">Good morning, Manager {name}. {sub(task.managerInstructions, name)}</p>
        <p className="text-[11px] mt-2"><span className="font-bold text-accent">Goal:</span> {sub(task.goal, name)}</p>
      </div>

      <DevRubric rubric={task.hiddenRubric} />

      {task.kind === "delegation" && <DelegationConsole task={task} name={name} onSubmit={handleSubmit} disabled={showResult || !!feedback} grading={grading} />}
      {task.kind === "comms_sms" && <SmsConsole task={task} name={name} onSubmit={handleSubmit} disabled={showResult || !!feedback} grading={grading} />}
      {task.kind === "comms_dm" && <DmConsole task={task} name={name} onSubmit={handleSubmit} disabled={showResult || !!feedback} grading={grading} />}
      {task.kind === "priority_reorder" && <ReorderConsole task={task} onSubmit={handleSubmit} disabled={showResult || !!feedback} grading={grading} />}
      {task.kind === "priority_action_plan" && <ActionPlanConsole task={task} name={name} onSubmit={handleSubmit} disabled={showResult || !!feedback} grading={grading} />}

      {feedback && (
        <div className={`glass-card rounded-2xl p-3 border-2 ${feedback.passed ? "border-success/50" : "border-destructive/50"}`}>
          <div className="flex items-center gap-2">
            {feedback.passed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-destructive" />}
            <p className="text-sm font-bold">
              {feedback.passed ? "Executive Coach approved" : "Needs another pass"} · Score {feedback.score}/100
            </p>
          </div>
          {feedback.coaches_note && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{feedback.coaches_note}</p>}
          {feedback.criteria_scores && (
            <div className="mt-2 space-y-1">
              {Object.entries(feedback.criteria_scores).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[11px]">
                  <span className="truncate pr-2">{v.met ? "✅" : "⚠️"} {k}</span>
                  <span className="font-mono font-bold">{v.score}/100</span>
                </div>
              ))}
            </div>
          )}
          <Button onClick={onNext} className="w-full world-themed-gradient world-themed-glow text-primary-foreground rounded-xl h-10 mt-3 font-bold">
            Next →
          </Button>
        </div>
      )}
    </div>
  );
};

export default ManagementConsoleRenderer;
