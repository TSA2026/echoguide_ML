// HearingTest.tsx
import { useState, useRef, useCallback } from "react"
import { TrialEngine } from "./TrialEngine"
import { AudioPlayer } from "./AudioPlayer"
import type { Ear, TestPhase, Thresholds, AudiogramData } from "./types"

const TEST_FREQUENCIES = [1000, 2000, 4000, 8000, 500, 250]
const TEST_EARS: Ear[] = ["right", "left"]

export default function HearingTest() {
  const [phase, setPhase]             = useState<TestPhase>("idle")
  const [currentEar, setCurrentEar]   = useState<Ear>("right")
  const [currentFreq, setCurrentFreq] = useState<number>(TEST_FREQUENCIES[0])
  const [progress, setProgress]       = useState<number>(0)
  const [results, setResults]         = useState<AudiogramData | null>(null)

  const player      = useRef(new AudioPlayer())
  const engine      = useRef(new TrialEngine())
  const thresholds  = useRef<Thresholds>({ left: {}, right: {} })
  const responseRef = useRef<((heard: boolean) => void) | null>(null)
  const runningRef  = useRef(false)

  const totalTrials = TEST_FREQUENCIES.length * TEST_EARS.length

  const handleHeard = useCallback(() => {
    responseRef.current?.(true)
  }, [])

  const handleNotHeard = useCallback(() => {
    responseRef.current?.(false)
  }, [])

  function waitForResponse(): Promise<boolean> {
    return new Promise((resolve) => {
      responseRef.current = (heard: boolean) => {
        responseRef.current = null
        resolve(heard)
      }
    })
  }

  async function startTest() {
    await player.current.unlock()
    setPhase("testing")
    await runSequence()
  }

  async function runSequence() {
    console.log(phase)
    if (runningRef.current) return
    runningRef.current = true

    for (const ear of TEST_EARS) {
      setCurrentEar(ear)
      console.log(phase)
      for (const freq of TEST_FREQUENCIES) {
        setCurrentFreq(freq)
        engine.current = new TrialEngine()

        while (!engine.current.done) {
          const currentEngine = engine.current
          player.current.playTone({
            frequency: freq,
            amplitudeDb: currentEngine.currentAmplitudeDb,
            ear
          })
          const heard = await waitForResponse()
          currentEngine.recordResponse(heard)
        }

        thresholds.current[ear][freq] = engine.current.threshold!
        setProgress(p => p + 1)
      }
    }                              // ← for loops end here

    runningRef.current = false

    // const response = await fetch("http://localhost:8000/compute_report", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ results: thresholds.current })
    // })
    // const data: AudiogramData = await response.json()
    // setResults(data)
    setPhase("done")
  }   // ← runSequence ends here

  console.log(phase)

  // Render
  if (phase === "idle") return (
    <div>
      <h1>Hearing Test</h1>
      <p>Put on headphones and find a quiet space.</p>
      <button onClick={startTest}>Start Test</button>
    </div>
  )

  if (phase === "testing") return (
    <div>
      <p>Testing: {currentEar} ear ~ {currentFreq} Hz</p>
      <p>Progress: {progress} / {totalTrials}</p>
      <button onClick={handleHeard}>Heard it</button>
      <button onClick={handleNotHeard}>Didn't hear it</button>
    </div>
  )

  if (phase === "done" && results) return (
    <div>
      <p>Test complete.</p>
      {/* <pre>{JSON.stringify(results, null, 2)}</pre> */}
    </div>
  )

  return null
}                                  // ← HearingTest ends here