// testTrialEngine.ts  — run with: npx ts-node testTrialEngine.ts

import { TrialEngine } from "./TrialEngine"

function simulateTrial(trueThresholdDb: number): void {
  const engine = new TrialEngine({ startDb: -20, requiredReversals: 6 })
  let step = 0

  while (!engine.done) {
    const snap  = engine.getSnapshot()
    const heard = snap.currentDb >= trueThresholdDb

    const next = engine.recordResponse(heard)

    const newSnap = engine.getSnapshot()
    const last = newSnap.history[newSnap.history.length - 1]

  console.log(
    `Step ${++step}: ` +
    `played ${last.playedDb} dBHL | ` +
    `heard: ${last.heard} | ` +
    `reversal: ${last.wasReversal} | ` +
    `reversals: ${newSnap.reversals.length} | ` +
    `next: ${next} dBHL`
  )
}
  console.log(`\nTrue threshold:     ${trueThresholdDb} dBHL`)
  console.log(`Measured threshold: ${engine.threshold} dBHL`)
  console.log(`Error:              ${Math.abs((engine.threshold ?? 0) - trueThresholdDb)} dB\n`)
}

// Test a few different patients
simulateTrial(-40)   // mild loss
simulateTrial(-20)   // moderate loss
simulateTrial(-60)   // near normal