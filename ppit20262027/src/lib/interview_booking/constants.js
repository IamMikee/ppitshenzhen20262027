export const BOOKING_CONFIG = {
    DEFAULT_MAX_BOOKINGS: 4,
    PARENT_DOC_ID: 'sept-2025',   // interviewTimeSlot/sept-2025
};

// Fixed interview schedule
export const INTERVIEW_DAYS = [
    { id: '2025-09-19', label: 'Friday, 19 September 2025' },
    { id: '2025-09-20', label: 'Saturday, 20 September 2025' },
];

export const INTERVIEW_HOURS = {
    START: 9,   // 9 AM
    END: 17,    // 5 PM
    INTERVAL_MINUTES: 60,
};

// Pre-generated hour labels (09:00 – 16:00, 8 slots/day)
export const HOUR_SLOTS = Array.from(
    { length: INTERVIEW_HOURS.END - INTERVIEW_HOURS.START },
    (_, i) => {
        const h = INTERVIEW_HOURS.START + i;
        return {
            hour: h,
            label: `${String(h).padStart(2, '0')}:00`,
            endLabel: `${String(h + 1).padStart(2, '0')}:00`,
        };
    }
);

export const COLLECTIONS = {
    PARENT: 'interviewTimeSlot',
    TIME_SLOTS: 'timeSlots',
    BOOKINGS: 'bookings',
    APPLICATIONS: 'applications',
};

// Deterministic slot ID so the seed and lookups always match
export const buildSlotId = (dayId, hour) =>
    `${dayId.replace(/-/g, '')}_${String(hour).padStart(2, '0')}00`;