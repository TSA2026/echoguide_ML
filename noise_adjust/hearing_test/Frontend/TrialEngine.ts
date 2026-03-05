type Direction = "up" | "down"

interface TrialConfig {
  startDb?: number          // where to begin (default -30)
  requiredReversals?: number // how many before threshold is calculated (default 6)
  minDb?: number            // hardware floor (default -80)
  maxDb?: number            // hardware ceiling (default 0)
}
// one step of the trial
interface TrialStep {
  playedDb: number
  heard: boolean
  wasReversal: boolean // did the direction change? 
}

export class TrialEngine {
  private currentDb: number
  private requiredReversals: number
  private minDb: number
  private maxDb: number

  private lastDirection: Direction | null = null
  private reversals: number[] = []
  private history: TrialStep[] = []

  public done: boolean = false
  public threshold: number | null = null

  constructor(config: TrialConfig = {}) {
    this.currentDb        = config.startDb          ?? -30
    this.requiredReversals = config.requiredReversals ?? 6
    this.minDb            = config.minDb             ?? -80
    this.maxDb            = config.maxDb             ?? 0
  }

  get currentAmplitude(): number {
    return this.dbToAmplitude(this.currentDb)
  }

  // Call this after each user response
  // Returns the next dBHL to play
  recordResponse(heard: boolean): number {
    if (this.done) {
      throw new Error("Trial is complete. Call reset() to start a new one")
    }

    const playedDb = this.currentDb
    const direction: Direction = heard ? "down" : "up"

    // Reversal = direction changed from last step
    const wasReversal =
      this.lastDirection !== null && direction !== this.lastDirection

    // if (wasReversal) {
    //   this.reversals.push(playedDb)
    // }

    if (wasReversal) {
    const lastStep = this.history[this.history.length - 1]
    if (lastStep) {
      this.reversals.push(lastStep.playedDb)
    }
  }

    

    // Record step for  replay
    this.history.push({ playedDb, heard, wasReversal })

    this.lastDirection = direction

    // Hughson-Westlake: -10 if heard, +5 if not
    this.currentDb += heard ? -10 : 5
    this.currentDb = Math.max(this.minDb, Math.min(this.maxDb, this.currentDb))

    // Check completion
    if (this.reversals.length >= this.requiredReversals) {
      this.threshold = this.computeThreshold()
      this.done = true
    }

    return this.currentDb
  }

  // Inspect current state without side effects
  getSnapshot() {
    return {
      currentDb:  this.currentDb,
      reversals:  [...this.reversals],
      history:    [...this.history],
      done:       this.done,
      threshold:  this.threshold,
    }
  }

  reset(newStartDb?: number): void {
    this.currentDb     = newStartDb ?? -30
    this.lastDirection = null
    this.reversals     = []
    this.history       = []
    this.done          = false
    this.threshold     = null
  }


  private computeThreshold(): number {
    // Average of the last 4 reversals 
    const last4 = this.reversals.slice(-4)
    const sum = last4.reduce((acc, val) => acc + val, 0)
    return Math.round(sum / last4.length)
  }

  private dbToAmplitude(db: number): number {
    // Inverse of 20 * log10(amplitude)
    return Math.pow(10, db / 20)
  }
}