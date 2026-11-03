import { buildDialogueMessages, parseDialogueResponse } from './dialogue-core.mjs';
export { validateDecision, composeDialoguePlan, supportsDialogue } from './dialogue-core.mjs';

export async function reasonDialogue(input, { fetchImpl = fetch } = {}) {
  const { knowledge, system, messages } = buildDialogueMessages(input);
  const response = await fetchImpl(`${(process.env.DIALOGUE_BASE_URL || process.env.H3_BASE_URL || 'https://llm-proxy.forgeax.com').replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.DIALOGUE_API_KEY || process.env.LITELLM_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.DIALOGUE_MODEL || 'auto', messages: [
      { role: 'system', content: system }, ...messages
    ], max_tokens: 700 }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new Error(`剧情AI调用失败（HTTP ${response.status}），未改用预设台词。`);
  const payload = await response.json();
  return parseDialogueResponse(payload, input, knowledge);
}
