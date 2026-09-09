import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFromInputElement, copyPlainText } from './copyPlainText.js';

function mockDom({ execOk = true, clipboard = null, hasDocument = true } = {}) {
  const removed = [];
  const ta = {
    value: '',
    style: {},
    contentEditable: 'inherit',
    readOnly: false,
    setAttribute() {},
    focus() {},
    select() {},
    setSelectionRange() {},
  };
  const doc = {
    body: {
      appendChild() {},
      removeChild(el) {
        removed.push(el);
      },
    },
    createElement(tag) {
      assert.equal(tag, 'textarea');
      return ta;
    },
    execCommand(cmd) {
      assert.equal(cmd, 'copy');
      return execOk;
    },
  };
  const selection = { removeAllRanges() {}, addRange() {} };
  return {
    env: {
      document: hasDocument ? doc : undefined,
      navigator: clipboard ? { clipboard } : {},
      getSelection: () => selection,
    },
    ta,
    removed,
  };
}

test('copyPlainText rejects empty text', async () => {
  assert.equal(await copyPlainText(''), false);
  assert.equal(await copyPlainText('   '), false);
});

test('copyPlainText uses execCommand first so iOS keeps the tap gesture', async () => {
  let clipboardCalls = 0;
  const { env, ta, removed } = mockDom({
    execOk: true,
    clipboard: {
      writeText: async () => {
        clipboardCalls += 1;
      },
    },
  });
  assert.equal(await copyPlainText('https://venmo.com/sam?txn=pay', env), true);
  assert.equal(ta.value, 'https://venmo.com/sam?txn=pay');
  assert.equal(removed.length, 1);
  assert.equal(clipboardCalls, 0);
});

test('copyPlainText falls back to clipboard when execCommand fails', async () => {
  const written = [];
  const { env } = mockDom({
    execOk: false,
    clipboard: {
      writeText: async (t) => {
        written.push(t);
      },
    },
  });
  assert.equal(await copyPlainText('https://venmo.com/pay', env), true);
  assert.deepEqual(written, ['https://venmo.com/pay']);
});

test('copyPlainText uses clipboard when there is no document', async () => {
  const written = [];
  const { env } = mockDom({
    hasDocument: false,
    clipboard: {
      writeText: async (t) => {
        written.push(t);
      },
    },
  });
  assert.equal(await copyPlainText('abc', env), true);
  assert.deepEqual(written, ['abc']);
});

test('copyPlainText returns false when both strategies fail', async () => {
  const { env } = mockDom({
    execOk: false,
    clipboard: {
      writeText: async () => {
        throw new Error('NotAllowedError');
      },
    },
  });
  assert.equal(await copyPlainText('nope', env), false);
});

test('copyFromInputElement copies a visible field (iOS share link)', () => {
  const focused = [];
  const selected = [];
  let range = null;
  const { env } = mockDom({ execOk: true });
  const input = {
    tagName: 'TEXTAREA',
    value: 'https://evenly.example/#/share/abc',
    readOnly: true,
    contentEditable: 'inherit',
    focus() {
      focused.push(true);
    },
    select() {
      selected.push(true);
    },
    setSelectionRange(a, b) {
      range = [a, b];
    },
  };
  assert.equal(copyFromInputElement(input, env), true);
  assert.equal(focused.length, 1);
  assert.equal(selected.length, 1);
  assert.deepEqual(range, [0, input.value.length]);
  assert.equal(input.readOnly, true);
});

test('copyFromInputElement finds a nested textarea (MUI wrapper)', () => {
  const { env } = mockDom({ execOk: true });
  const inner = {
    tagName: 'TEXTAREA',
    value: 'https://evenly.example/#/share/xyz',
    readOnly: true,
    contentEditable: 'inherit',
    focus() {},
    select() {},
    setSelectionRange() {},
  };
  const wrapper = {
    tagName: 'DIV',
    querySelector() {
      return inner;
    },
  };
  assert.equal(copyFromInputElement(wrapper, env), true);
  assert.equal(inner.readOnly, true);
});

test('copyFromInputElement returns false without an input', () => {
  const { env } = mockDom({ execOk: true });
  assert.equal(copyFromInputElement(null, env), false);
});
