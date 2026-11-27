/* AI voice worker: runs the Kokoro-82M model on the device, one sentence at a time */
import { KokoroTTS, env } from './lib/kokoro.web.js';
env.wasmPaths = new URL('./lib/ort/', self.location.href).href;
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null, chain = Promise.resolve();
self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') {
    if (tts) { self.postMessage({ type: 'ready' }); return; }
    const seen = {};
    KokoroTTS.from_pretrained(MODEL, {
      dtype: 'q8', device: 'wasm',
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          seen[p.file] = [p.loaded, p.total];
          let a = 0, b = 0; for (const k in seen) { a += seen[k][0]; b += seen[k][1]; }
          self.postMessage({ type: 'progress', loaded: a, total: b });
        }
      },
    }).then((t) => { tts = t; self.postMessage({ type: 'ready' }); })
      .catch((err) => self.postMessage({ type: 'error', message: String(err && err.message || err) }));
    return;
  }
  if (m.type === 'gen') {
    chain = chain.then(async () => {
      if (!tts) throw new Error('not ready');
      const t0 = performance.now();
      const audio = await tts.generate(m.text, { voice: m.voice, speed: m.speed });
      const data = audio.audio instanceof Float32Array ? audio.audio : Float32Array.from(audio.audio);
      self.postMessage({ type: 'audio', id: m.id, audio: data, sr: audio.sampling_rate, ms: performance.now() - t0 }, [data.buffer]);
    }).catch((err) => self.postMessage({ type: 'audio', id: m.id, error: String(err && err.message || err) }));
  }
};
