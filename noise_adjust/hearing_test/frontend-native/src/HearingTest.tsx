// HearingTest.tsx
import { useState, useRef, useCallback } from "react"
import { TrialEngine } from "./TrialEngine"
import { AudioPlayer } from "./AudioPlayer"
import type { Ear, TestPhase, Thresholds, AudiogramData } from "./types"
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native"
import Audiogram from "./Audiogram"

const TEST_FREQUENCIES = [1000, 2000, 4000, 8000, 500, 250]
const TEST_EARS: Ear[] = ["right", "left"]

export default function HearingTest() {
  const [phase, setPhase]             = useState<TestPhase>("idle")
  const [currentEar, setCurrentEar]   = useState<Ear>("right")
  const [currentFreq, setCurrentFreq] = useState<number>(TEST_FREQUENCIES[0])
  const [progress, setProgress]       = useState<number>(0)
  const [results, setResults]         = useState<AudiogramData | null>(null)
  const [convertedThresholds, setConvertedThresholds] = useState<Record<string, Record<string, number>>>({}) 

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

  const handleReplay = useCallback(() => {
  player.current.playTone({
    frequency: currentFreq,
    amplitudeDb: engine.current.currentAmplitudeDb,
    ear: currentEar
  })
  }, [currentFreq, currentEar])

    // Convert from { ear: { freq: db } } to { freq: { ear: db } }
  function convertThresholds(t: Thresholds): Record<string, Record<string, number>> {
    const converted: Record<string, Record<string, number>> = {}
    for (const freq of TEST_FREQUENCIES) {
      converted[freq.toString()] = {
        left:  t.left[freq]  ?? -30,
        right: t.right[freq] ?? -30
      }
    }
    return converted
  }

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

    const payload = { results: convertThresholds(thresholds.current) }
    const reportResponse = await fetch("http://192.168.1.100:8000/compute_report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const data: AudiogramData = await reportResponse.json()
    setResults(data)
    setConvertedThresholds(convertThresholds(thresholds.current))
    setPhase("done")
  }   // runSequence ends here

  console.log(phase)

  // Render: 
    if (phase === "idle") return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Hearing Test</Text>
      <Text style={styles.subtitle}>Put on headphones and find a quiet space.</Text>
      <TouchableOpacity style={styles.button} onPress={startTest}>
        <Text style={styles.buttonText}>Start Test</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )

  if (phase === "testing") return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Testing: {currentEar} ear</Text>
      <Text style={styles.freq}>{currentFreq} Hz</Text>
      <Text style={styles.progress}>{progress} / {totalTrials}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.heardButton]} onPress={handleHeard}>
          <Text style={styles.buttonText}>Heard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.notHeardButton]} onPress={handleNotHeard}>
          <Text style={styles.buttonText}>Didn't hear it</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.button, styles.replayButton]} onPress={handleReplay}>
        <Text style={styles.buttonText}>↺ Replay</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )

  if (phase === "done") return (
  <SafeAreaView style={{ flex: 1 }}>
    <ScrollView>
      {results
        ? <Audiogram data={results} thresholds={convertedThresholds} />
        : <Text>Loading results...</Text>
      }
    </ScrollView>
  </SafeAreaView>
)


  return null
}  

const styles = StyleSheet.create({
  replayButton: { backgroundColor: "#007AFF", marginTop: 16 },
  container:      { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fff" },
  title:          { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle:       { fontSize: 16, color: "#666", marginBottom: 32, textAlign: "center" },
  label:          { fontSize: 18, color: "#666", marginBottom: 4 },
  freq:           { fontSize: 48, fontWeight: "bold", marginBottom: 8 },
  progress:       { fontSize: 14, color: "#999", marginBottom: 48 },
  buttonRow:      { flexDirection: "row", gap: 16 },
  button:         { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, minWidth: 140, alignItems: "center" },
  heardButton:    { backgroundColor: "#34C759" },
  notHeardButton: { backgroundColor: "#FF3B30" },
  buttonText:     { color: "white", fontSize: 16, fontWeight: "600" },
})// ← HearingTest ends here