/** Größter Zeitschritt pro Update, damit ein Tab-Wechsel das Ziel nicht sofort auslöst */
const MAX_DT_MS = 100;

export interface DwellState {
  /** Ziel, dessen Fortschritt läuft oder (in der Kulanzzeit) pausiert; sonst null */
  targetId: string | null;
  /** 0..1 */
  progress: number;
  /** Nur im Update, in dem der Fortschritt 1 erreicht, sonst null (genau einmal) */
  completedId: string | null;
}

/**
 * Fortschritt durch Anvisieren (Standard ~1,5 s). Kurzes Verlassen bis `graceMs` pausiert den
 * Fortschritt, ein anderes Ziel startet dagegen sofort neu. Nach dem Auslösen ist das Ziel gesperrt
 * (progress 0), bis es mindestens einmal länger als `graceMs` verlassen wurde.
 */
export class DwellTracker {
  private activeId: string | null = null;
  private progressMs = 0;
  private awayMs = 0;
  private lockedId: string | null = null;
  private lockAwayMs = 0;

  constructor(
    private readonly durationMs = 1500,
    private readonly graceMs = 150,
  ) {}

  update(targetId: string | null, dtMs: number): DwellState {
    const dt = Math.min(Math.max(dtMs, 0), MAX_DT_MS);

    if (this.lockedId !== null) {
      if (targetId === this.lockedId) {
        this.lockAwayMs = 0;
      } else {
        this.lockAwayMs += dt;
        if (this.lockAwayMs > this.graceMs) this.lockedId = null;
      }
    }

    if (targetId === null) {
      if (this.activeId !== null) {
        this.awayMs += dt;
        if (this.awayMs > this.graceMs) this.clearActive();
      }
      return this.state(null);
    }

    if (targetId === this.lockedId) {
      this.clearActive();
      return this.state(null);
    }

    if (targetId !== this.activeId) {
      this.activeId = targetId;
      this.progressMs = 0;
    }
    this.awayMs = 0;
    this.progressMs += dt;

    if (this.progressMs >= this.durationMs) {
      const completedId = targetId;
      this.lockedId = completedId;
      this.lockAwayMs = 0;
      this.clearActive();
      return { targetId: null, progress: 0, completedId };
    }
    return this.state(null);
  }

  reset(): void {
    this.clearActive();
    this.lockedId = null;
    this.lockAwayMs = 0;
  }

  private clearActive(): void {
    this.activeId = null;
    this.progressMs = 0;
    this.awayMs = 0;
  }

  private state(completedId: string | null): DwellState {
    if (this.activeId === null) return { targetId: null, progress: 0, completedId };
    return { targetId: this.activeId, progress: Math.min(1, this.progressMs / this.durationMs), completedId };
  }
}
