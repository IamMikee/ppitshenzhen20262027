import { Timestamp } from 'firebase/firestore';
import {
    INTERVIEW_DAYS,
    HOUR_SLOTS,
    BOOKING_CONFIG,
    buildSlotId,
} from './constants';

/**
 * Generates the fixed 16-slot schedule for Sept 19–20.
 * Returns array of { id, data } ready to write to Firestore.
 */
export function generateFixedSchedule() {
    const interviewers = [
        { name: 'John', email: 'john@company.com' },
    ];

    const slots = [];
    let interviewerIdx = 0;

    INTERVIEW_DAYS.forEach((day) => {
        HOUR_SLOTS.forEach((hourSlot) => {
            const [year, month, date] = day.id.split('-').map(Number);

            const start = new Date(
                year,
                month - 1,
                date,
                hourSlot.hour,
                0,
                0,
                0
            );
            const end = new Date(
                year,
                month - 1,
                date,
                hourSlot.hour + 1,
                0,
                0,
                0
            );

            const interviewer = interviewers[interviewerIdx % interviewers.length];
            interviewerIdx++;

            slots.push({
                id: buildSlotId(day.id, hourSlot.hour),
                data: {
                    dayId: day.id,
                    dayLabel: day.label,
                    hourLabel: hourSlot.label,
                    endLabel: hourSlot.endLabel,
                    startTime: Timestamp.fromDate(start),
                    endTime: Timestamp.fromDate(end),
                    duration: 60,
                    interviewer: interviewer.name,
                    interviewerEmail: interviewer.email,
                    maxBookings: BOOKING_CONFIG.DEFAULT_MAX_BOOKINGS,
                    currentBookings: 0,
                    isFull: false,
                    isCancelled: false,
                    location: 'Google Meet',
                    meetingLink: 'https://meet.google.com/pending',
                    createdAt: Timestamp.now(),
                },
            });
        });
    });

    return slots;
}