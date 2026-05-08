import { APP_VERSION } from "../version";
import type { MumblePreset } from "../presets/types";
import type { MumbleSchedule } from "./types";

export const SCHEDULE_FILE_SCHEMA = "mumble-voice-lab/schedule";
export const SCHEDULE_FILE_SCHEMA_VERSION = "1.0";
export const SCHEDULE_FILE_SAMPLE_RATE = 44100;
export const SCHEDULE_FILE_CHANNELS = 2;

export interface MumbleScheduleFile {
  schema: typeof SCHEDULE_FILE_SCHEMA;
  schemaVersion: typeof SCHEDULE_FILE_SCHEMA_VERSION;
  generatorVersion: string;
  createdAt: string;
  id: string;
  text: string;
  preset: MumblePreset;
  expression: MumbleSchedule["expression"];
  expressionVersion: string;
  duration: number;
  sampleRate: number;
  channels: number;
  params: MumbleSchedule["params"];
  resolvedParams: MumbleSchedule["resolvedParams"];
  analysis: MumbleSchedule["analysis"];
  events: MumbleSchedule["events"];
  revealEvents: MumbleSchedule["revealEvents"];
}

export function createScheduleFile(args: {
  id: string;
  text: string;
  preset: MumblePreset;
  schedule: MumbleSchedule;
  createdAt?: string;
  generatorVersion?: string;
}): MumbleScheduleFile {
  return {
    schema: SCHEDULE_FILE_SCHEMA,
    schemaVersion: SCHEDULE_FILE_SCHEMA_VERSION,
    generatorVersion: args.generatorVersion ?? APP_VERSION,
    createdAt: args.createdAt ?? new Date().toISOString(),
    id: args.id,
    text: args.text,
    preset: {
      id: args.preset.id,
      name: args.preset.name,
      swatch: args.preset.swatch,
      params: { ...args.preset.params },
    },
    expression: args.schedule.expression,
    expressionVersion: args.schedule.expressionVersion,
    duration: args.schedule.duration,
    sampleRate: SCHEDULE_FILE_SAMPLE_RATE,
    channels: SCHEDULE_FILE_CHANNELS,
    params: { ...args.schedule.params },
    resolvedParams: { ...args.schedule.resolvedParams },
    analysis: args.schedule.analysis,
    events: args.schedule.events,
    revealEvents: args.schedule.revealEvents,
  };
}
