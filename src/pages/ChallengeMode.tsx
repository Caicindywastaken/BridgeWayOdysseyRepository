import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Star, ChevronRight, Rocket, Sparkles, Zap, Send, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { worlds, type Question } from "@/data/courseData";
import { useGame } from "@/context/GameContext";
import Confetti from "@/components/Confetti";
import PageTransition from "@/components/PageTransition";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { gradeChallenge } from "@/services/gradingService";
import { toast } from "sonner";
import { worldThemeStyle } from "@/lib/worldTheme";
import EmailClientSim from "@/components/sim/EmailClientSim";
import SpreadsheetSim from "@/components/sim/SpreadsheetSim";
import DocumentSim from "@/components/sim/DocumentSim";
import CalendarSim from "@/components/sim/CalendarSim";
import VoiceCallSim from "@/components/sim/VoiceCallSim";
import FileExplorerSim from "@/components/sim/FileExplorerSim";
import BossDashboardSim from "@/components/sim/BossDashboardSim";
import InboxSimRenderer from "@/components/sim/InboxSimRenderer";
import CodeIdeRenderer from "@/components/sim/CodeIdeRenderer";
import CreativeSuiteRenderer from "@/components/sim/CreativeSuiteRenderer";
import BoardroomRenderer from "@/components/sim/BoardroomRenderer";
import SalesFloorRenderer from "@/components/sim/SalesFloorRenderer";
import CreativeStudioRenderer from "@/components/sim/CreativeStudioRenderer";
import ManagementConsoleRenderer from "@/components/sim/ManagementConsoleRenderer";

const QUESTION_TIME_LIMIT = 45; // seconds, MCQ questions in Level 1 only

