import { describe, expect, it } from 'vitest';
import { modelRequirementsInputSchema, modelRegistrationInputSchema } from '../src/schemas';

describe('modelos schemas', () => {
  it('accepts a basic public model registration', () => {
    const parsed = modelRegistrationInputSchema.safeParse({
      shop_id: '11111111-1111-1111-1111-111111111111',
      full_name: 'Ana Modelo',
      phone: '+59899111222',
      preferences: ['barba', 'pelo_corto'],
      consent_photos_videos: true,
      marketing_opt_in: false,
    });

    expect(parsed.success).toBe(true);
  });

  it('requires compensation value when compensation type is pago', () => {
    const parsed = modelRequirementsInputSchema.safeParse({
      session_id: '55555555-5555-5555-5555-555555555501',
      models_needed: 4,
      compensation_type: 'pago',
      is_open: true,
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts requirements with descuento and value', () => {
    const parsed = modelRequirementsInputSchema.safeParse({
      session_id: '55555555-5555-5555-5555-555555555501',
      models_needed: 3,
      beard_required: false,
      hair_length_category: 'medio',
      compensation_type: 'descuento',
      compensation_value_cents: 2500,
      notes_public: 'Traer disponibilidad de tarde.',
      is_open: true,
    });

    expect(parsed.success).toBe(true);
  });
});
