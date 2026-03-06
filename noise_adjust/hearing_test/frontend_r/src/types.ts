export type Ear = "left" | "right" | "both"
export type TestPhase = "idle" | "testing" | "done"

export interface TrialConfig {
  startDb?: number
  requiredReversals?: number
  minDb?: number
  maxDb?: number
}

export interface TrialStep {
  playedDb: number
  heard: boolean
  wasReversal: boolean
}

export interface PlayToneOptions {
  frequency: number
  amplitudeDb: number
  ear: Ear
  durationSeconds?: number
}

export interface Thresholds {
  left: Record<number, number>    // frequency → dBHL
  right: Record<number, number>
}

export interface AudiogramData {
  audiogram: Thresholds
  summary: {
    left:  EarSummary
    right: EarSummary
  }
}

export interface EarSummary {
  average_dBHL: number
  classification: string
}

export interface ToneResult {
  heard: boolean
}
