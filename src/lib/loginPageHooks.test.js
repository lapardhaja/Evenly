import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const loginSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../pages/LoginPage.jsx'),
  'utf8',
);

test('LoginPage does not return before useEffect (session hydrate would white-screen)', () => {
  const fn = loginSrc.slice(loginSrc.indexOf('export default function LoginPage'));
  const effects = [...fn.matchAll(/\n  useEffect\(/g)];
  assert.ok(effects.length > 0, 'expected LoginPage useEffects');
  const lastEffect = effects[effects.length - 1].index;
  const signedInNav = fn.search(/return <Navigate to=\{from\} replace \/>;/);
  const configuredGate = fn.search(/\n  if \(!configured\) \{/);
  assert.ok(signedInNav !== -1, 'expected signed-in redirect');
  assert.ok(configuredGate !== -1, 'expected unconfigured gate');
  assert.ok(
    signedInNav > lastEffect,
    'signed-in Navigate must run after all useEffects so hydrating a PWA session cannot crash React',
  );
  assert.ok(
    configuredGate > lastEffect,
    'unconfigured early return must run after all useEffects',
  );
});
