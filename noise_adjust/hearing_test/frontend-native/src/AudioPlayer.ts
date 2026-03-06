// src/AudioPlayer.ts
import { Audio } from "expo-av"
import type { PlayToneOptions } from "./types"

export class AudioPlayer {
  private baseUrl: string
  private currentSound: Audio.Sound | null = null

  constructor(baseUrl: string = "http://192.168.1.100:8000") {
    this.baseUrl = baseUrl
  }

  async unlock(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    })
  }

  playTone(options: PlayToneOptions): void {
  const { frequency, amplitudeDb, ear, durationSeconds = 1.5 } = options

  if (isNaN(amplitudeDb) || !isFinite(amplitudeDb)) {
    throw new Error(`Invalid amplitudeDb: ${amplitudeDb}`)
  }

  const amplitude = Math.pow(10, amplitudeDb / 20)

  const url = new URL(`${this.baseUrl}/generate_tone`)
  url.searchParams.set("frequency", frequency.toString())
  url.searchParams.set("amplitude", amplitude.toFixed(4))
  url.searchParams.set("duration", durationSeconds.toString())
  url.searchParams.set("channel", ear)

  if (this.currentSound) {
    this.currentSound.unloadAsync().catch(() => {})
    this.currentSound = null
  }

  console.log("Fetching audio from:", url.toString())

  // Download first, then play from local cache
  Audio.Sound.createAsync(
    { uri: url.toString() },
    { shouldPlay: true },
    null,
    true  // downloadFirst = true
  )
    .then(({ sound }) => {
      console.log("Sound created and playing")
      this.currentSound = sound
    })
    .catch(err => console.error("playTone failed:", err))
  }

  async stopTone(): Promise<void> {
    if (this.currentSound) {
      await this.currentSound.stopAsync()
      await this.currentSound.unloadAsync()
      this.currentSound = null
    }
  }
}