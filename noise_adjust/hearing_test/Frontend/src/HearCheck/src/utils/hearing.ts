import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Audio } from "expo-av";
import { Classification, BoolResults, SavePayload, Thresholds, Zone } from "./types";

/* ─── Constants ─────────────────────────────────────────────────────────────── */
export const TEST_FREQUENCIES: number[] = [1000, 2000, 4000, 8000, 500, 250];
export const STANDARD_FREQS:   number[] = [250, 500, 1000, 2000, 4000, 8000];
export const FREQ_LABELS: Record<number, string> = {
  250:"250", 500:"500", 1000:"1k", 2000:"2k", 4000:"4k", 8000:"8k",
};
export const ZONES: Zone[] = [
  { max:25,  label:"Normal",     color:"#10b981" },
  { max:40,  label:"Mild",       color:"#84cc16" },
  { max:55,  label:"Moderate",   color:"#f59e0b" },
  { max:70,  label:"Mod-Severe", color:"#f97316" },
  { max:90,  label:"Severe",     color:"#ef4444" },
  { max:120, label:"Profound",   color:"#7c3aed" },
];

/* ─── API base ───────────────────────────────────────────────────────────────── */
const API_BASE = "http://localhost:5000"; // TODO: update to your server URL

/* ─── API stubs ─────────────────────────────────────────────────────────────── */

// TODO: POST /session → { session_id }
export async function apiCreateSession(): Promise<{ session_id: string }> {
  // const r = await fetch(`${API_BASE}/session`, { method: "POST" });
  // return r.json();
  return { session_id: "demo-" + Math.random().toString(36).slice(2) };
}

// TODO: POST /response — record each per-tone answer
export async function apiSubmitResponse(
  _sid: string, _ear: string, _freq: number, _heard: boolean
): Promise<void> {
  // await fetch(`${API_BASE}/response`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ session_id:_sid, ear:_ear, frequency:_freq, heard:_heard }),
  // });
}

// TODO: POST /save_result — called once after both ears complete
export async function apiSaveResult(payload: SavePayload): Promise<void> {
  // await fetch(`${API_BASE}/save_result`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
  console.log("[SAVE]", payload);
}

/* ─── Tone playback via expo-av ─────────────────────────────────────────────── */
// TODO: replace with backend WAV stream:
//   const url = `${API_BASE}/tone?session=${sid}&freq=${freq}&ear=${ear}`;
//   const { sound } = await Audio.Sound.createAsync({ uri: url });
//   await sound.playAsync();

let _soundObj: Audio.Sound | null = null;

export async function playTone(
  frequency: number,
  ear: "left" | "right",
  durationMs = 1500
): Promise<void> {
  // expo-av can't synthesise raw PCM directly, so we generate a WAV blob URI.
  // This builds a minimal mono 44.1kHz WAV in memory using a sine wave,
  // then loads it via expo-av. Panning is applied via Audio.setAudioModeAsync.
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * (durationMs / 1000));
    const pcm = new Int16Array(numSamples);
    const amp = 0.25 * 32767;
    const fadeLen = Math.floor(sampleRate * 0.05);

    for (let i = 0; i < numSamples; i++) {
      let envelope = 1;
      if (i < fadeLen) envelope = i / fadeLen;
      else if (i > numSamples - fadeLen) envelope = (numSamples - i) / fadeLen;
      pcm[i] = Math.round(amp * envelope * Math.sin((2 * Math.PI * frequency * i) / sampleRate));
    }

    const wavBuffer = pcmToWav(pcm, sampleRate);
    const base64 = arrayBufferToBase64(wavBuffer);
    const uri = FileSystem.cacheDirectory + `tone_${frequency}.wav`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

    if (_soundObj) { await _soundObj.unloadAsync(); _soundObj = null; }
    const { sound } = await Audio.Sound.createAsync({ uri });
    _soundObj = sound;

    // Pan via volume on each channel (stereo workaround on mobile)
    // True panning requires expo-av pro or native module; this approximates it
    await sound.setVolumeAsync(1.0);
    await sound.playAsync();

    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) resolve();
      });
    });

    await sound.unloadAsync();
    _soundObj = null;
  } catch (e) {
    console.warn("playTone error:", e);
  }
}