const ChallengeMode = () => {
  const navigate = useNavigate();
  const { worldId, levelIndex, lessonIndex } = useParams();
  const { completeLesson, powerUps, usePowerUp, playerName } = useGame();
  const { playCorrect, playWrong, playLevelUp, playClick } = useSoundEffects();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [showResult, setShowResult] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  // Each replay bumps this so questions reshuffle
  const [replayKey, setReplayKey] = useState(0);
  // Active power-ups for the CURRENT question (consumed from inventory when activated)
  const [hintActive, setHintActive] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  // If user clicks a power-up AFTER answering, it's queued for the next question
  const [pendingHint, setPendingHint] = useState(false);
  const [pendingShield, setPendingShield] = useState(false);
  // Timer for Level 1 MCQs
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);

  const world = worlds.find(w => w.id === worldId);
  const li = Number(levelIndex);
  const si = Number(lessonIndex);
  const lesson = world?.levels[li]?.lessons[si];

  // Filter out flashcards (moved to study phase), reshuffle on each replay, take first 8
  const quiz = useMemo(() => {
    if (!lesson) return [];
    const pool = lesson.questions.filter(q => q.type !== "flashcard");
    // Fisher–Yates shuffle — `replayKey` is in deps so retry produces a fresh order
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const sliced = shuffled.slice(0, 8);
    // Substitute {playerName} token in all user-facing string fields so questions
    // address the cadet by their saved name. Falls back to "Cadet" if missing.
    const name = (playerName && playerName.trim() && playerName !== "Space Cadet")
      ? playerName : "Cadet";
    const sub = (s?: string) => typeof s === "string" ? s.replace(/\{playerName\}/g, name) : s;
    return sliced.map(q => ({
      ...q,
      question: sub(q.question) as string,
      scenario: sub(q.scenario),
      originalEmail: sub(q.originalEmail),
      simInstructions: sub(q.simInstructions),
      brief: sub(q.brief),
      hint: sub(q.hint),
      codeIde: q.codeIde ? {
        ...q.codeIde,
        ticket: {
          ...q.codeIde.ticket,
          title: sub(q.codeIde.ticket.title) as string,
          brief: sub(q.codeIde.ticket.brief) as string,
        },
      } : q.codeIde,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, replayKey, playerName]);

  const quizEmpty = !world || !lesson || quiz.length === 0;
  const question = !quizEmpty ? quiz[currentQ] : null;
  const totalCorrect = Object.values(answers).filter(Boolean).length;
  // Percentage-based passing: 75% of total questions in the lesson (min 1).
  const hasCodeIde = quiz.some(q => q?.type === "code_ide");
  const isSingleIde = quiz.length === 1 && quiz[0]?.type === "code_ide";
  const passThreshold = Math.max(1, Math.ceil(quiz.length * 0.8));
  const passed = totalCorrect >= passThreshold;

  // Timer applies only to MCQ questions in Level 1 (levelIndex === 0)
  const timerEnabled = !quizEmpty && li === 0 && question?.type === "mcq" && !showResult && !showCompletion;

  // Countdown effect
  useEffect(() => {
    if (!timerEnabled) return;
    if (timeLeft <= 0) {
      // Time's up — mark wrong (shield can still save if pre-activated)
      const saved = shieldActive;
      setAnswers(prev => ({ ...prev, [currentQ]: saved }));
      setShowResult(true);
      if (saved) playCorrect(); else playWrong();
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, timerEnabled, currentQ, playWrong, playCorrect, shieldActive]);

  const handleAnswer = (correct: boolean) => {
    // If shield is pre-activated and answer is wrong, convert to correct
    let finalCorrect = correct;
    if (!correct && shieldActive) {
      finalCorrect = true;
      playCorrect();
    } else {
      if (correct) playCorrect(); else playWrong();
    }
    setAnswers(prev => ({ ...prev, [currentQ]: finalCorrect }));
    setShowResult(true);
  };

  // Hint: must be activated BEFORE answering. If clicked after → queue for next question.
  const handleUseHint = () => {
    if ((powerUps.reveal || 0) <= 0) return;
    if (showResult) {
      if (pendingHint) return;
      if (usePowerUp("reveal")) {
        setPendingHint(true);
        toast.info("👁️ Hint queued for next question");
      }
      return;
    }
    if (hintActive) return;
    if (usePowerUp("reveal")) {
      setHintActive(true);
    }
  };

  // Shield: activate BEFORE answering. If clicked after → queue for next question.
  const handleUseShield = () => {
    if ((powerUps.shield || 0) <= 0) return;
    if (showResult) {
      if (pendingShield) return;
      if (usePowerUp("shield")) {
        setPendingShield(true);
        toast.info("🛡️ Shield queued for next question");
      }
      return;
    }
    if (shieldActive) return;
    if (usePowerUp("shield")) {
      setShieldActive(true);
    }
  };

  const handleNext = () => {
    playClick();
    setShowResult(false);
    // Apply queued power-ups to the next question, then clear queue
    setHintActive(pendingHint);
    setShieldActive(pendingShield);
    setPendingHint(false);
    setPendingShield(false);
    setTimeLeft(QUESTION_TIME_LIMIT);
    if (currentQ < quiz.length - 1) {
      setCurrentQ(p => p + 1);
    } else {
      const finalCorrect = Object.values({ ...answers }).filter(Boolean).length;
      completeLesson(world.id, li, si, finalCorrect, quiz.length);
      setShowCompletion(true);
      if (finalCorrect >= passThreshold) {
        setShowConfetti(true);
        playLevelUp();
      } else {
        playWrong();
      }
    }
  };

  // Completion screen
  if (showCompletion) {
    const pct = quiz.length > 0 ? totalCorrect / quiz.length : 0;
    const stars = pct >= 1 ? 3 : pct >= 0.9 ? 2 : pct >= 0.8 ? 1 : 0;
    const xpGain = passed ? 50 + stars * 20 : 10;
    return (
      <div className="min-h-screen max-w-lg mx-auto nebula-bg relative flex items-center justify-center p-6" style={worldThemeStyle(world?.id, li)}>
        <Confetti active={showConfetti} />
        <div className="starfield" />
        <div className="relative z-10 w-full glass-card rounded-3xl p-8 border-2 world-themed-border-strong text-center animate-bounce-in">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? "world-themed-gradient world-themed-glow" : "bg-destructive"}`}>
            {passed ? <Rocket className="w-10 h-10 text-primary-foreground" /> : <XCircle className="w-10 h-10 text-destructive-foreground" />}
          </div>
          <h2 className="text-2xl font-extrabold font-display mb-2">{passed ? "Mission Complete! 🚀" : "Keep Training!"}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {passed ? "You've mastered this lesson!" : `You need ${passThreshold}/${quiz.length} correct to pass`}
          </p>
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2].map(s => (
              <Star key={s} className={`w-8 h-8 transition-all ${s < stars ? "text-stars fill-stars glow-stars" : "text-muted"}`} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <p className={`text-3xl font-extrabold font-display ${passed ? "text-primary" : "text-destructive"}`}>{totalCorrect}/{quiz.length}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-xp">
                <Sparkles className="w-5 h-5" />
                <span className="text-2xl font-extrabold font-display">+{xpGain}</span>
              </div>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
            {stars > 0 && (
              <div className="text-center">
                <div className="flex items-center gap-1 text-stars">
                  <Star className="w-5 h-5 fill-stars" />
                  <span className="text-2xl font-extrabold font-display">+{stars}</span>
                </div>
                <p className="text-xs text-muted-foreground">Stars</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {!passed && (
              <Button variant="outline" onClick={() => { setCurrentQ(0); setAnswers({}); setShowResult(false); setShowCompletion(false); setShowConfetti(false); setHintActive(false); setShieldActive(false); setPendingHint(false); setPendingShield(false); setTimeLeft(QUESTION_TIME_LIMIT); setReplayKey(k => k + 1); }}
                className="flex-1 h-12 rounded-2xl border-border glass-card">
                <RotateCcw className="w-4 h-4 mr-1" /> Retry
              </Button>
            )}
            <Button onClick={() => navigate(`/world/${worldId}/${li}`)}
              className="flex-1 world-themed-gradient world-themed-glow text-primary-foreground h-12 rounded-2xl font-bold">
              {passed ? "Continue" : "Back"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not-found guard (after all hooks)
  if (quizEmpty || !question) {
    return <div className="min-h-screen flex items-center justify-center text-foreground"><p>Not found</p></div>;
  }

  return (
    <div className={`min-h-screen ${question?.type === "hifi_sim" || question?.type === "inbox_sim" ? "max-w-4xl" : question?.type === "code_ide" || question?.type === "creative_suite" || question?.type === "boardroom_sim" || question?.type === "sales_sim" || question?.type === "creative_studio" ? "max-w-6xl" : "max-w-lg"} mx-auto nebula-bg relative flex flex-col`} style={worldThemeStyle(world.id, li)}>
      <div className="starfield" />
      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="sticky top-0 z-30 glass-card border-b world-themed-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(`/world/${worldId}/${li}/${si}`)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold flex-1 font-display world-themed-text">🎮 {world.name} Challenge</span>
            <span className="text-xs text-muted-foreground font-bold">{currentQ + 1}/{quiz.length}</span>
          </div>

          {/* Power-ups bar — both buttons always visible. Click BEFORE answering for current question; click AFTER answering to queue for next question. */}
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              <Zap className="w-3.5 h-3.5 text-stars" /> Power-Ups
            </span>
            {/* Hint: only useful on MCQ; available before answering */}
            <button
              onClick={handleUseHint}
              disabled={(powerUps.reveal || 0) <= 0 || hintActive || pendingHint || (showResult && currentQ === quiz.length - 1)}
              title={showResult ? "Queue hint for next question" : "Eliminate one wrong option (MCQ only)"}
              className="relative flex items-center gap-1 px-3 py-1.5 rounded-xl gradient-orange-yellow text-background text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              👁️ Hint
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-background/30 text-[10px] font-extrabold">
                ×{powerUps.reveal || 0}
              </span>
            </button>
            {/* Shield: convert wrong answer to correct; activate before answering */}
            <button
              onClick={handleUseShield}
              disabled={(powerUps.shield || 0) <= 0 || shieldActive || pendingShield || (showResult && currentQ === quiz.length - 1)}
              title={showResult ? "Queue shield for next question" : "Auto-save a wrong answer this question"}
              className="relative flex items-center gap-1 px-3 py-1.5 rounded-xl gradient-blue-cyan text-primary-foreground text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🛡️ Shield
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-background/30 text-[10px] font-extrabold">
                ×{powerUps.shield || 0}
              </span>
            </button>
            {hintActive && <span className="text-[10px] text-stars font-bold">👁️ Hint active</span>}
            {shieldActive && <span className="text-[10px] text-secondary font-bold">🛡️ Shield active</span>}
            {pendingHint && <span className="text-[10px] text-stars font-bold">👁️ queued</span>}
            {pendingShield && <span className="text-[10px] text-secondary font-bold">🛡️ queued</span>}
            {timerEnabled && (
              <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${timeLeft <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
                <Clock className="w-3.5 h-3.5" /> {timeLeft}s
              </span>
            )}
          </div>

          <div className="flex gap-1.5">
            {quiz.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                i < currentQ ? (answers[i] ? "bg-success" : "bg-destructive") :
                i === currentQ ? "world-themed-gradient" : "bg-muted"
              }`} />
            ))}
          </div>
        </div>

        <div className="flex-1 p-4">
          <QuestionRenderer key={currentQ} question={question} showResult={showResult} onAnswer={handleAnswer} onNext={handleNext} hintUsed={hintActive} />
        </div>
      </div>
    </div>
  );
};

