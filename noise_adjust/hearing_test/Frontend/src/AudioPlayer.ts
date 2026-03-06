// AudioPlayer.ts
import type { PlayToneOptions } from "./types"

export class AudioPlayer {
  private baseUrl: string
  private audioContext: AudioContext
  private currentSource: AudioBufferSourceNode | null = null  // ← add this

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl
    this.audioContext = new AudioContext()
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

    fetch(url.toString())
      .then(r => r.arrayBuffer())
      .then(buf => this.audioContext.decodeAudioData(buf))
      .then(audioBuffer => {
        this.currentSource?.stop()  // stop previous tone if still playing
        const source = this.audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(this.audioContext.destination)
        source.start()
        this.currentSource = source
      })
      .catch(err => console.error("playTone failed:", err))
  }

  async unlock(): Promise<void> {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume()
    }
  }
}