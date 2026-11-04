const TARGET_RATE = 16000;

function downsample(chunks: readonly Float32Array[], from: number): Float32Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const flat = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    flat.set(c, o);
    o += c.length;
  }
  if (from <= TARGET_RATE) return flat;
  const ratio = from / TARGET_RATE;
  const out = new Float32Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += flat[j]!;
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (const value of samples) {
    const s = Math.max(-1, Math.min(1, value));
    view.setInt16(offset, s * (s < 0 ? 32768 : 32767), true);
    offset += 2;
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export type Recording = {
  stop: () => Promise<{ file: File; seconds: number }>;
  cancel: () => void;
  level: () => number;
};

export async function recordWav(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    await context.resume();
    const ctx = context;
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    let lastLevel = 0;
    node.onaudioprocess = (event) => {
      const data = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      let sum = 0;
      for (let i = 0; i < data.length; i += 16) sum += data[i]! * data[i]!;
      lastLevel = Math.min(1, Math.sqrt(sum / (data.length / 16)) * 4);
    };
    source.connect(node);
    node.connect(ctx.destination);
    let stopped = false;
    const teardown = async () => {
      stopped = true;
      stream.getTracks().forEach((t) => t.stop());
      node.disconnect();
      source.disconnect();
      node.onaudioprocess = null;
      await ctx.close();
    };
    return {
      level: () => lastLevel,
      cancel: () => {
        if (!stopped) void teardown();
      },
      async stop() {
        if (stopped) throw new Error("Recording already stopped");
        const rate = ctx.sampleRate;
        await teardown();
        const samples = downsample(chunks, rate);
        const blob = encodeWav(samples, Math.min(rate, TARGET_RATE));
        if (blob.size < 8000) throw new Error("That was too short — hold on a little longer.");
        return {
          file: new File([blob], "memo.wav", { type: "audio/wav" }),
          seconds: samples.length / Math.min(rate, TARGET_RATE),
        };
      },
    };
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    await context?.close();
    throw error;
  }
}