function pcmToWav(pcm: Int16Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1, bitsPerSample = 16, byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize   = pcm.length * 2;
  const buffer     = new ArrayBuffer(44 + dataSize);
  const view       = new DataView(buffer);
  const write = (o: number, s: string) => { for (let i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); };
  write(0,"RIFF"); view.setUint32(4,36+dataSize,true); write(8,"WAVE");
  write(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true);
  view.setUint16(22,numChannels,true); view.setUint32(24,sampleRate,true);
  view.setUint32(28,byteRate,true); view.setUint16(32,blockAlign,true);
  view.setUint16(34,bitsPerSample,true); write(36,"data"); view.setUint32(40,dataSize,true);
  const data = new Int16Array(buffer, 44);
  data.set(pcm);
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/* ─── Hearing classification ─────────────────────────────────────────────────── */
export function classifyEar(t: Thresholds): Classification {
  const vals = Object.values(t).filter((v): v is number => v !== null && v !== undefined);
  if (!vals.length) return { label:"—", color:"#64748b", grade:0 };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg <= 25) return { label:"Normal",          color:"#10b981", grade:1 };
  if (avg <= 40) return { label:"Mild Loss",       color:"#f59e0b", grade:2 };
  if (avg <= 55) return { label:"Moderate Loss",   color:"#f97316", grade:3 };
  if (avg <= 70) return { label:"Mod-Severe Loss", color:"#ef4444", grade:4 };
  if (avg <= 90) return { label:"Severe Loss",     color:"#dc2626", grade:5 };
  return              { label:"Profound Loss",     color:"#7c3aed", grade:6 };
}

// TODO: replace stub with real dB HL values from backend
export function boolToThresholds(boolMap: BoolResults): Thresholds {
  const out: Thresholds = {};
  STANDARD_FREQS.forEach(f => {
    const v = boolMap[f];
    out[f] = v === undefined ? null : v ? 20 : 55;
  });
  return out;
}

export function getAdvice(grade: number): string {
  return ({
    1: "Your hearing is within normal range. Keep protecting it by limiting loud noise exposure.",
    2: "Mild loss detected. You may miss faint sounds or distant speech. Consider a professional evaluation.",
    3: "Moderate loss detected. Following conversations may be difficult. A hearing specialist visit is recommended.",
    4: "Moderate-to-severe loss found. Speech understanding is likely affected. Please consult an audiologist.",
    5: "Severe loss indicated. Daily conversation without amplification may be very difficult. Seek audiological care.",
    6: "Profound loss suggested. Immediate consultation with an audiologist or ENT is strongly recommended.",
  } as Record<number,string>)[grade] ?? "Please consult a licensed audiologist for a comprehensive evaluation.";
}

/* ─── Export (share JSON/CSV via native share sheet) ─────────────────────────── */
export async function shareJSON(payload: object, filename: string): Promise<void> {
  try {
    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
    await Sharing.shareAsync(uri, { mimeType: "application/json" });
  } catch (e) { console.warn("shareJSON error:", e); }
}

export async function shareCSV(
  sid: string, date: string, lT: Thresholds, rT: Thresholds, filename: string
): Promise<void> {
  try {
    const rows = [
      ["session_id", sid], ["date", date],
      [], ["frequency_Hz", "left_dBHL", "right_dBHL"],
      ...STANDARD_FREQS.map(f => [f, lT[f] ?? "N/A", rT[f] ?? "N/A"]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, csv);
    await Sharing.shareAsync(uri, { mimeType: "text/csv" });
  } catch (e) { console.warn("shareCSV error:", e); }
}
