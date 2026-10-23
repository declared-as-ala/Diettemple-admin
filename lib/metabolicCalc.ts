// ─── Shared Metabolic Calculation Utility (DietTemple Admin) ─────────────────
// Formula: Mifflin-St Jeor + Conventional Activity Multipliers

export type ActivityLevel =
  | 'sedentaire'
  | 'legerement_actif'
  | 'moderement_actif'
  | 'tres_actif'
  | 'extremement_actif';

export interface ActivityLevelConfig {
  value: ActivityLevel;
  label: string;
  description: string;
  coefficient: number;
}

export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelConfig[] = [
  {
    value: 'sedentaire',
    label: 'Sédentaire',
    description: 'Travail de bureau, très peu d\'exercice',
    coefficient: 1.2,
  },
  {
    value: 'legerement_actif',
    label: 'Légèrement actif',
    description: 'Activité légère ou sport 1 à 3 fois/semaine',
    coefficient: 1.375,
  },
  {
    value: 'moderement_actif',
    label: 'Modérément actif',
    description: 'Activité modérée, sport 3 à 5 fois/semaine',
    coefficient: 1.55,
  },
  {
    value: 'tres_actif',
    label: 'Très actif',
    description: 'Entraînement intense 6 à 7 fois/semaine ou métier physique',
    coefficient: 1.725,
  },
  {
    value: 'extremement_actif',
    label: 'Extrêmement actif',
    description: 'Athlète de haut niveau, entraînement intensif ou double séance',
    coefficient: 1.9,
  },
];

export const ACTIVITY_COEFFICIENTS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  legerement_actif: 1.375,
  moderement_actif: 1.55,
  tres_actif: 1.725,
  extremement_actif: 1.9,
};

export interface MetabolicInput {
  weightKg?: number | string | null;
  heightCm?: number | string | null;
  age?: number | string | null;
  sex?: 'M' | 'F' | string | null;
  activityLevel?: ActivityLevel | string | null;
}

export interface MetabolicResult {
  bmr: number | null;
  tdee: number | null;
  activityLevel: ActivityLevel | null;
  activityFactor: number | null;
  isBmrAvailable: boolean;
  isTdeeAvailable: boolean;
  missingFields: string[];
  statusMessage?: string;
}

export function getActivityConfig(level?: string | null): ActivityLevelConfig | null {
  if (!level) return null;
  return ACTIVITY_LEVEL_OPTIONS.find((opt) => opt.value === level) || null;
}

export function formatKcal(val: number | null | undefined): string {
  if (val == null || isNaN(val) || val <= 0) return '—';
  return `${Math.round(val).toLocaleString('fr-FR')} kcal/jour`;
}

export function formatFactor(factor: number | null | undefined): string {
  if (factor == null || isNaN(factor)) return '—';
  return `×${factor.toFixed(3)}`;
}

/**
 * Calculates Mifflin-St Jeor BMR and activity-based TDEE in real time
 */
export function calculateClientMetabolic(input: MetabolicInput): MetabolicResult {
  const missingFields: string[] = [];

  // Parse weight (kg)
  // Frontend allows up to 500 kg for live preview; backend enforces ≤300 kg for DB storage
  let weight: number | null = null;
  let weightOutOfRange = false;
  if (input.weightKg != null && input.weightKg !== '') {
    const parsed = typeof input.weightKg === 'number' ? input.weightKg : parseFloat(String(input.weightKg).replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 500) {
      weight = parsed;
    } else if (!isNaN(parsed) && parsed > 500) {
      weightOutOfRange = true;
    }
  }
  if (weight === null) missingFields.push(weightOutOfRange ? 'Poids invalide (max 500 kg)' : 'Poids (1–500 kg)');

  // Parse height (cm)
  let height: number | null = null;
  if (input.heightCm != null && input.heightCm !== '') {
    const parsed = typeof input.heightCm === 'number' ? input.heightCm : parseFloat(String(input.heightCm).replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 250) {
      height = parsed;
    }
  }
  if (height === null) missingFields.push('Taille (100–250 cm)');

  // Parse age (years)
  let age: number | null = null;
  if (input.age != null && input.age !== '') {
    const parsed = typeof input.age === 'number' ? input.age : parseInt(String(input.age), 10);
    if (!isNaN(parsed) && parsed >= 15 && parsed <= 100) {
      age = parsed;
    }
  }
  if (age === null) missingFields.push('Âge (15–100 ans)');

  // Parse sex ('M' | 'F')
  let sex: 'M' | 'F' | null = null;
  if (input.sex === 'M' || input.sex === 'F') {
    sex = input.sex;
  } else {
    missingFields.push('Sexe (Homme / Femme)');
  }

  // Parse activity level
  let activityLevel: ActivityLevel | null = null;
  if (input.activityLevel && input.activityLevel in ACTIVITY_COEFFICIENTS) {
    activityLevel = input.activityLevel as ActivityLevel;
  } else {
    missingFields.push("Niveau d'activité");
  }

  // BMR calculation (Mifflin-St Jeor)
  let bmr: number | null = null;
  if (weight !== null && height !== null && age !== null && sex !== null) {
    const base = 10 * weight + 6.25 * height - 5 * age;
    bmr = sex === 'M' ? base + 5 : base - 161;
  }

  // TDEE calculation
  let tdee: number | null = null;
  let activityFactor: number | null = null;
  if (activityLevel) {
    activityFactor = ACTIVITY_COEFFICIENTS[activityLevel] ?? null;
  }

  if (bmr !== null && activityFactor !== null) {
    tdee = bmr * activityFactor;
  }

  let statusMessage: string | undefined;
  if (bmr === null) {
    if (!input.sex) {
      statusMessage = 'Calcul indisponible : veuillez renseigner le sexe (Homme ou Femme).';
    } else if (missingFields.length > 0) {
      statusMessage = `Calcul indisponible : ${missingFields.join(', ')}.`;
    } else {
      statusMessage = 'Calcul indisponible : informations insuffisantes.';
    }
  } else if (tdee === null) {
    statusMessage = "BMR calculé. Sélectionnez un niveau d'activité physique pour calculer le TDEE.";
  }

  return {
    bmr,
    tdee,
    activityLevel,
    activityFactor,
    isBmrAvailable: bmr !== null,
    isTdeeAvailable: tdee !== null,
    missingFields,
    statusMessage,
  };
}
