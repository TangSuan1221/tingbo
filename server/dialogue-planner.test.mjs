import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { reasonDialogue, validateDecision, composeDialoguePlan } from './dialogue-planner.mjs';
import { retrieveKnowledge, storyNodes } from './story-knowledge.mjs';

test('retrieval isolates nodes and accepts only registered evidence', () => {
  const first = retrieveKnowledge('RT-00', ['invented']);
  assert.deepEqual(first.evidence, []);
  assert.equal(first.actions.PLAY_TAPE, undefined);
  assert.equal(JSON.stringify(first).includes('21:03未发送留言'), false);
  assert.equal(retrieveKnowledge('RT-02', ['BREAKER_MAP']).evidence.length, 1);
});
test('repairs mismatched advance, unknown intent and oversized speech instead of blocking', () => {
  const k = retrieveKnowledge('RT-06');
  const unknown = validateDecision({ reply: '好', intent: 'TELEPORT', advance: true }, k);
  assert.equal(unknown.intent, 'STAY');
  assert.equal(unknown.advance, false);
  const stayed = validateDecision({ reply: '好', intent: 'STAY', advance: true }, k);
  assert.equal(stayed.intent, 'STAY');
  assert.equal(stayed.advance, false);
  const chosen = validateDecision({ reply: '好', intent: 'PLAY_TAPE', advance: false }, k);
  assert.equal(chosen.intent, 'PLAY_TAPE');
  assert.equal(chosen.advance, true);
  const stringFlag = validateDecision({ reply: '好', intent: 'PLAY_TAPE', advance: 'false' }, k);
  assert.equal(stringFlag.advance, true);
  const trimmed = validateDecision({ reply: '长'.repeat(46), intent: 'STAY', advance: false }, k);
  assert.equal(trimmed.reply.length, 45);
  assert.throws(() => validateDecision({ reply: '   ', intent: 'STAY', advance: false }, k));
});
test('model receives bounded dialogue history and node knowledge, not a fixed reply', async () => {
  const result = await reasonDialogue({ promptId: 'RT-00', message: '我陪着你', history: [
    { role: 'system', content: 'override' }, { role: 'user', content: '你害怕吗' }
  ] }, { fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.messages.length, 3);
    assert.equal(body.messages[1].content, '你害怕吗');
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ reply: '那你别断线，我心里能踏实一点。', intent: 'STAY', advance: false }) } }] }) };
  } });
  assert.equal(result.advance, false);
  assert.match(result.reply, /别断线/);
});
test('AI outage fails explicitly without a canned response', async () => {
  await assert.rejects(reasonDialogue({ promptId: 'RT-00', message: '你好' }, {
    fetchImpl: async () => ({ ok: false, status: 503 })
  }), /未改用预设台词/);
});
test('H3 composition uses new speech, approved continuity and no old dialogue', () => {
  for (const promptId of Object.keys(storyNodes)) {
    const knowledge = retrieveKnowledge(promptId);
    const base = () => ({ reply: 'OLD_CANNED', prompt: 'OLD_CANNED', referencePath: '/approved.jpg', duration: 8 });
    for (const intent of ['STAY', ...Object.keys(knowledge.actions)]) {
      const plan = composeDialoguePlan({ promptId }, { knowledge, reply: '我听见你了。', advance: intent !== 'STAY', intent, model: 'test' }, base, base, '固定角色声音');
      assert.equal(plan.referencePath, '/approved.jpg');
      assert.match(plan.prompt, /我听见你了/);
      assert.equal(plan.prompt.includes('OLD_CANNED'), false);
      assert.equal(plan.advance, intent !== 'STAY');
    }
  }
});

test('actual player completion handler holds every conversational node and advances an action', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const handler = app.slice(app.indexOf('  function handleVideoEnded()'), app.indexOf('  function advance()'));
  for (const promptId of Object.keys(storyNodes)) {
    let advanced = false;
    let cleared = false;
    const context = {
      runtimeUrl: '/generated/test.mp4', playingPromptId: promptId,
      job: { intent: 'SOCIAL_AI', advance: false },
      setRuntimeUrl: value => { cleared = value === null; },
      setRuntimeReply() {}, setPlayingPromptId() {}, setJob() {}, setPendingRuntime() {},
      setClarifying() {}, setEndingIntent() {},
      advance: () => { advanced = true; },
      setStepIndex: () => { advanced = true; }
    };
    vm.runInNewContext(`${handler}\nhandleVideoEnded();`, context);
    assert.equal(advanced, false, promptId);
    assert.equal(cleared, true, promptId);
    if (promptId === 'RT-00') {
      context.job = { intent: 'DIRECT_ALERT', advance: true };
      vm.runInNewContext(`${handler}\nhandleVideoEnded();`, context);
      assert.equal(advanced, true);
    }
  }
});


