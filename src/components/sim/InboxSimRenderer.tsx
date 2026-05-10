import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Mail, Linkedin, CheckCircle2, XCircle, KeyRound, ChevronDown, ChevronRight, MessageSquare, Phone, Video, MoreVertical, Signal, Wifi, BatteryFull } from "lucide-react";
import { gradeChallenge } from "@/services/gradingService";
import { toast } from "sonner";
import { useGame } from "@/context/GameContext";
import { useAdmin } from "@/context/AdminContext";
import type { InboxSimTask } from "@/data/courseData";

interface Props {
  title: string;
  task: InboxSimTask;
  showResult: boolean;
  onAnswer: (passed: boolean) => void;
  onNext: () => void;
}

const sub = (s: string | undefined, name: string) =>
  typeof s === "string" ? s.replace(/\{playerName\}/g, name) : s;

const channelLabel: Record<InboxSimTask["channel"], string> = {
  whatsapp: "WhatsApp",
  email: "Email Inbox",
  linkedin: "LinkedIn DM",
  sms: "Messages",
};

/* ------------- Dev Rubric (admin only) ------------- */
const DevRubric = ({ task }: { task: InboxSimTask }) => {
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
        <span>Dev · AI Grading Rubric (admins only)</span>
      </button>
      {open && (
        <div className="mt-2 text-[11px] text-foreground/85 leading-snug space-y-2">
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-400">Skill being tested</p>
            <p className="opacity-80">{task.skill}</p>
          </div>
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-400">Goal</p>
            <p className="opacity-80">{task.goal}</p>
          </div>
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-400">Scoring criteria (each weighted equally, /100)</p>
            <ol className="list-decimal pl-4 space-y-0.5 opacity-90">
              {(task.criteria || []).map((c, i) => <li key={i}>{c}</li>)}
            </ol>
          </div>
          <div className="text-[10px] opacity-70 pt-1 border-t border-amber-500/30">
            Pass threshold: 70/100 · Grader: <code>ai-grade · type: inbox_sim</code>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------- iMessage / SMS phone frame ------------- */
const SmsFrame = ({ client, incoming, draft, setDraft, disabled, footer }: any) => (
  <div className="flex flex-col items-center">
    <div className="w-full max-w-[320px] mx-auto rounded-[2.2rem] bg-zinc-900 p-2 shadow-2xl border-4 border-zinc-800">
      <div className="rounded-[1.7rem] bg-white dark:bg-zinc-950 overflow-hidden flex flex-col" style={{ minHeight: 460 }}>
        {/* status bar */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[10px] text-zinc-800 dark:text-zinc-200 font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1"><Signal className="w-2.5 h-2.5" /><Wifi className="w-2.5 h-2.5" /><BatteryFull className="w-3 h-3" /></span>
        </div>
        {/* contact header */}
        <div className="flex flex-col items-center gap-0.5 py-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-base">{client.avatarEmoji || "🧑"}</div>
          <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{client.name}</p>
          <p className="text-[9px] text-zinc-500">iMessage</p>
        </div>
        {/* messages */}
        <div className="flex-1 px-3 py-2 space-y-1.5 bg-white dark:bg-zinc-950">
          {incoming && (
            <div className="flex justify-start">
              <div className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[12px] px-3 py-1.5 rounded-2xl rounded-bl-md max-w-[80%] whitespace-pre-line">{incoming}</div>
            </div>
          )}
          {draft && (
            <div className="flex justify-end">
              <div className="bg-[#0a84ff] text-white text-[12px] px-3 py-1.5 rounded-2xl rounded-br-md max-w-[80%] whitespace-pre-line">{draft}</div>
            </div>
          )}
        </div>
        {/* composer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50 dark:bg-zinc-900">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={disabled}
            placeholder="iMessage"
            className="min-h-[60px] text-[12px] readable-field rounded-2xl resize-none"
          />
        </div>
      </div>
    </div>
    {footer}
  </div>
);

/* ------------- LinkedIn DM frame ------------- */
const LinkedinFrame = ({ client, incoming, draft, setDraft, disabled, footer }: any) => (
  <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
    {/* LinkedIn header */}
    <div className="flex items-center justify-between bg-[#0a66c2] text-white px-3 py-2">
      <div className="flex items-center gap-2">
        <Linkedin className="w-4 h-4" />
        <p className="text-xs font-bold">Messaging</p>
      </div>
      <div className="flex items-center gap-2 opacity-90">
        <Phone className="w-3.5 h-3.5" /><Video className="w-3.5 h-3.5" /><MoreVertical className="w-3.5 h-3.5" />
      </div>
    </div>
    {/* contact strip */}
    <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0a66c2] to-sky-400 flex items-center justify-center text-lg text-white shadow">{client.avatarEmoji || "🧑"}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{client.name}</p>
        <p className="text-[10px] text-slate-500">{client.status} · Active now</p>
      </div>
    </div>
    {/* thread */}
    <div className="px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-950 min-h-[160px]">
      {incoming && (
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs">{client.avatarEmoji || "🧑"}</div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs px-3 py-2 rounded-lg rounded-tl-none max-w-[85%] whitespace-pre-line shadow-sm">{incoming}</div>
        </div>
      )}
      {draft && (
        <div className="flex items-start gap-2 flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-[#0a66c2] flex items-center justify-center text-xs text-white">You</div>
          <div className="bg-[#e8f0fe] dark:bg-[#0a66c2]/20 border border-[#0a66c2]/30 text-slate-900 dark:text-slate-100 text-xs px-3 py-2 rounded-lg rounded-tr-none max-w-[85%] whitespace-pre-line">{draft}</div>
        </div>
      )}
    </div>
    {/* composer */}
    <div className="border-t border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        placeholder="Write a professional message…"
        className="min-h-[90px] text-xs resize-none readable-field"
      />
    </div>
    {footer && <div className="px-2 pb-2">{footer}</div>}
  </div>
);

/* ------------- WhatsApp frame ------------- */
const WhatsappFrame = ({ client, incoming, draft, setDraft, disabled, footer }: any) => (
  <div className="rounded-2xl overflow-hidden border border-emerald-700/40 shadow-lg bg-[#ece5dd] dark:bg-[#0b141a]">
    <div className="bg-[#075e54] text-white px-3 py-2 flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">{client.avatarEmoji || "🧑"}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{client.name}</p>
        <p className="text-[10px] opacity-80">online</p>
      </div>
      <Phone className="w-3.5 h-3.5 opacity-90" />
      <Video className="w-3.5 h-3.5 opacity-90" />
    </div>
    <div className="px-3 py-3 space-y-1.5 min-h-[180px]" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, rgba(0,0,0,0.04) 0 1px, transparent 1px)", backgroundSize: "10px 10px" }}>
      {incoming && (
        <div className="flex justify-start">
          <div className="bg-white dark:bg-[#202c33] text-zinc-900 dark:text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg rounded-tl-none max-w-[80%] shadow whitespace-pre-line">{incoming}</div>
        </div>
      )}
      {draft && (
        <div className="flex justify-end">
          <div className="bg-[#dcf8c6] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-100 text-xs px-2.5 py-1.5 rounded-lg rounded-tr-none max-w-[80%] shadow whitespace-pre-line">{draft}</div>
        </div>
      )}
    </div>
    <div className="border-t border-black/10 p-2 bg-[#f0f0f0] dark:bg-[#1f2c33]">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        placeholder="Type a message"
        className="min-h-[70px] text-xs resize-none rounded-2xl readable-field border-none"
      />
    </div>
    {footer && <div className="px-2 pb-2 bg-[#f0f0f0] dark:bg-[#1f2c33]">{footer}</div>}
  </div>
);

/* ------------- Email frame ------------- */
const EmailFrame = ({ client, incoming, draft, setDraft, disabled, footer, scenario }: any) => (
  <div className="rounded-2xl border-2 border-sky-400/40 bg-gradient-to-br from-sky-500/10 to-sky-700/5 p-3">
    <div className="flex items-center gap-2 mb-2">
      <Mail className="w-4 h-4" />
      <p className="text-xs font-bold">Email Inbox</p>
    </div>
    {incoming && (
      <div className="rounded-xl bg-background/80 border border-border p-2 mb-2">
        <p className="text-[10px] uppercase font-bold text-muted-foreground">From: {client.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">Subject: {scenario}</p>
        <p className="text-xs whitespace-pre-line mt-1.5">{incoming}</p>
      </div>
    )}
    <div className="rounded-xl bg-background/70 border border-border p-2">
      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Your reply</p>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        placeholder="Compose your professional reply…"
        className="min-h-[140px] text-xs resize-none"
      />
    </div>
    {footer}
  </div>
);

const InboxSimRenderer = ({ title, task, showResult, onAnswer, onNext }: Props) => {
  const { playerName } = useGame();
  const name = (playerName && playerName.trim() && playerName !== "Space Cadet") ? playerName : "Cadet";
  const [draft, setDraft] = useState(sub(task.initialDraft, name) || "");
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; passed: boolean; coaches_note: string; criteria_scores?: Record<string, { score: number; met: boolean }> } | null>(null);

  const handleSubmit = async () => {
    if (!draft.trim() || grading) return;
    setGrading(true);
    try {
      const data = await gradeChallenge(
        "inbox_sim",
        draft,
        {
          channel: task.channel,
          taskKind: task.taskKind,
          client: task.client,
          scenario: sub(task.scenario, name),
          incomingMessage: task.incomingMessage,
          initialDraft: sub(task.initialDraft, name),
          goal: sub(task.goal, name),
          skill: task.skill,
        },
        task.criteria || [],
        name
      );
      setFeedback(data as any);
      onAnswer(!!data.passed);
    } catch (e) {
      console.error("Inbox sim grading error:", e);
      toast.error("Could not grade your reply. Please try again.");
      setGrading(false);
      return;
    }
    setGrading(false);
  };

  const sendButton = !feedback ? (
    <Button
      onClick={handleSubmit}
      disabled={grading || !draft.trim()}
      className="w-full mt-2 world-themed-gradient world-themed-glow text-primary-foreground rounded-xl h-10"
    >
      {grading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sending to manager…</> : <><Send className="w-4 h-4 mr-1" /> Send Reply</>}
    </Button>
  ) : null;

  const frameProps = {
    client: task.client,
    incoming: task.incomingMessage,
    draft,
    setDraft,
    disabled: showResult,
    footer: sendButton,
    scenario: sub(task.scenario, name),
  };

  const renderFrame = () => {
    switch (task.channel) {
      case "sms": return <SmsFrame {...frameProps} />;
      case "linkedin": return <LinkedinFrame {...frameProps} />;
      case "whatsapp": return <WhatsappFrame {...frameProps} />;
      case "email":
      default: return <EmailFrame {...frameProps} />;
    }
  };

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Manager instructions */}
      <div className="glass-card rounded-2xl p-3 border-2 world-themed-border">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">📋 Manager · Brief</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">{channelLabel[task.channel]}</span>
        </div>
        <p className="text-sm font-bold mt-1">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub(task.managerInstructions, name)}</p>
        <p className="text-[11px] mt-2"><span className="font-bold text-accent">Skill:</span> {task.skill}</p>
        <p className="text-[11px]"><span className="font-bold text-accent">Goal:</span> {sub(task.goal, name)}</p>
      </div>

      {/* Dev rubric */}
      <DevRubric task={task} />

      {/* Split-screen */}
      <div className="grid grid-cols-1 md:grid-cols-[40%_1fr] gap-3">
        {/* LEFT: Client Profile */}
        <div className="glass-card rounded-2xl p-3 border border-border">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Client Profile</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-2xl border world-themed-border">
              {task.client.avatarEmoji || "🧑"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{task.client.name}</p>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent mt-0.5">{task.client.status}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{task.client.background}</p>
          <div className="mt-3 pt-2 border-t border-border">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Scenario</p>
            <p className="text-[11px] mt-1">{sub(task.scenario, name)}</p>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            <span>Channel: <span className="font-bold text-foreground">{channelLabel[task.channel]}</span></span>
          </div>
        </div>

        {/* RIGHT: Channel-specific frame */}
        <div>
          {renderFrame()}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`glass-card rounded-2xl p-3 border-2 ${feedback.passed ? "border-success/50" : "border-destructive/50"}`}>
          <div className="flex items-center gap-2">
            {feedback.passed
              ? <CheckCircle2 className="w-5 h-5 text-success" />
              : <XCircle className="w-5 h-5 text-destructive" />}
            <p className="text-sm font-bold">
              {feedback.passed ? "Manager approved" : "Needs another pass"} · Score {feedback.score}/100
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

export default InboxSimRenderer;
