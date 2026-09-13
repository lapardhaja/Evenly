import test from 'node:test';
import assert from 'node:assert/strict';
import {
  audioFileFromChunks,
  CHAT_AUDIO_MAX_MS,
  encodeWavPcm16,
  extensionForAudioMime,
  formatVoiceClock,
  pickRecorderMimeType,
  wavFileFromSamples,
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
  assert.equal(extensionForAudioMime('audio/wav'), 'wav');
});

test('pickRecorderMimeType prefers mp4 so iOS can play the file', () => {
  assert.equal(pickRecorderMimeType(undefined), '');
  const both = {
    isTypeSupported(t) {
      return t === 'audio/webm' || t === 'audio/mp4';
    },
  };
  assert.equal(pickRecorderMimeType(both), 'audio/mp4');
  const onlyWebm = {
    isTypeSupported(t) {
      return t === 'audio/webm';
    },
  };
  assert.equal(pickRecorderMimeType(onlyWebm), 'audio/webm');
});

test('audioFileFromChunks names a voice file', () => {
  const file = audioFileFromChunks([new Uint8Array([1, 2, 3])], 'audio/webm;codecs=opus');
  assert.equal(file.name, 'voice.webm');
  assert.equal(file.type, 'audio/webm');
  assert.equal(file.size, 3);
});

test('encodeWavPcm16 writes a RIFF/WAVE header and 16-bit samples', () => {
  const samples = new Float32Array(16);
  samples[0] = 1;
  samples[1] = -1;
  const buf = encodeWavPcm16(samples, 16000);
  const bytes = new Uint8Array(buf);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...bytes.slice(8, 12)), 'WAVE');
  assert.equal(buf.byteLength, 44 + 32);
  const view = new DataView(buf);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getInt16(44, true), 0x7fff);
  assert.equal(view.getInt16(46, true), -0x8000);
  const file = wavFileFromSamples(samples, 16000);
  assert.equal(file.name, 'voice.wav');
  assert.equal(file.type, 'audio/wav');
});
