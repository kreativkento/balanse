export const HEALTH_FORM_VERSION = '2026-01-15';
export const HEALTH_FORM_LABEL = 'January 15, 2026';
export const HEALTH_DOCUMENT_TITLE = 'Balansé Health Declaration';
/** Health form tweaks should not force full re-sign. Members update answers when their health changes. */
export const HEALTH_REQUIRES_REACCEPT = false;

export const HEALTH_QUESTIONS = [
  {
    id: 'heart_condition',
    text: 'Has a doctor ever said you have a heart condition and should only do recommended physical activity?',
  },
  {
    id: 'chest_pain',
    text: 'Do you experience chest pain during or outside of physical activity?',
  },
  {
    id: 'dizziness',
    text: 'Do you lose your balance because of dizziness or ever lose consciousness?',
  },
  {
    id: 'bone_joint',
    text: 'Do you have a bone or joint problem that could be made worse by physical activity?',
  },
  {
    id: 'bp_medication',
    text: 'Is your doctor currently prescribing medication for your blood pressure or a heart condition?',
  },
  {
    id: 'pregnancy',
    text: 'Are you pregnant, or have you given birth in the last 6 months?',
  },
  {
    id: 'other_condition',
    text: 'Do you know of any other reason or medical condition why you should not do physical activity?',
  },
] as const;

export type HealthQuestionId = typeof HEALTH_QUESTIONS[number]['id'];
export type HealthAnswer = 'yes' | 'no' | '';
export type HealthAnswers = Record<HealthQuestionId, HealthAnswer>;

export type HealthDeclarationFields = {
  answers: HealthAnswers;
  details: string;
  acknowledged: boolean;
  schemaVersion: string;
  signaturePath?: string;
  signatureOptOut?: boolean;
};

export function emptyHealthAnswers(): HealthAnswers {
  return {
    heart_condition: '',
    chest_pain: '',
    dizziness: '',
    bone_joint: '',
    bp_medication: '',
    pregnancy: '',
    other_condition: '',
  };
}

export function emptyHealthDeclaration(): HealthDeclarationFields {
  return {
    answers: emptyHealthAnswers(),
    details: '',
    acknowledged: false,
    schemaVersion: HEALTH_FORM_VERSION,
  };
}

export function parseHealthDeclaration(raw?: string | null): HealthDeclarationFields {
  const empty = emptyHealthDeclaration();
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return empty;
  try {
    const parsed = JSON.parse(trimmed) as {
      answers?: Partial<HealthAnswers>;
      details?: string;
      acknowledged?: boolean;
      schemaVersion?: string;
      signaturePath?: string;
      signatureOptOut?: boolean;
      conditions?: string;
      allergies?: string;
      medications?: string;
      notes?: string;
    };
    if (parsed && typeof parsed === 'object') {
      const answers = emptyHealthAnswers();
      for (const question of HEALTH_QUESTIONS) {
        const value = parsed.answers?.[question.id];
        if (value === 'yes' || value === 'no') answers[question.id] = value;
      }
      const details = String(
        parsed.details
        || parsed.notes
        || [parsed.conditions, parsed.allergies, parsed.medications].filter(Boolean).join('\n')
        || '',
      );
      return {
        answers,
        details,
        acknowledged: parsed.acknowledged === true,
        schemaVersion: String(parsed.schemaVersion || '').trim() || HEALTH_FORM_VERSION,
        signaturePath: String(parsed.signaturePath || '').trim() || undefined,
        signatureOptOut: parsed.signatureOptOut === true,
      };
    }
  } catch {
    /* plain-text legacy value */
  }
  return { ...empty, details: trimmed };
}

export function serializeHealthDeclaration(fields: HealthDeclarationFields): string {
  const hasAnswers = HEALTH_QUESTIONS.some((question) => fields.answers[question.id]);
  const details = fields.details.trim();
  if (!hasAnswers && !details && !fields.acknowledged) return '';
  return JSON.stringify({
    schemaVersion: fields.schemaVersion || HEALTH_FORM_VERSION,
    answers: fields.answers,
    details,
    acknowledged: fields.acknowledged,
    ...(fields.signaturePath ? { signaturePath: fields.signaturePath } : {}),
    ...(fields.signatureOptOut ? { signatureOptOut: true } : {}),
  });
}

export function isHealthDeclarationAcknowledged(raw?: string | null): boolean {
  return parseHealthDeclaration(raw).acknowledged;
}
