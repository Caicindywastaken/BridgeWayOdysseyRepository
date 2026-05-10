import { gradeChallenge } from "@/services/gradingService";

export interface SimFeedback {
  score: number;
  passed: boolean;
  managerNote?: string;
  coaches_note?: string;
  errors?: { type: string; description: string; consequence: string }[];
}

export async function gradeSim(args: {
  simComponent: string;
  brief: string;
  objectives: string[];
  gradingCriteria: string[];
  userAnswer: any;
  localValidation: any;
  playerName?: string;
}): Promise<SimFeedback> {
  try {
    const data = await gradeChallenge(
      "hifi_sim",
      args.userAnswer,
      {
        simComponent: args.simComponent,
        brief: args.brief,
        objectives: args.objectives,
        localValidation: args.localValidation,
      },
      args.gradingCriteria,
      args.playerName
    );
    return data as SimFeedback;
  } catch (e) {
    // Fallback grading from local validation
    const lv = args.localValidation || {};
    const score = typeof lv.score === "number" ? lv.score : 70;
    const passed = score >= 70;
    return {
      score,
      passed,
      managerNote: lv.note || (passed
        ? "Solid execution. Keep this up and you'll handle the senior workload smoothly."
        : "Some details need polish before this is client-ready. Review the objectives and try again."),
      errors: lv.errors,
    };
  }
}
