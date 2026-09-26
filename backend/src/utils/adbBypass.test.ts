import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAdbAssistBypassMode, patchAdbAssistBypassSmali } from './adbBypass.js';

test('normalizes enabled values', () => {
  assert.equal(normalizeAdbAssistBypassMode('enabled'), true);
  assert.equal(normalizeAdbAssistBypassMode('true'), true);
  assert.equal(normalizeAdbAssistBypassMode('1'), true);
  assert.equal(normalizeAdbAssistBypassMode('disabled'), false);
  assert.equal(normalizeAdbAssistBypassMode('false'), false);
  assert.equal(normalizeAdbAssistBypassMode(undefined), false);
});

test('patches BuildConfig smali to the requested boolean value', () => {
  const original = '.field public static final ENABLE_ADB_ASSIST_BYPASS:Z = false\n';
  const patched = patchAdbAssistBypassSmali(original, true);
  assert.match(patched, /ENABLE_ADB_ASSIST_BYPASS:Z = true/);
});
