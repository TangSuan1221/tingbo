import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/safety.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function setup(reply) {
  const listeners = new Set();
  const sent = [];
  const parent = { postMessage(message) {
    sent.push(message);
    if (reply) queueMicrotask(() => {
      for (const listener of listeners) listener({ source: parent, data: {
        type: 'VAG_SAFETY_CHECK_RESPONSE', payload: { requestId: message.payload.requestId, ...reply }
      }});
    });
  }};
  const window = { parent, setTimeout: (fn) => setTimeout(fn, 20), clearTimeout,
    addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const exports = {};
  vm.runInNewContext(code, { exports, window, location: { hostname: 'preview.zaohuaboxcdn.cn' }, console });
  return { api: exports, sent, listeners };
}

test('正常用户名和提示词逐条发送宿主审核并通过', async () => {
  const { api, sent, listeners } = setup({ ok: true, allowed: true });
  for (const name of ['小明', '青河观众', 'Player2026']) assert.equal((await api.checkPlayerNameAllowed(name)).allowed, true);
  for (const text of ['你好，林岚。', '先别着急，我会陪着你。', '你现在最担心什么？']) assert.equal((await api.checkPlayerTextAllowed(text)).allowed, true);
  assert.deepEqual(sent.map(x => x.payload.scene), [112,112,112,5014,5014,5014]);
  assert.equal(listeners.size, 0);
});

test('宿主明确拒绝时拦截，且下一次输入仍会审核', async () => {
  const { api, sent } = setup({ ok: true, allowed: false, message: '测试拒绝' });
  assert.equal((await api.checkPlayerNameAllowed('测试名称')).allowed, false);
  assert.equal((await api.checkPlayerTextAllowed('测试文本')).allowed, false);
  assert.equal(sent.length, 2);
});

test('新版要求的超时放行不遗留监听器', async () => {
  const { api, listeners } = setup(null);
  assert.equal((await api.checkPlayerNameAllowed('小明')).allowed, true);
  assert.equal(listeners.size, 0);
});
