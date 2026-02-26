import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const staffRoleSchema = z.enum(['admin', 'staff']);
export const appointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'no_show',
  'done',
]);
export const enrollmentStatusSchema = z.enum(['pending', 'confirmed', 'cancelled']);
export const jobApplicationStatusSchema = z.enum([
  'new',
  'contacted',
  'interview',
  'rejected',
  'hired',
]);
export const modelCompensationTypeSchema = z.enum(['gratis', 'descuento', 'pago']);
export const modelApplicationStatusSchema = z.enum([
  'applied',
  'confirmed',
  'waitlist',
  'rejected',
  'no_show',
  'attended',
]);

export const shopSchema = z.object({
  id: uuidSchema,
  name: z.string().min(2).max(120),
  timezone: z.string().min(3).max(100),
  created_at: isoDateTimeSchema,
});

export const staffSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  auth_user_id: uuidSchema.nullable().optional(),
  name: z.string().min(2).max(120),
  role: staffRoleSchema,
  phone: z.string().min(7).max(20),
  is_active: z.boolean(),
  created_at: isoDateTimeSchema.optional(),
});

export const serviceSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  name: z.string().min(2).max(120),
  price_cents: z.number().int().nonnegative(),
  duration_minutes: z.number().int().positive(),
  is_active: z.boolean(),
  created_at: isoDateTimeSchema.optional(),
});

export const customerSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email().nullable(),
  created_at: isoDateTimeSchema.optional(),
});

export const appointmentSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  staff_id: uuidSchema,
  customer_id: uuidSchema,
  service_id: uuidSchema,
  start_at: isoDateTimeSchema,
  end_at: isoDateTimeSchema,
  status: appointmentStatusSchema,
  price_cents: z.number().int().nonnegative(),
  notes: z.string().max(2000).nullable().optional(),
  created_at: isoDateTimeSchema.optional(),
});

export const workingHoursSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  staff_id: uuidSchema,
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

export const timeOffSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  staff_id: uuidSchema,
  start_at: isoDateTimeSchema,
  end_at: isoDateTimeSchema,
  reason: z.string().max(500).nullable().optional(),
});

export const courseSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  title: z.string().min(3).max(160),
  description: z.string().min(10),
  price_cents: z.number().int().nonnegative(),
  duration_hours: z.number().int().positive(),
  level: z.string().min(2).max(80),
  is_active: z.boolean(),
  image_url: z.string().url().nullable().optional(),
  created_at: isoDateTimeSchema.optional(),
});

export const courseSessionSchema = z.object({
  id: uuidSchema,
  course_id: uuidSchema,
  start_at: isoDateTimeSchema,
  capacity: z.number().int().positive(),
  location: z.string().min(2).max(200),
  status: z.enum(['scheduled', 'cancelled', 'completed']),
  created_at: isoDateTimeSchema.optional(),
});

export const courseEnrollmentSchema = z.object({
  id: uuidSchema,
  session_id: uuidSchema,
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  status: enrollmentStatusSchema,
  created_at: isoDateTimeSchema,
});

export const jobApplicationSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  instagram: z.string().max(120).nullable().optional(),
  experience_years: z.number().min(0).max(60),
  availability: z.string().min(2).max(1000),
  cv_path: z.string().min(3).max(500),
  status: jobApplicationStatusSchema,
  notes: z.string().max(2000).nullable().optional(),
  created_at: isoDateTimeSchema,
});

export const modelSchema = z.object({
  id: uuidSchema,
  shop_id: uuidSchema,
  full_name: z.string().min(2).max(160),
  phone: z.string().min(7).max(30),
  email: z.string().email().nullable().optional(),
  instagram: z.string().max(120).nullable().optional(),
  notes_internal: z.string().max(2000).nullable().optional(),
  attributes: z.record(z.any()).nullable().optional(),
  photo_paths: z.array(z.string()).nullable().optional(),
  marketing_opt_in: z.boolean(),
  created_at: isoDateTimeSchema,
});