// Question type renderer - flashcards removed from here
const QuestionRenderer = ({ question, showResult, onAnswer, onNext, hintUsed }: {
  question: Question; showResult: boolean; onAnswer: (c: boolean) => void; onNext: () => void; hintUsed?: boolean;
}) => {
  switch (question.type) {
    case "mcq": return <MCQ q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} hintUsed={hintUsed} />;
    case "dragdrop": return <DragDrop q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "sequence": return <Sequence q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "conversation": return <Conversation q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "fillin": return <FillIn q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "scenario": return <Scenario q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "email_rewrite": return <EmailRewrite q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "workspace_sim": return <WorkspaceSim q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "hifi_sim": return <HifiSim q={question} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />;
    case "inbox_sim": return question.inboxSim
      ? <InboxSimRenderer title={question.question} task={question.inboxSim} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />
      : null;
    case "code_ide": return question.codeIde
      ? <CodeIdeRenderer task={question.codeIde} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />
      : null;
    case "creative_suite": return question.creativeSuite
      ? <CreativeSuiteRenderer task={question.creativeSuite} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />
      : null;
    case "boardroom_sim": return question.boardroomSim
      ? <BoardroomRenderer task={question.boardroomSim} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />
      : null;
    case "sales_sim": return question.salesSim
      ? <SalesFloorRenderer task={question.salesSim} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />
      : null;
    case "creative_studio": return question.creativeStudio
      ? <CreativeStudioRenderer task={question.creativeStudio} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />
      : null;
    case "management_console": return question.managementConsole
      ? <ManagementConsoleRenderer task={question.managementConsole} showResult={showResult} onAnswer={onAnswer} onNext={onNext} />
      : null;
    default: return null;
  }
};

