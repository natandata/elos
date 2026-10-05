declare module "zzfx" {
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    buildSamples: (...params: (number | undefined)[]) => Float32Array;
    playSamples: (channels: Float32Array[], volumeScale?: number, rate?: number, pan?: number, loop?: boolean) => AudioBufferSourceNode;
    getNote: (semitoneOffset?: number, rootNoteFrequency?: number) => number;
  };
  export function zzfx(...params: (number | undefined)[]): AudioBufferSourceNode;
}