export const modelRequirementsSchema = z.object({
  id: uuidSchema,
  session_id: uuidSchema,
  requirements: z.record(z.any()).nullable().optional(),
  compensation_type: modelCompensationTypeSchema,
  compensation_value_cents: z.number().int().nonnegative().nullable().optional(),
  notes_public: z.string().max(2000).nullable().optional(),
  is_open: z.boolean(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const modelApplicationSchema = z.object({
  id: uuidSchema,
  session_id: uuidSchema,
  model_id: uuidSchema,
  status: modelApplicationStatusSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  notes_internal: z.string().max(2000).nullable().optional(),
});

export const waiverSchema = z.object({
  id: uuidSchema,
  session_id: uuidSchema,
  model_id: uuidSchema,
  waiver_version: z.string().min(1).max(30),
  accepted_name: z.string().min(2).max(160),
  accepted_at: isoDateTimeSchema,
  created_at: isoDateTimeSchema,
});

export const bookingInputSchema = z.object({
  shop_id: uuidSchema,
  service_id: uuidSchema,
  staff_id: uuidSchema.nullable(),
  start_at: isoDateTimeSchema,
  customer_name: z.string().min(2).max(120),
  customer_phone: z.string().min(7).max(20),
  customer_email: z.string().email().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const availabilityInputSchema = z.object({
  shop_id: uuidSchema,
  service_id: uuidSchema,
  staff_id: uuidSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const updateAppointmentStatusSchema = z.object({
  appointment_id: uuidSchema,
  status: z.enum(['confirmed', 'cancelled', 'no_show', 'done']),
  price_cents: z.number().int().nonnegative().optional(),
});

export const staffUpsertSchema = z.object({
  id: uuidSchema.optional(),
  shop_id: uuidSchema,
  auth_user_id: uuidSchema.optional().nullable(),
  name: z.string().min(2).max(120),
  role: staffRoleSchema,
  phone: z.string().min(7).max(20),
  is_active: z.boolean().default(true),
});

export const serviceUpsertSchema = z.object({
  id: uuidSchema.optional(),
  shop_id: uuidSchema,
  name: z.string().min(2).max(120),
  price_cents: z.number().int().nonnegative(),
  duration_minutes: z.number().int().positive(),
  is_active: z.boolean().default(true),
});

export const workingHoursUpsertSchema = z
  .object({
    id: uuidSchema.optional(),
    shop_id: uuidSchema,
    staff_id: uuidSchema,
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  })
  .refine((value) => value.start_time < value.end_time, {
    message: 'start_time must be before end_time',
    path: ['end_time'],
  });

export const timeOffUpsertSchema = z
  .object({
    id: uuidSchema.optional(),
    shop_id: uuidSchema,
    staff_id: uuidSchema,
    start_at: isoDateTimeSchema,
    end_at: isoDateTimeSchema,
    reason: z.string().max(500).optional().nullable(),
  })
  .refine((value) => value.start_at < value.end_at, {
    message: 'start_at must be before end_at',
    path: ['end_at'],
  });

export const courseUpsertSchema = z.object({
  id: uuidSchema.optional(),
  shop_id: uuidSchema,
  title: z.string().min(3).max(160),
  description: z.string().min(10),
  price_cents: z.number().int().nonnegative(),
  duration_hours: z.number().int().positive(),
  level: z.string().min(2).max(80),
  is_active: z.boolean().default(true),
  image_url: z.string().url().optional().nullable(),
});

export const courseSessionUpsertSchema = z.object({
  id: uuidSchema.optional(),
  course_id: uuidSchema,
  start_at: isoDateTimeSchema,
  capacity: z.number().int().positive(),
  location: z.string().min(2).max(200),
  status: z.enum(['scheduled', 'cancelled', 'completed']).default('scheduled'),
});

export const courseEnrollmentCreateSchema = z.object({
  session_id: uuidSchema,
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
});

export const jobApplicationCreateSchema = z.object({
  shop_id: uuidSchema,
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  instagram: z.string().max(120).optional().nullable(),
  experience_years: z.number().min(0).max(60),
  availability: z.string().min(2).max(1000),
});

export const jobApplicationUpdateSchema = z.object({
  application_id: uuidSchema,
  status: jobApplicationStatusSchema,
  notes: z.string().max(2000).optional().nullable(),
});

export const modelPreferenceSchema = z.enum(['barba', 'pelo_largo', 'pelo_corto', 'rulos', 'coloracion']);

export const modelRegistrationInputSchema = z.object({
  shop_id: uuidSchema,
  session_id: uuidSchema.optional(),
  full_name: z.string().min(2).max(160),
  phone: z.string().min(7).max(30),
  email: z.string().email().optional().nullable(),
  instagram: z.string().max(120).optional().nullable(),
  preferences: z.array(modelPreferenceSchema).max(8).default([]),
  consent_photos_videos: z.boolean().default(false),
  marketing_opt_in: z.boolean().default(false),
});

export const modelRequirementsInputSchema = z
  .object({
    session_id: uuidSchema,
    models_needed: z.number().int().positive(),
    beard_required: z.boolean().optional(),
    hair_length_category: z.enum(['indistinto', 'corto', 'medio', 'largo']).optional(),
    hair_type: z.string().max(80).optional().nullable(),
    compensation_type: modelCompensationTypeSchema,
    compensation_value_cents: z.number().int().nonnegative().optional(),
    notes_public: z.string().max(2000).optional().nullable(),
    is_open: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    const needsValue = value.compensation_type === 'descuento' || value.compensation_type === 'pago';
    if (needsValue && typeof value.compensation_value_cents !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'compensation_value_cents is required for descuento/pago',
        path: ['compensation_value_cents'],
      });
    }
  });

export const modelApplicationStatusUpdateSchema = z.object({
  application_id: uuidSchema,
  status: modelApplicationStatusSchema,
  notes_internal: z.string().max(2000).optional().nullable(),
});

export const waiverInputSchema = z.object({
  session_id: uuidSchema,
  model_id: uuidSchema,
  waiver_version: z.string().min(1).max(30).default('v1'),
  accepted_name: z.string().min(2).max(160),
});

export type Shop = z.infer<typeof shopSchema>;
export type Staff = z.infer<typeof staffSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type WorkingHours = z.infer<typeof workingHoursSchema>;
export type TimeOff = z.infer<typeof timeOffSchema>;
export type Course = z.infer<typeof courseSchema>;
export type CourseSession = z.infer<typeof courseSessionSchema>;
export type CourseEnrollment = z.infer<typeof courseEnrollmentSchema>;
export type JobApplication = z.infer<typeof jobApplicationSchema>;
export type Model = z.infer<typeof modelSchema>;
export type ModelRequirements = z.infer<typeof modelRequirementsSchema>;
export type ModelApplication = z.infer<typeof modelApplicationSchema>;
export type Waiver = z.infer<typeof waiverSchema>;
export type BookingInput = z.infer<typeof bookingInputSchema>;
export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type StaffRole = z.infer<typeof staffRoleSchema>;
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;
export type JobApplicationStatus = z.infer<typeof jobApplicationStatusSchema>;
export type ModelCompensationType = z.infer<typeof modelCompensationTypeSchema>;
export type ModelApplicationStatus = z.infer<typeof modelApplicationStatusSchema>;
export type ModelRegistrationInput = z.infer<typeof modelRegistrationInputSchema>;
export type ModelRequirementsInput = z.infer<typeof modelRequirementsInputSchema>;
export type ModelApplicationStatusUpdate = z.infer<typeof modelApplicationStatusUpdateSchema>;
export type WaiverInput = z.infer<typeof waiverInputSchema>;