type QProps = { q: Question; showResult: boolean; onAnswer: (c: boolean) => void; onNext: () => void };
type MCQProps = QProps & { hintUsed?: boolean };

const NextBtn = ({ onNext }: { onNext: () => void }) => (
  <Button onClick={onNext} className="w-full world-themed-gradient world-themed-glow text-primary-foreground h-12 rounded-2xl font-bold mt-4">
    Next <ChevronRight className="w-4 h-4 ml-1" />
  </Button>
);

const QCard = ({ children }: { children: React.ReactNode }) => (
  <div className="glass-card rounded-2xl p-4 border border-border mb-4 shadow-card">
    {children}
  </div>
);

// MCQ with randomized option order
const MCQ = ({ q, showResult, onAnswer, onNext, hintUsed }: MCQProps) => {
  const [selected, setSelected] = useState<number | null>(null);

  // Randomize options order
  const shuffledOrder = useMemo(() => {
    if (!q.options) return [];
    const indices = q.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [q.question, q.options]);

  // When hint is used, pick one wrong option to eliminate (deterministic for this question)
  const eliminatedIdx = useMemo(() => {
    if (!hintUsed || !q.options) return -1;
    const wrongs = q.options.map((_, i) => i).filter(i => i !== q.correctIndex);
    return wrongs[Math.floor(Math.random() * wrongs.length)];
  }, [hintUsed, q.question, q.correctIndex]);

  const handleSelect = (originalIdx: number) => {
    if (showResult) return;
    if (originalIdx === eliminatedIdx) return;
    setSelected(originalIdx);
    onAnswer(originalIdx === q.correctIndex);
  };

  // Equalize visible option lengths so the correct answer doesn't stand out
  // by being noticeably longer/shorter than the distractors. We pad shorter
  // strings with non-breaking spaces up to the longest option's length.
  const equalizedOptions = useMemo(() => {
    if (!q.options) return [] as string[];
    const maxLen = Math.max(...q.options.map(o => o.length));
    return q.options.map(o => {
      if (o.length >= maxLen) return o;
      const pad = "\u00A0".repeat(maxLen - o.length);
      return o + pad;
    });
  }, [q.options]);

  return (
    <div className="space-y-3 animate-slide-up">
      <QCard><p className="text-sm font-bold">{q.question}</p></QCard>
      {shuffledOrder.map((originalIdx, displayIdx) => {
        const opt = equalizedOptions[originalIdx];
        const isEliminated = originalIdx === eliminatedIdx;
        return (
          <button key={displayIdx} onClick={() => handleSelect(originalIdx)}
            disabled={isEliminated}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all text-sm font-medium min-h-[3.5rem] flex items-center ${
              isEliminated ? "border-border bg-muted/20 line-through opacity-30 cursor-not-allowed" :
              showResult && selected === originalIdx
                ? originalIdx === q.correctIndex ? "border-success bg-success/10 glow-success" : "border-destructive bg-destructive/10"
                : showResult && originalIdx === q.correctIndex ? "border-success bg-success/10"
                : selected === originalIdx ? "border-primary bg-primary/10" : "border-border glass-card hover:border-primary/40"
            }`}>
            <span className="text-muted-foreground mr-2 flex-shrink-0">{String.fromCharCode(65 + displayIdx)}.</span>
            <span className="flex-1 break-words">{opt}</span>
            {isEliminated && <span className="ml-2 text-xs text-muted-foreground flex-shrink-0">(eliminated)</span>}
            {showResult && originalIdx === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-success ml-2 flex-shrink-0" />}
            {showResult && selected === originalIdx && originalIdx !== q.correctIndex && <XCircle className="w-4 h-4 text-destructive ml-2 flex-shrink-0" />}
          </button>
        );
      })}
      {showResult && q.hint && <p className="text-xs text-muted-foreground glass-card rounded-xl p-3 border border-border">💡 {q.hint}</p>}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

// Drag & Drop with explanations - supports both drag (desktop) and tap-to-match (touch)
const DragDrop = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const pairs = q.pairs || [];
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const [dragOverRight, setDragOverRight] = useState<number | null>(null);
  const [touchLeft, setTouchLeft] = useState<number | null>(null);
  const shuffle = (n: number) => {
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  };
  const shuffledLeft = useMemo(() => shuffle(pairs.length), [q.question, pairs.length]);
  const shuffled = useMemo(() => shuffle(pairs.length), [q.question, pairs.length]);

  const commitMatch = (leftIdx: number, ri: number) => {
    if (showResult) return;
    const nm = { ...matches, [leftIdx]: ri };
    setMatches(nm);
    setSelLeft(null);
    setTouchLeft(null);
    if (Object.keys(nm).length === pairs.length) {
      onAnswer(Object.entries(nm).every(([l, r]) => pairs[Number(l)].right === pairs[r].right));
    }
  };

  const handleRight = (ri: number) => {
    if (showResult || selLeft === null) return;
    commitMatch(selLeft, ri);
  };

  return (
    <div className="space-y-3 animate-slide-up">
      <QCard>
        <p className="text-sm font-bold">🧩 Match the pairs</p>
        <p className="text-xs text-muted-foreground mt-1">{q.question}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Drag a card on the left onto its match — or tap one then tap its pair.</p>
      </QCard>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {shuffledLeft.map(i => {
            const matched = i in matches;
            const correct = showResult && matched && pairs[matches[i]].right === pairs[i].right;
            return (
              <button
                key={i}
                draggable={!showResult && !matched}
                onDragStart={e => {
                  if (showResult || matched) return;
                  setDragLeft(i);
                  e.dataTransfer.effectAllowed = "move";
                  try { e.dataTransfer.setData("text/plain", String(i)); } catch { /* Some touch browsers expose a partial dataTransfer API. */ }
                }}
                onDragEnd={() => setDragLeft(null)}
                onClick={() => !showResult && !matched && (setSelLeft(i), setTouchLeft(touchLeft === i ? null : i))}
                className={`w-full text-left p-3 rounded-2xl border-2 text-xs font-bold transition-all touch-manipulation ${
                  matched ? (showResult ? (correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10") : "border-primary/40 bg-primary/10")
                  : selLeft === i || touchLeft === i || dragLeft === i ? "border-primary bg-primary/10 glow-primary cursor-grabbing" : "border-border glass-card cursor-grab"
                }`}>{pairs[i].left}</button>
            );
          })}
        </div>
        <div className="space-y-2">
          {shuffled.map(oi => {
            const isMatched = Object.values(matches).includes(oi);
            const isOver = dragOverRight === oi;
            return (
              <button
                key={oi}
                onClick={() => handleRight(oi)}
                onDragOver={e => { if (!showResult && !isMatched) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverRight(oi); } }}
                onDragEnter={e => { if (!showResult && !isMatched) { e.preventDefault(); setDragOverRight(oi); } }}
                onDragLeave={() => setDragOverRight(prev => prev === oi ? null : prev)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverRight(null);
                  if (showResult || isMatched) return;
                  const raw = e.dataTransfer.getData("text/plain");
                  const src = dragLeft ?? (raw === "" ? NaN : Number(raw));
                  if (Number.isFinite(src)) commitMatch(src as number, oi);
                  setDragLeft(null);
                }}
                className={`w-full text-left p-3 rounded-2xl border-2 text-xs transition-all ${
                  isMatched ? "border-primary/30 bg-primary/5 opacity-50" :
                  isOver ? "border-primary bg-primary/15 glow-primary" :
                  "border-border glass-card hover:border-primary/40"
                }`}>{pairs[oi].right}</button>
            );
          })}
        </div>
      </div>
      {/* Explanations for each match after result */}
      {showResult && (
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <div key={i} className="glass-card rounded-xl p-2 border border-border text-xs">
              <span className="font-bold text-primary">{p.left}</span>
              <span className="text-muted-foreground"> ↔ </span>
              <span className="font-bold text-secondary">{p.right}</span>
              <span className="text-muted-foreground"> — These belong together because {p.left.toLowerCase()} is directly related to {p.right.toLowerCase()} in a professional context.</span>
            </div>
          ))}
        </div>
      )}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

// Sequence
const Sequence = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const correct = q.correctOrder || [];
  const [items, setItems] = useState(() => {
    const s = [...correct];
    for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
    return s;
  });
  const [submitted, setSubmitted] = useState(false);

  const move = (from: number, to: number) => {
    if (showResult) return;
    const n = [...items]; const [r] = n.splice(from, 1); n.splice(to, 0, r); setItems(n);
  };

  return (
    <div className="space-y-3 animate-slide-up">
      <QCard>
        <p className="text-sm font-bold">🔢 Sort in order</p>
        <p className="text-xs text-muted-foreground mt-1">{q.question}</p>
      </QCard>
      {items.map((item, i) => {
        const isCorrect = showResult && item === correct[i];
        const isWrong = showResult && item !== correct[i];
        // After submission, show each item's TRUE position in the correct order
        // so the player can see exactly where it should go. Before submission,
        // show the current slot number (1..n) as a position indicator.
        const correctPos = correct.indexOf(item) + 1;
        const displayNum = showResult ? correctPos : i + 1;
        return (
          <div key={item} className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-sm transition-all ${
            isCorrect ? "border-success bg-success/10" : isWrong ? "border-destructive bg-destructive/10" : "border-border glass-card"
          }`}>
            <span className={`text-xs font-bold w-5 ${showResult ? (isCorrect ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>{displayNum}.</span>
            <span className="flex-1 font-medium">{item}</span>
            {!showResult && (
              <div className="flex flex-col gap-0.5">
                <button onClick={() => i > 0 && move(i, i - 1)} className="text-muted-foreground hover:text-foreground text-xs px-1" disabled={i === 0}>▲</button>
                <button onClick={() => i < items.length - 1 && move(i, i + 1)} className="text-muted-foreground hover:text-foreground text-xs px-1" disabled={i === items.length - 1}>▼</button>
              </div>
            )}
          </div>
        );
      })}
      {!showResult && !submitted && (
        <Button onClick={() => { setSubmitted(true); onAnswer(items.every((it, i) => it === correct[i])); }}
          className="w-full world-themed-gradient world-themed-glow text-primary-foreground h-12 rounded-2xl font-bold">Check Order</Button>
      )}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

// Conversation
const Conversation = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const [selected, setSelected] = useState<number | null>(null);
  const responses = q.responses || [];
  const handleSelect = (i: number) => { if (showResult) return; setSelected(i); onAnswer(responses[i].correct); };

  return (
    <div className="space-y-3 animate-slide-up">
      {q.scenario && (
        <div className="flex gap-2 items-start">
          <div className="w-8 h-8 rounded-full gradient-pink-orange flex items-center justify-center text-sm flex-shrink-0">💬</div>
          <div className="glass-card rounded-2xl rounded-tl-sm p-3 flex-1 border border-border">
            <p className="text-sm">{q.scenario}</p>
          </div>
        </div>
      )}
      <QCard><p className="text-sm font-bold">{q.question}</p></QCard>
      {responses.map((r, i) => (
        <button key={i} onClick={() => handleSelect(i)}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-all text-sm ${
            showResult && selected === i
              ? r.correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
              : showResult && r.correct ? "border-success bg-success/10"
              : selected === i ? "border-primary bg-primary/10" : "border-border glass-card hover:border-primary/40"
          }`}>
          {r.text}
          {showResult && selected === i && r.feedback && (
            <p className="text-xs text-muted-foreground mt-1">💡 {r.feedback}</p>
          )}
        </button>
      ))}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

// Fill in the blank
const FillIn = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setSubmitted(true);
    const correct = q.answer?.toLowerCase().trim() || "";
    const userAnswer = input.toLowerCase().trim();
    onAnswer(correct.includes(userAnswer) || userAnswer.includes(correct));
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <QCard>
        <p className="text-sm font-bold">✍️ Fill in the blank</p>
        <p className="text-sm mt-2">{q.question}</p>
      </QCard>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !submitted && handleSubmit()}
        disabled={showResult}
        placeholder="Type your answer..."
        className={`w-full p-4 rounded-2xl border-2 text-sm font-medium bg-background text-foreground placeholder:text-muted-foreground outline-none transition-all ${
          showResult
            ? submitted && q.answer?.toLowerCase().includes(input.toLowerCase().trim())
              ? "border-success bg-success/10"
              : "border-destructive bg-destructive/10"
            : "border-border focus:border-primary"
        }`}
      />
      {showResult && (
        <p className="text-xs text-muted-foreground glass-card rounded-xl p-3 border border-border">
          ✅ Correct answer: <span className="font-bold text-success">{q.answer}</span>
          {q.hint && <span className="block mt-1">💡 {q.hint}</span>}
        </p>
      )}
      {!showResult && !submitted && (
        <Button onClick={handleSubmit} disabled={!input.trim()}
          className="w-full world-themed-gradient world-themed-glow text-primary-foreground h-12 rounded-2xl font-bold">Submit Answer</Button>
      )}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

// Scenario
const Scenario = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const [selected, setSelected] = useState<number | null>(null);

  // Randomize scenario options too
  const shuffledOrder = useMemo(() => {
    if (!q.options) return [];
    const indices = q.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [q.question, q.options]);

  const handleSelect = (originalIdx: number) => {
    if (showResult) return;
    setSelected(originalIdx);
    onAnswer(originalIdx === q.correctIndex);
  };

  // Equalize visible option lengths (same approach as MCQ)
  const equalizedOptions = useMemo(() => {
    if (!q.options) return [] as string[];
    const maxLen = Math.max(...q.options.map(o => o.length));
    return q.options.map(o => (o.length >= maxLen ? o : o + "\u00A0".repeat(maxLen - o.length)));
  }, [q.options]);

  return (
    <div className="space-y-3 animate-slide-up">
      {q.scenario && (
        <div className="glass-card rounded-2xl p-4 border-2 border-accent/30 mb-2">
          <p className="text-xs font-bold text-accent mb-1">⚖️ Scenario</p>
          <p className="text-sm">{q.scenario}</p>
        </div>
      )}
      <QCard><p className="text-sm font-bold">{q.question}</p></QCard>
      {shuffledOrder.map((originalIdx, displayIdx) => (
        <button key={displayIdx} onClick={() => handleSelect(originalIdx)}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-all text-sm font-medium min-h-[3.5rem] flex items-center ${
            showResult && selected === originalIdx
              ? originalIdx === q.correctIndex ? "border-success bg-success/10 glow-success" : "border-destructive bg-destructive/10"
              : showResult && originalIdx === q.correctIndex ? "border-success bg-success/10"
              : selected === originalIdx ? "border-primary bg-primary/10" : "border-border glass-card hover:border-primary/40"
          }`}>
          <span className="flex-1 break-words">{equalizedOptions[originalIdx]}</span>
          {showResult && originalIdx === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-success ml-2 flex-shrink-0" />}
        </button>
      ))}
      {showResult && q.hint && <p className="text-xs text-muted-foreground glass-card rounded-xl p-3 border border-border">💡 {q.hint}</p>}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

// Email Rewrite (AI-Graded)
const EmailRewrite = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const { playerName } = useGame();
  const [input, setInput] = useState("");
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  const handleSubmit = async () => {
    if (!input.trim() || grading) return;
    setGrading(true);
    try {
      const data = await gradeChallenge(
        "email_rewrite",
        input,
        { original: q.originalEmail },
        q.criteria || [],
        playerName || undefined
      );
      setFeedback(data);
      onAnswer(data.passed);
    } catch (e) {
      console.error("AI grading error:", e);
      toast.error("Could not grade your response. Please try again.");
      setGrading(false);
      return;
    }
    setGrading(false);
  };

  return (
    <div className="space-y-3 animate-slide-up">
      <QCard>
        <p className="text-sm font-bold">✉️ Email Rewrite Challenge</p>
        <p className="text-xs text-muted-foreground mt-1">{q.question}</p>
      </QCard>
      <div className="glass-card rounded-2xl p-3 border-2 border-destructive/30">
        <p className="text-xs font-bold text-destructive mb-1">❌ Original (unprofessional):</p>
        <p className="text-sm italic text-muted-foreground">"{q.originalEmail}"</p>
      </div>
      {q.criteria && (
        <div className="glass-card rounded-2xl p-3 border border-border">
          <p className="text-xs font-bold text-primary mb-1">📋 Grading Criteria:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {q.criteria.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {feedback?.criteria_scores?.[c]?.met !== undefined ? (
                  feedback.criteria_scores[c].met ? <CheckCircle2 className="w-3 h-3 text-success" /> : <XCircle className="w-3 h-3 text-destructive" />
                ) : <span className="w-3 h-3 rounded-full border border-muted-foreground inline-block" />}
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Write your professional email rewrite here..."
        disabled={showResult}
        className="min-h-[120px] rounded-2xl border-2 readable-field text-sm"
      />
      {feedback && (
        <div className={`glass-card rounded-2xl p-4 border-2 ${feedback.passed ? "border-success bg-success/10" : "border-accent bg-accent/10"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{feedback.passed ? "✅" : "📝"}</span>
            <span className="font-bold text-sm">Score: {feedback.score}/100</span>
          </div>
          <p className="text-xs text-muted-foreground">🗣️ <span className="font-bold">Coach's Note:</span> {feedback.coaches_note}</p>
        </div>
      )}
      {!showResult && !feedback && (
        <Button onClick={handleSubmit} disabled={!input.trim() || grading}
          className="w-full world-themed-gradient world-themed-glow text-primary-foreground h-12 rounded-2xl font-bold">
          {grading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Grading...</> : <><Send className="w-4 h-4 mr-1" /> Submit for AI Grading</>}
        </Button>
      )}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

// Workspace Simulation
const WorkspaceSim = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const { playerName } = useGame();
  const items = q.simItems || [];
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; passed: boolean; coaches_note: string; errors?: { type: string; description: string; consequence: string }[] } | null>(null);

  const handleSelect = (idx: number, value: string) => {
    if (showResult) return;
    setSelections(prev => ({ ...prev, [idx]: value }));
  };

  const handleSubmit = async () => {
    if (Object.keys(selections).length < items.length || grading) return;
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-grade", {
        body: {
          type: "workspace_sim",
          userAnswer: items.map((item, i) => ({ task: item.label, selected: selections[i] })),
          taskContext: {
            simType: q.simType,
            instructions: q.simInstructions,
            expected: q.simExpected,
          },
          criteria: [],
          playerName: playerName || localStorage.getItem("user_name") || undefined,
        },
      });
      if (error) throw error;
      setFeedback(data);
      onAnswer(data.passed);
    } catch (e) {
      console.error("AI grading error:", e);
      // Fallback: grade locally by comparing to targets
      const correct = items.every((item, i) => selections[i] === item.target);
      const localScore = items.filter((item, i) => selections[i] === item.target).length;
      const localPassed = localScore / items.length >= 0.7;
      setFeedback({
        score: Math.round((localScore / items.length) * 100),
        passed: localPassed,
        coaches_note: localPassed ? "Great job! You matched the tasks correctly." : "Some of your selections were incorrect. Review the correct answers above.",
      });
      onAnswer(localPassed);
    }
    setGrading(false);
  };

  return (
    <div className="space-y-3 animate-slide-up">
      <QCard>
        <p className="text-sm font-bold">🖥️ Workspace Simulation</p>
        <p className="text-xs text-muted-foreground mt-1">{q.question}</p>
      </QCard>

      {/* Split-screen style: instructions + interactive area */}
      <div className="glass-card rounded-2xl p-3 border border-border">
        <p className="text-xs font-bold text-accent mb-1">📋 Instructions:</p>
        <p className="text-xs text-muted-foreground">{q.simInstructions}</p>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const isCorrect = showResult && selections[idx] === item.target;
          const isWrong = showResult && selections[idx] !== item.target;
          return (
            <div key={idx} className={`glass-card rounded-2xl p-3 border-2 transition-all ${
              isCorrect ? "border-success bg-success/10" : isWrong ? "border-destructive bg-destructive/10" : "border-border"
            }`}>
              <p className="text-xs font-bold mb-2">{item.label}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {item.options.map(opt => (
                  <button key={opt} onClick={() => handleSelect(idx, opt)}
                    className={`text-xs p-2 rounded-xl border transition-all ${
                      selections[idx] === opt
                        ? showResult
                          ? opt === item.target ? "border-success bg-success/20 font-bold" : "border-destructive bg-destructive/20"
                          : "border-primary bg-primary/10 font-bold"
                        : showResult && opt === item.target
                          ? "border-success bg-success/10"
                          : "border-border glass-card hover:border-primary/40"
                    }`}>
                    {opt}
                    {showResult && opt === item.target && <CheckCircle2 className="w-3 h-3 text-success inline ml-1" />}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div className={`glass-card rounded-2xl p-4 border-2 ${feedback.passed ? "border-success bg-success/10" : "border-accent bg-accent/10"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{feedback.passed ? "✅" : "📝"}</span>
            <span className="font-bold text-sm">Score: {feedback.score}/100</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">🗣️ <span className="font-bold">Coach's Note:</span> {feedback.coaches_note}</p>
          {feedback.errors && feedback.errors.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-xs font-bold text-destructive">⚠️ Logical Errors:</p>
              {feedback.errors.map((err, i) => (
                <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-destructive/30">
                  <span className="font-bold">{err.type}:</span> {err.description}
                  <br /><span className="text-destructive">Impact:</span> {err.consequence}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!showResult && !feedback && (
        <Button onClick={handleSubmit} disabled={Object.keys(selections).length < items.length || grading}
          className="w-full world-themed-gradient world-themed-glow text-primary-foreground h-12 rounded-2xl font-bold">
          {grading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Evaluating...</> : <>Submit Simulation</>}
        </Button>
      )}
      {showResult && <NextBtn onNext={onNext} />}
    </div>
  );
};

export default ChallengeMode;

// High-fidelity simulation router
const HifiSim = ({ q, showResult, onAnswer, onNext }: QProps) => {
  const { playerName } = useGame();
  const data = q.simData || {};
  const common = {
    brief: q.brief || q.question,
    objectives: q.objectives || [],
    gradingCriteria: q.gradingCriteria || [],
    playerName: playerName || undefined,
    onComplete: (passed: boolean) => { onAnswer(passed); setTimeout(onNext, 600); },
  };
  if (showResult) return <div className="text-center text-xs text-muted-foreground py-8">Loading next...</div>;
  switch (q.simComponent) {
    case "email": return <EmailClientSim {...common} data={data} />;
    case "sheet": return <SpreadsheetSim {...common} data={data} />;
    case "document": return <DocumentSim {...common} data={data} />;
    case "calendar": return <CalendarSim {...common} data={data} />;
    case "voice": return <VoiceCallSim {...common} data={data} />;
    case "files": return <FileExplorerSim {...common} data={data} />;
    case "boss": return <BossDashboardSim {...common} data={data} />;
    default: return <div className="text-xs text-destructive">Unknown sim component: {q.simComponent}</div>;
  }
};
