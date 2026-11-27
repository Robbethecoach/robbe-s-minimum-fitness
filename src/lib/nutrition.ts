// Fuel targets (project brief, section 3).
//
// Protein (decided 26 Nov): minimum 1.2 g/kg, target 1.6 g/kg, up to 2.0 g/kg when losing fat.
// Fibre: at least 30 g.
// Energy (PROPOSAL, Robbe to confirm): Mifflin-St Jeor × an activity factor from three intake
// questions plus the training days in the app, adjusted for the goal, with a floor.

export type Sex = 'female' | 'male';
export type FuelGoal = 'fat_loss' | 'maintain' | 'build_muscle';

export const bmrMifflin = (sex: Sex, weightKg: number, heightCm: number, age: number): number =>
  10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);

export interface ActivityAnswers {
  /** 0 = mostly sitting, 1 = partly standing or walking, 2 = physically heavy work. */
  daytime: 0 | 1 | 2;
  /** Steps per day outside training: 0 = <5k, 1 = 5–8k, 2 = 8–12k, 3 = >12k. */
  steps: 0 | 1 | 2 | 3;
  /** Other sport per week: 0 = none, 1 = 1–3 h, 2 = more than 3 h. */
  otherSport: 0 | 1 | 2;
  /** Training days in the app (3–6). */
  trainingDays: number;
}

export const trainingDayPoints = (days: number) => (days >= 6 ? 3 : days >= 4 ? 2 : 1);

export const activityPoints = (a: ActivityAnswers) => a.daytime + a.steps + a.otherSport + trainingDayPoints(a.trainingDays);

export const activityFactor = (points: number): number => {
  if (points <= 1) return 1.35;
  if (points <= 3) return 1.5;
  if (points <= 5) return 1.6;
  if (points <= 7) return 1.75;
  return 1.9;
};

/** PLACEHOLDER: goal adjustment on maintenance energy. */
export const GOAL_FACTOR: Record<FuelGoal, number> = { fat_loss: 0.85, maintain: 1, build_muscle: 1.075 };

/** PLACEHOLDER: absolute kcal floor per sex; the target never goes below BMR either. */
export const KCAL_FLOOR: Record<Sex, number> = { female: 1500, male: 1800 };

export interface EnergyTarget {
  bmr: number;
  maintenance: number;
  target: number;
  /** ±100 kcal band shown to the member. */
  low: number;
  high: number;
  floorApplied: boolean;
}

const round50 = (n: number) => Math.round(n / 50) * 50;

export const energyTarget = (
  person: { sex: Sex; weightKg: number; heightCm: number; age: number },
  activity: ActivityAnswers,
  goal: FuelGoal,
): EnergyTarget => {
  const bmr = bmrMifflin(person.sex, person.weightKg, person.heightCm, person.age);
  const maintenance = bmr * activityFactor(activityPoints(activity));
  const raw = maintenance * GOAL_FACTOR[goal];
  const floor = Math.max(bmr, KCAL_FLOOR[person.sex]);
  const target = round50(Math.max(raw, floor));
  return {
    bmr: Math.round(bmr),
    maintenance: round50(maintenance),
    target,
    low: target - 100,
    high: target + 100,
    floorApplied: raw < floor,
  };
};

export const PROTEIN_G_PER_KG = { minimum: 1.2, target: 1.6, fatLoss: 2.0 } as const;
export const FIBRE_MIN_G = 30;

export const proteinTarget = (weightKg: number, goal: FuelGoal) => ({
  minimum: Math.round(weightKg * PROTEIN_G_PER_KG.minimum),
  target: Math.round(weightKg * (goal === 'fat_loss' ? PROTEIN_G_PER_KG.fatLoss : PROTEIN_G_PER_KG.target)),
});