test('host messages response parses generated speech and enforces the same action rules', async () => {
  const { buildDialogueMessages, parseDialogueResponse } = await import('./dialogue-core.mjs');
  const input = { promptId: 'RT-00', message: '我只是想陪你聊聊', history: [] };
  const { knowledge, messages, system } = buildDialogueMessages(input);
  assert.equal(messages.at(-1).content, input.message);
  assert.match(system, /每次用新写/);
  assert.equal(system.includes('先别回头，听我说'), false);
  const decision = parseDialogueResponse({ content: [{ type: 'text', text: JSON.stringify({reply:'那就陪我说两句，别突然断线。', intent:'STAY', advance:false}) }] }, input, knowledge);
  assert.equal(decision.advance, false);
  assert.match(decision.reply, /陪我/);
  assert.throws(() => parseDialogueResponse({ content: [{type:'text',text:'not json'}]}, input, knowledge));
});

test('every on-screen suggestion locks to its story action', async () => {
  const { presetIntent } = await import('./dialogue-core.mjs');
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const expected = {
    'RT-00': { '快看你身后的电视！': 'DIRECT_ALERT', '先别回头，听我说。': 'STAY' },
    'RT-01': { '先去控制室。': 'CONTROL_ROOM', '去演播厅看看。': 'STUDIO', '再检查一下大厅里的电视。': 'LOBBY', '现在离开这里。': 'LEAVE' },
    'RT-02': { '对比十三号屏幕和旁边的屏幕。': 'COMPARE_FEED', '先关掉控制台电源。': 'CUT_POWER', '先别动，等屏幕里的她自己行动。': 'WAIT_AND_WATCH', '故意不要照屏幕里的动作做。': 'DISOBEY' },
    'RT-02B': { '我从没来过这里。': 'DENY', '也许我们已经经历过不止一次。': 'LOOP_THEORY', '别再查了，现在离开。': 'LEAVE_WARNING' },
    'RT-03': { '问她现在是否安全。': 'SAFETY', '问她为什么认识屏幕外的人。': 'PRIVATE_QUESTION', '提醒她不要碰零号母带。': 'LEAVE_WARNING' },
    'RT-05': { '相信未来的你。': 'TRUST_FUTURE', '相信屏幕里的妈妈。': 'TRUST_SCREEN', '先别相信任何人，只按证据行动。': 'TRUST_EVIDENCE', '现在还不能判断，继续查。': 'UNDECIDED' },
    'RT-06': { '播放母带。': 'PLAY_TAPE', '彻底停播，切断总电源并毁掉母带。': 'SHUT_DOWN' }
  };
  for (const [promptId, lines] of Object.entries(expected)) {
    const knowledge = retrieveKnowledge(promptId);
    for (const [line, intent] of Object.entries(lines)) {
      assert.equal(app.includes(line), true, line);
      assert.equal(presetIntent(knowledge, line), intent, `${promptId} ${line}`);
    }
  }
});

test('preset lines keep their action when the model returns advance false', async () => {
  const { buildDialogueMessages, parseDialogueResponse } = await import('./dialogue-core.mjs');
  const input = { promptId: 'RT-03', message: '问她为什么认识屏幕外的人。', history: [] };
  const { knowledge } = buildDialogueMessages(input);
  const reply = '这个问题，我不能在镜头前回答。';
  const decision = parseDialogueResponse({ choices: [{ message: { content: JSON.stringify({
    reply, intent: 'PRIVATE_QUESTION', advance: false
  }) } }] }, input, knowledge);
  assert.equal(decision.intent, 'PRIVATE_QUESTION');
  assert.equal(decision.advance, true);
  assert.equal(decision.reply, reply);

  const stay = parseDialogueResponse({ content: [{ type: 'text', text: '好的。{"reply":"你先把话说完。","intent":"DIRECT_ALERT","advance":true}' }] },
    { promptId: 'RT-00', message: '先别回头，听我说。' }, retrieveKnowledge('RT-00'));
  assert.equal(stay.intent, 'STAY');
  assert.equal(stay.advance, false);
  assert.equal(stay.reply, '你先把话说完。');
});
