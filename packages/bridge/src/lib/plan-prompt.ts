import { SYSTEM_PROMPT } from "@/lib/prompt";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

function extractUserMessageText(message: any): string {
  return message.parts?.find((p: any) => p.type === "text")?.text || "";
}

function sanitizePlanName(userText: string, providedName?: string): string {
  if (providedName) {
    return providedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

async function readPlanFile(
  context: ToolExecutionContext | null,
  planName: string,
): Promise<string | null> {
  if (!context) return null;

  try {
    const planFilePath = `.ama/plan.${planName}.md`;
    const planResult = (await executeTool(context, "readFile", {
      relative_file_path: planFilePath,
      should_read_entire_file: true,
    })) as { success?: boolean; content?: string };

    return planResult.success && planResult.content ? planResult.content : null;
  } catch {
    return null;
  }
}

function buildPlanExecutionPrompt(planContent: string): string {
  return `${SYSTEM_PROMPT}

## PLAN EXECUTION MODE
You are executing a plan. Read the plan below and execute it step by step:

${planContent}

Follow the plan exactly, executing each step in order.`;
}

function buildPlanCreationPrompt(planName: string): string {
  return `${SYSTEM_PROMPT}

## PLAN CREATION MODE
You are creating a plan. The user wants you to create a structured plan file.

**IMPORTANT INSTRUCTIONS:**
1. Create a comprehensive, step-by-step plan based on the user's request
2. The plan should be saved as: \`.ama/plan.${planName}.md\`
3. Use the \`editFile\` tool to create this file
4. The plan should include:
   - Plan title/name
   - Description of the task
   - Step-by-step implementation plan
   - File changes needed
   - Dependencies/considerations
5. Write the plan in clear markdown format
6. After creating the plan file, inform the user that the plan has been created and saved to \`.ama/plan.${planName}.md\`

Create the plan file now.`;
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
    if (planContent) {
      return buildPlanExecutionPrompt(planContent);
    }
  }

  if (planMode) {
    const userMessageText = extractUserMessageText(userMessage);
    const sanitizedPlanName = sanitizePlanName(userMessageText, planName);
    return buildPlanCreationPrompt(sanitizedPlanName);
  }

  return SYSTEM_PROMPT;
}
