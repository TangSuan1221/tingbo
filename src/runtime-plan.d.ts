declare module "virtual:runtime-plan" {
  export type BrowserRuntimePlan = {
    advance?: boolean;
    dialogueSource?: string;
    dialogueModel?: string;
    knowledgeVersion?: string;
    intent: string;
    reply: string;
    duration: number;
    prompt: string;
    referenceUrl: string;
  };

  export function buildBrowserRuntimePlan(input: {
    promptId: string;
    message: string;
    evidenceTags?: string[];
    history?: { role: "user" | "assistant"; content: string }[];
  }, decision?: unknown): BrowserRuntimePlan;
  export function supportsDialogue(promptId: string): boolean;
  export function buildDialogueMessages(input: unknown): { knowledge: unknown; system: string; messages: { role: string; content: string }[] };
  export function parseDialogueResponse(payload: unknown, input: unknown, knowledge: unknown): unknown;
}
