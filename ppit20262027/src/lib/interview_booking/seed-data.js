import { Timestamp } from 'firebase-admin/firestore';
import {
    VENUES,
    HOUR_SLOTS,
    BOOKING_CONFIG,
    buildSlotId,
} from './constants';

export function generateFixedSchedule() {
    const slots = [];

    for (const venue of VENUES) {
        for (const day of venue.days) {
            for (const hourSlot of HOUR_SLOTS) {
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

                slots.push({
                    id: buildSlotId(venue.id, day.id, hourSlot.hour),
                    data: {
                        venueId: venue.id,
                        venueLabel: venue.label,
                        dayId: day.id,
                        dayLabel: day.label,
                        hourLabel: hourSlot.label,
                        endLabel: hourSlot.endLabel,
                        startTime: Timestamp.fromDate(start),
                        endTime: Timestamp.fromDate(end),
                        duration: 60,
                        maxBookings: BOOKING_CONFIG.DEFAULT_MAX_BOOKINGS,
                        currentBookings: 0,
                        isFull: false,
                        isCancelled: false,
                        createdAt: Timestamp.now(),
                    },
                });
            }
        }
    }

    return slots;
}