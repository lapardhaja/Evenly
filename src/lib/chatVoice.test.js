import test from 'node:test';
import assert from 'node:assert/strict';
import {
  audioFileFromChunks,
  CHAT_AUDIO_MAX_MS,
  extensionForAudioMime,
  formatVoiceClock,
  pickRecorderMimeType,
} from './chatVoice.js';

test('formatVoiceClock is m:ss', () => {
  assert.equal(formatVoiceClock(0), '0:00');
  assert.equal(formatVoiceClock(1500), '0:01');
  assert.equal(formatVoiceClock(65_000), '1:05');
  assert.equal(formatVoiceClock(CHAT_AUDIO_MAX_MS), '1:00');
});

test('extensionForAudioMime maps containers', () => {
  assert.equal(extensionForAudioMime('audio/webm;codecs=opus'), 'webm');
  assert.equal(extensionForAudioMime('audio/mp4'), 'm4a');
  assert.equal(extensionForAudioMime('audio/mpeg'), 'mp3');
});

test('pickRecorderMimeType uses the first supported candidate', () => {
  assert.equal(pickRecorderMimeType(undefined), '');
  const Recorder = {
    isTypeSupported(t) {
      return t === 'audio/mp4';
    },
  };
  assert.equal(pickRecorderMimeType(Recorder), 'audio/mp4');
});

test('audioFileFromChunks names a voice file', () => {
  const file = audioFileFromChunks([new Uint8Array([1, 2, 3])], 'audio/webm;codecs=opus');
  assert.equal(file.name, 'voice.webm');
  assert.equal(file.type, 'audio/webm');
  assert.equal(file.size, 3);
});
