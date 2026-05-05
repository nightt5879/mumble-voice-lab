import type { MumbleParameters } from "../presets/types";
import { scheduleMumbleEvents } from "./synth";
import type { SyllableEvent } from "./types";

const SAMPLE_RATE = 44100;

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function floatToInt16(sample: number) {
  const clamped = Math.max(-1, Math.min(1, sample));
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
}

export function encodeWav(audioBuffer: AudioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const samples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = samples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = Array.from({ length: channels }, (_, channel) =>
    audioBuffer.getChannelData(channel),
  );
  let offset = 44;

  for (let index = 0; index < samples; index += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      view.setInt16(offset, floatToInt16(channelData[channel][index]), true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export async function renderEventsToWav(
  events: SyllableEvent[],
  params: MumbleParameters,
  duration: number,
) {
  const frameCount = Math.ceil(Math.max(0.3, duration) * SAMPLE_RATE);
  const offlineContext = new OfflineAudioContext(2, frameCount, SAMPLE_RATE);
  scheduleMumbleEvents(offlineContext, offlineContext.destination, events, params, 0);
  const renderedBuffer = await offlineContext.startRendering();
  return encodeWav(renderedBuffer);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
