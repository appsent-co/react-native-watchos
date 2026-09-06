const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const React = require('react');
const createReconciler = require('react-reconciler');
const ts = require('typescript');

function loadHostConfig() {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/createHostConfig.ts'),
    'utf8'
  );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    { exports, globalThis, Date, Symbol, console }
  );
  return exports.createHostConfig;
}

function createRecorder() {
  const calls = [];
  let nextTag = 1;
  const record = (name, ...args) => calls.push([name, ...args]);
  return {
    calls,
    native: {
      createNode(type, props) {
        record('createNode', type, props);
        return nextTag++;
      },
      createTextNode(text) {
        record('createTextNode', text);
        return nextTag++;
      },
      updateNodeProps(tag, props) {
        record('updateNodeProps', tag, props);
      },
      updateTextNode(tag, text) {
        record('updateTextNode', tag, text);
      },
      appendChild(parent, child) {
        record('appendChild', parent, child);
      },
      insertBefore(parent, child, before) {
        record('insertBefore', parent, child, before);
      },
      removeChild(parent, child) {
        record('removeChild', parent, child);
      },
      appendToRoot(child) {
        record('appendToRoot', child);
      },
      removeFromRoot(child) {
        record('removeFromRoot', child);
      },
      clearRoot() {
        record('clearRoot');
      },
      completeRoot() {
        record('completeRoot');
      },
    },
  };
}

test('React 19.2 reconciler commits mount, updates, and unmounts to the watch host', () => {
  const previousUI = globalThis.__RNW_UI;
  const { calls, native } = createRecorder();
  globalThis.__RNW_UI = native;

  try {
    const Reconciler = createReconciler(loadHostConfig()());
    const root = Reconciler.createContainer(
      {},
      1,
      null,
      false,
      null,
      '',
      console.error,
      console.error,
      console.error,
      null
    );
    const render = (element) => {
      Reconciler.updateContainerSync(element, root, null, null);
      Reconciler.flushSyncWork();
    };

    let setCount;
    function Counter({ label }) {
      const [count, setState] = React.useState(0);
      setCount = setState;
      return React.createElement('Text', { label, count }, `${label}:${count}`);
    }

    render(React.createElement(Counter, { label: 'first' }));
    assert.deepEqual(calls, [
      ['createTextNode', 'first:0'],
      ['createNode', 'Text', { label: 'first', count: 0, children: 'first:0' }],
      ['appendChild', 2, 1],
      ['clearRoot'],
      ['appendToRoot', 2],
      ['completeRoot'],
    ]);

    calls.length = 0;
    render(React.createElement(Counter, { label: 'second' }));
    assert.deepEqual(calls, [
      ['updateTextNode', 1, 'second:0'],
      [
        'updateNodeProps',
        2,
        { label: 'second', count: 0, children: 'second:0' },
      ],
      ['completeRoot'],
    ]);

    calls.length = 0;
    Reconciler.flushSyncFromReconciler(() => setCount(1));
    assert.deepEqual(calls, [
      ['updateTextNode', 1, 'second:1'],
      [
        'updateNodeProps',
        2,
        { label: 'second', count: 1, children: 'second:1' },
      ],
      ['completeRoot'],
    ]);

    calls.length = 0;
    render(null);
    assert.deepEqual(calls, [['removeFromRoot', 2], ['completeRoot']]);
  } finally {
    if (previousUI === undefined) delete globalThis.__RNW_UI;
    else globalThis.__RNW_UI = previousUI;
  }
});
