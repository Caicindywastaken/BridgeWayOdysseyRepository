import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface GradingResponse {
  score: number;
  passed: boolean;
  coaches_note: string;
  criteria_scores?: Record<string, { score: number; met: boolean }>;
  directorCritique?: string;
  marketImpact?: string;
  boardroomCritique?: string;
  attritionRisk?: boolean;
  directorNote?: string;
  commission?: number;
  managerNote?: string;
  errors?: Array<{ type: string; description: string; consequence: string }>;
}

export const gradeChallenge = async (
  type: string,
  userAnswer: any,
  taskContext: any,
  criteria: string[],
  playerName?: string
): Promise<GradingResponse> => {
  const name = playerName || "Friend";
  const namePreamble = `You are a personalized assistant. The authenticated user's name is "${name}". ALWAYS address them by this name warmly and naturally in your coaches_note (e.g., "Great work, ${name}!" or "${name}, here's a tip..."). Never call them "User", "Player", "Student", or "Guest".\n\n`;

  let systemPrompt = "";
  let userPrompt = "";

  if (type === "email_rewrite") {
    systemPrompt = `You are a professional communication coach grading email rewrites. 
Grade the student's email rewrite based on these criteria: ${criteria.join(", ")}.`;
    userPrompt = `Original (unprofessional) message: "${taskContext.original}"
Student's rewrite: "${userAnswer}"
Grade this rewrite based on: ${criteria.join(", ")}`;
  } else if (type === "hifi_sim" || type === "workspace_sim") {
    systemPrompt = `You are the Senior Admin Supervisor at BridgeWay Odyssey grading a high-fidelity workspace simulation.
Evaluate the user's submission across THREE weighted dimensions:
- Tone (30%) — professionalism, warmth, appropriate formality
- Clarity (30%) — structure, scannability, BLUF, no ambiguity
- Technical Accuracy (40%) — correct procedure, formats, completeness, real-world consequences`;
    userPrompt = `Simulation type: ${taskContext.simComponent || taskContext.simType}
Brief: ${taskContext.brief || taskContext.instructions}
Objectives: ${(taskContext.objectives || []).join(", ")}
User submission: ${typeof userAnswer === "string" ? userAnswer : JSON.stringify(userAnswer, null, 2)}
Grade the submission as the Senior Supervisor.`;
  } else if (type === "inbox_sim") {
    systemPrompt = `You are a Senior Sales Coach grading a high-stakes customer message reply.
Grade across THREE dimensions (Tone, Skill execution, Goal achievement).`;
    userPrompt = `Trainee's submission: "${userAnswer}"
Goal: ${taskContext.goal}
Skill: ${taskContext.skill}
Scenario: ${taskContext.scenario}`;
  } else if (type === "creative_suite" || type === "creative_studio") {
    systemPrompt = `You are the Executive Creative Director of a top-tier marketing agency grading a practical.
Evaluate Aesthetic Appeal (20%), Strategic Alignment (30%), Persuasiveness (30%), Brand Consistency (20%).`;
    userPrompt = `Tool: ${taskContext.tool}
Lesson: ${taskContext.lessonTitle}
Client brief: ${taskContext.clientBrief}
User submission: ${JSON.stringify(userAnswer, null, 2)}`;
  } else if (type === "boardroom_sim") {
    systemPrompt = `You are the Chairman of the Board grading a leadership practical.
Evaluate Strategic Clarity (30%), Emotional Intelligence (30%), Decisiveness (20%), Resource Allocation (20%).`;
    userPrompt = `Mission brief: ${taskContext.clientBrief}
User submission: ${JSON.stringify(userAnswer, null, 2)}`;
  } else if (type === "sales_sim") {
    systemPrompt = `You are the Regional Sales Director grading a sales practical.
Evaluate Clarity (25%), Confidence (25%), Relevance (25%), Persuasion (25%).`;
    userPrompt = `Customer brief: ${taskContext.clientBrief}
User submission: ${JSON.stringify(userAnswer, null, 2)}`;
  } else {
    // Default fallback
    systemPrompt = `You are a professional skills coach grading a student's answer.`;
    userPrompt = `Student's answer: "${userAnswer}"`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: userPrompt,
    config: {
      systemInstruction: namePreamble + systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          passed: { type: Type.BOOLEAN },
          coaches_note: { type: Type.STRING },
          criteria_scores: {
            type: Type.OBJECT,
            description: "Detailed scores per criterion",
          },
          managerNote: { type: Type.STRING },
          directorCritique: { type: Type.STRING },
          boardroomCritique: { type: Type.STRING },
          directorNote: { type: Type.STRING },
          commission: { type: Type.NUMBER },
          attritionRisk: { type: Type.BOOLEAN },
          errors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                consequence: { type: Type.STRING },
              },
            },
          },
        },
        required: ["score", "passed", "coaches_note"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", response.text);
    return {
      score: 50,
      passed: false,
      coaches_note: "The AI evaluator had an issue, please try again.",
    };
  }
};
