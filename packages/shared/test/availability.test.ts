import { describe, expect, it } from 'vitest';
import { generateAvailabilitySlots } from '../src/availability';

describe('generateAvailabilitySlots', () => {
  it('returns 15-minute granularity slots within staff working hours', () => {
    const slots = generateAvailabilitySlots({
      date: '2026-02-23',
      serviceDurationMinutes: 30,
      slotMinutes: 15,
      workingHours: [
        {
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
        },
      ],
      appointments: [],
      timeOff: [],
    });

    expect(slots).toHaveLength(7);
    expect(slots[0]?.start_at).toBe('2026-02-23T09:00:00.000Z');
    expect(slots[6]?.start_at).toBe('2026-02-23T10:30:00.000Z');
  });

  it('removes blocked slots from existing appointments and time off', () => {
    const slots = generateAvailabilitySlots({
      date: '2026-02-23',
      serviceDurationMinutes: 30,
      slotMinutes: 15,
      workingHours: [
        {
          day_of_week: 1,
          start_time: '09:00',
          end_time: '12:00',
        },
      ],
      appointments: [
        {
          status: 'confirmed',
          start_at: '2026-02-23T09:30:00.000Z',
          end_at: '2026-02-23T10:15:00.000Z',
        },
      ],
      timeOff: [
        {
          start_at: '2026-02-23T11:00:00.000Z',
          end_at: '2026-02-23T11:30:00.000Z',
        },
      ],
    });

    const starts = slots.map((item) => item.start_at);
    expect(starts).not.toContain('2026-02-23T09:15:00.000Z');
    expect(starts).not.toContain('2026-02-23T09:30:00.000Z');
    expect(starts).not.toContain('2026-02-23T10:45:00.000Z');
  });

  it('ignores cancelled appointments when generating availability', () => {
    const slots = generateAvailabilitySlots({
      date: '2026-02-23',
      serviceDurationMinutes: 30,
      slotMinutes: 15,
      workingHours: [
        {
          day_of_week: 1,
          start_time: '09:00',
          end_time: '10:00',
        },
      ],
      appointments: [
        {
          status: 'cancelled',
          start_at: '2026-02-23T09:00:00.000Z',
          end_at: '2026-02-23T09:30:00.000Z',
        },
      ],
      timeOff: [],
    });

    const starts = slots.map((item) => item.start_at);
    expect(starts).toContain('2026-02-23T09:00:00.000Z');
  });
});

