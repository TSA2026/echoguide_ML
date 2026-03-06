export type Ear        = "left" | "right";
export type SaveStatus = "saving" | "saved" | "error" | null;
export type ExportType = "json" | "csv" | null;
export type TabKey     = "audiogram" | "table";
export type ScreenKey  = "splash" | "welcome" | "ear_intro" | "test" | "interlude" | "results";

/** Raw boolean responses keyed by frequency (Hz) */
export type BoolResults = Record<number, boolean>;

/** dB HL threshold values keyed by frequency (Hz); null = not tested */
export type Thresholds = Record<number, number | null>;

export interface Classification {
  label: string;
  color: string;
  grade: number;
}

export interface Zone {
  max:   number;
  label: string;
  color: string;
}

export interface SavePayload {
  session_id:            string;
  date:                  string;
  left_thresholds_dBHL:  Thresholds;
  right_thresholds_dBHL: Thresholds;
  left_classification:   string;
  right_classification:  string;
  frequencies_Hz:        number[];
  left_raw_responses:    BoolResults;
  right_raw_responses:   BoolResults;
}
