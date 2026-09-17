export const BOOKING_CONFIG = {
    DEFAULT_MAX_BOOKINGS: 4,
    PARENT_DOC_ID: 'sept-2026',
};

// ---------------------------------------------------------------------------
// VENUES
// ---------------------------------------------------------------------------
export const VENUES = [
    {
        id: 'cuhksz',
        label: 'CUHK-Shenzhen, Research Complex 105 (RX105)',
        days: [
            { id: '2026-09-21', label: 'Monday, 21 September 2026' },
            { id: '2026-09-22', label: 'Tuesday, 22 September 2026' },
        ],
    },
    {
        id: 'utown',
        label: 'HITSZ H Main Building Complex, H507',
        days: [
            { id: '2026-09-19', label: 'Saturday, 19 September 2026' },
            { id: '2026-09-20', label: 'Sunday, 20 September 2026' },
        ],
    },
];

// Shared hour grid for all venues: 16:00 – 22:00
export const INTERVIEW_HOURS = {
    START: 16,
    END: 22,
    INTERVAL_MINUTES: 60,
    EXCLUDED: [18], //6-7PM Dinner Break
};

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
).filter((slot) => !INTERVIEW_HOURS.EXCLUDED.includes(slot.hour));

// ---------------------------------------------------------------------------
// TIME WINDOW (per venue — set these when you want booking to open)
// ---------------------------------------------------------------------------
export const INTERVIEW_WINDOWS = {
    cuhksz: {
        open: '2026-09-19T14:00:00+08:00',
        close: '2026-09-19T17:00:00+08:00',
    },
    utown: {
        open: '2026-09-18T14:00:00+08:00',
        close: '2026-09-18T17:00:00+08:00',
    },
};

export function getInterviewWindowState(venueId, now = new Date()) {
    const w = INTERVIEW_WINDOWS[venueId];
    if (!w) return { state: 'unknown' };
    const open = new Date(w.open);
    const close = new Date(w.close);
    if (now < open) return { state: 'not-open', opensAt: open, closesAt: close };
    if (now > close) return { state: 'closed', opensAt: open, closesAt: close };
    return { state: 'open', opensAt: open, closesAt: close };
}

export function getVenue(venueId) {
    return VENUES.find((v) => v.id === venueId) || null;
}

// ---------------------------------------------------------------------------
// COLLECTIONS
// ---------------------------------------------------------------------------
export const COLLECTIONS = {
    PARENT: 'interviewTimeSlot',
    TIME_SLOTS: 'timeSlots',
    BOOKINGS: 'bookings',
    APPLICATIONS: 'applications',
};

// Deterministic slot id: e.g. utown_20260919_1600
export const buildSlotId = (venueId, dayId, hour) =>
    `${venueId}_${dayId.replace(/-/g, '')}_${String(hour).padStart(2, '0')}00`;

// ---------------------------------------------------------------------------
// VENUE ROUTING
// ---------------------------------------------------------------------------
// CUHKSZ students are identified by their university string.
// Everything else defaults to UTOWN.
function isCuhksz(universityName) {
    if (!universityName) return false;
    const lower = universityName.toLowerCase();
    return (
        /^(the|c)/.test(lower) ||
        /chinese/.test(lower) ||
        /cuhk/.test(lower)
    );
}

export function getVenueForApplicant(applicationData) {
    const uni = applicationData?.university || '';
    return isCuhksz(uni) ? 'cuhksz' : 'utown';
}