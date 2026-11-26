// Conditioning zones from the 30-minute threshold test (HOME TURF workshop, All In Gent).
//
//   threshold heart rate = average heart rate over the last 20 minutes
//   threshold pace       = average pace over the whole 30 minutes
//
// Heart-rate zones are % of threshold heart rate. Pace zones are % of threshold SPEED
// (km/h), converted back to min/km for display.
// Members who can't run 30 minutes do the 1.6 km walk test and train on heart rate / talk test.

export interface Zone {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  /** Fractions of threshold; null = open-ended. */
  low: number | null;
  high: number | null;
}

export const HR_ZONES: Zone[] = [
  { zone: 1, name: 'Recovery', low: null, high: 0.85 },
  { zone: 2, name: 'Endurance', low: 0.85, high: 0.89 },
  { zone: 3, name: 'Tempo', low: 0.9, high: 0.94 },
  { zone: 4, name: 'Threshold', low: 0.95, high: 1.0 },
  { zone: 5, name: 'VO2max', low: 1.01, high: 1.1 },
];

/**
 * PLACEHOLDER (to confirm with Robbe / All In): the workshop slide lists Z1 as "< 85%",
 * which overlaps Z2 (70–80%) and leaves a gap at 80–85%. Z1 < 70% is used until confirmed.
 */
export const SPEED_ZONES: Zone[] = [
  { zone: 1, name: 'Recovery', low: null, high: 0.7 },
  { zone: 2, name: 'Endurance', low: 0.7, high: 0.8 },
  { zone: 3, name: 'Tempo', low: 0.85, high: 0.95 },
  { zone: 4, name: 'Threshold', low: 0.95, high: 1.05 },
  { zone: 5, name: 'VO2max', low: 1.05, high: 1.25 },
];

export interface ThresholdResult {
  thresholdSpeedKmh: number;
  /** Seconds per km. */
  thresholdPaceSec: number;
  thresholdHr: number;
}

export const fromThirtyMinuteTest = (distanceKm: number, avgHrLast20: number): ThresholdResult => {
  const thresholdSpeedKmh = distanceKm * 2;
  return {
    thresholdSpeedKmh,
    thresholdPaceSec: 3600 / thresholdSpeedKmh,
    thresholdHr: Math.round(avgHrLast20),
  };
};

export const formatPace = (secPerKm: number): string => {
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** Heart-rate range for a zone, in bpm. */
export const hrRange = (thresholdHr: number, zone: Zone['zone']) => {
  const z = HR_ZONES[zone - 1];
  return {
    low: z.low == null ? null : Math.round(thresholdHr * z.low),
    high: z.high == null ? null : Math.round(thresholdHr * z.high),
  };
};

/** Pace range for a zone, in seconds per km: `fast` is the lower number. */
export const paceRange = (thresholdSpeedKmh: number, zone: Zone['zone']) => {
  const z = SPEED_ZONES[zone - 1];
  const toPace = (fraction: number | null) => (fraction == null ? null : 3600 / (thresholdSpeedKmh * fraction));
  return { fast: toPace(z.high), slow: toPace(z.low) };
};

/** Retest every 8 weeks (decided 26 Nov). */
export const RETEST_WEEKS = 8;
