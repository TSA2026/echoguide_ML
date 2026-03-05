// AudioPlayer.ts

import type { PlayToneOptions, ToneResult } from "./types"


export class AudioPlayer {
  private baseUrl: string
  private audioContext: AudioContext
  private resolveResponse: ((heard: boolean) => void) | null = null

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl
    this.audioContext = new AudioContext()
  }

  // Returns a promise that resolves ONLY when user clicks yes or no
  async playAndWait(options: PlayToneOptions): Promise<ToneResult> {
    const { frequency, amplitudeDb, ear, durationSeconds = 1.5 } = options

    // Convert dBHL back to 0–1 amplitude for the backend
    const amplitude = Math.pow(10, amplitudeDb / 20)

    const url = new URL(`${this.baseUrl}/generate_tone`)
    url.searchParams.set("frequency", frequency.toString())
    url.searchParams.set("amplitude", amplitude.toFixed(4))
    url.searchParams.set("duration", durationSeconds.toString())
    url.searchParams.set("channel", ear)

    const response = await fetch(url.toString())
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

    // Play the tone
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.audioContext.destination)
    source.start()

    // Wait for user response
    return new Promise<ToneResult>((resolve) => {
      this.resolveResponse = (heard: boolean) => {
        source.stop()
        resolve({ heard })
      }
    })
  }

  // Call these from your yes/no buttons in HearingTest.tsx
  respondHeard(): void {
    this.resolveResponse?.(true)
    this.resolveResponse = null
  }

  respondNotHeard(): void {
    this.resolveResponse?.(false)
    this.resolveResponse = null
  }

  // Must call this on user gesture before any audio plays (browser requirement)
  async unlock(): Promise<void> {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume()
    }
  }
}