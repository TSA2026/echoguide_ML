// HearingTest.tsx
import { useState, useRef } from "react"
import { TrialEngine } from "./TrialEngine"
import { AudioPlayer } from "./AudioPlayer"
import type { Ear, TestPhase, Thresholds, AudiogramData } from "./types"

const TEST_FREQUENCIES = [1000, 2000, 4000, 8000, 500, 250]
const TEST_EARS: Ear[] = ["right", "left"]

export default function HearingTest() {
  const [phase, setPhase]       = useState<TestPhase>("idle")
  const [currentEar, setCurrentEar]   = useState<Ear>("right")
  const [currentFreq, setCurrentFreq] = useState<number>(TEST_FREQUENCIES[0])
  const [progress, setProgress]       = useState<number>(0)
  const [results, setResults]         = useState<AudiogramData | null>(null)

  const player    = useRef(new AudioPlayer())
  const engine    = useRef(new TrialEngine())
  const thresholds = useRef<Thresholds>({ left: {}, right: {} })

  const totalTrials = TEST_FREQUENCIES.length * TEST_EARS.length

  async function startTest() {
    await player.current.unlock()
    setPhase("testing")
    await runSequence()
  }

  async function runSequence() {
    for (const ear of TEST_EARS) {
      setCurrentEar(ear)
      for (const freq of TEST_FREQUENCIES) {
        setCurrentFreq(freq)
        engine.current.reset()

        // Run Hughson-Westlake loop for this frequency/ear
        while (!engine.current.done) {
          const { heard } = await player.current.playAndWait({
            frequency: freq,
            amplitudeDb: engine.current.currentAmplitudeDb,
            ear
          })
          engine.current.recordResponse(heard)
        }

        // Store threshold
        thresholds.current[ear][freq] = engine.current.threshold!
        setProgress(p => p + 1)
      }
    }

    // --> to backend
    const response = await fetch("http://localhost:8000/compute_report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: thresholds.current })
    })
    const data: AudiogramData = await response.json()
    setResults(data)
    setPhase("done")
  }

  if (phase === "idle") return (
    <div>
      <h1>Hearing Test</h1>
      <p>Put on headphones and find a quiet space.</p>
      <button onClick={startTest}>Start Test</button>
    </div>
  )

  if (phase === "testing") return (
    <div>
      <p>Testing: {currentEar} ear — {currentFreq} Hz</p>
      <p>Progress: {progress} / {totalTrials}</p>
      <button onClick={() => player.current.respondHeard()}>Heard it</button>
      <button onClick={() => player.current.respondNotHeard()}>Didn't hear it</button>
    </div>
  )

  if (phase === "done" && results) return (
    <div>
      <p>Test complete.</p>
      {/* Audiogram goes here next */}
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  )

  return null
}