import { SYSTEM_PROMPT } from "@/lib/prompt";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

function extractUserMessageText(message: any): string {
  return message.parts?.find((p: any) => p.type === "text")?.text || "";
}

function sanitizePlanName(userText: string, providedName?: string): string {
  if (providedName) {
    return providedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  return (
    userText
      .replace(/^\/(plan|plan:)\s*/i, "")
      .replace(/^plan:\s*/i, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "plan"
  );
}

async function readPlanFile(context: ToolExecutionContext | null, planName: string): Promise<string | null> {
  if (!context) return null;

  try {
    const planFilePath = `.ama/plan.${planName}.md`;
    const planResult = (await executeTool(context, "read", { path: planFilePath })) as {
      success?: boolean;
      content?: string;
    };

    return planResult.success && planResult.content ? planResult.content : null;
  } catch {
    return null;
  }
}

function buildPlanExecutionPrompt(planContent: string): string {
  return `${SYSTEM_PROMPT}\n\n## PLAN EXECUTION MODE\nExecute the plan below step by step:\n\n${planContent}`;
}

function buildPlanCreationPrompt(planName: string): string {
  return `${SYSTEM_PROMPT}\n\n## PLAN CREATION MODE\nCreate a structured plan and save it to .ama/plan.${planName}.md using the write tool.`;
}

export async function buildPlanSystemPrompt(
  planMode: boolean,
  executePlan: boolean,
  planName: string | undefined,
  userMessage: any,
  _projectCwd?: string,
  toolContext: ToolExecutionContext | null = null,
): Promise<string> {
  if (executePlan && planName) {
    const planContent = await readPlanFile(toolContext, planName);
    if (planContent) return buildPlanExecutionPrompt(planContent);
  }

  if (planMode) {
    const userMessageText = extractUserMessageText(userMessage);
    const sanitizedPlanName = sanitizePlanName(userMessageText, planName);
    return buildPlanCreationPrompt(sanitizedPlanName);
  }

  return SYSTEM_PROMPT;
}
