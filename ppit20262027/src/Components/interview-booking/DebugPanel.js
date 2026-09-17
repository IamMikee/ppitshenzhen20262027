'use client';

import { INTERVIEW_DAYS } from '@/lib/interview_booking/constants';

export default function DebugPanel({ slots, userId }) {
    const totalCapacity = slots.reduce((s, x) => s + (x.maxBookings || 0), 0);
    const totalBooked = slots.reduce((s, x) => s + (x.currentBookings || 0), 0);

    const perDay = INTERVIEW_DAYS.map((d) => {
        const daySlots = slots.filter((s) => s.dayId === d.id);
        return {
            label: d.label,
            slots: daySlots.length,
            booked: daySlots.reduce((s, x) => s + (x.currentBookings || 0), 0),
            capacity: daySlots.reduce((s, x) => s + (x.maxBookings || 0), 0),
        };
    });

    return (
        <div className="mt-8 p-4 rounded border border-dashed border-gray-700 bg-gray-900/50 text-xs font-mono">
            <div className="font-bold text-yellow-400 mb-2">DEBUG PANEL</div>
            <div>User: {userId || 'not signed in'}</div>
            <div>Total slots: {slots.length}</div>
            <div>
                Capacity: {totalBooked} / {totalCapacity} booked
            </div>
            <div className="mt-2 space-y-1">
                {perDay.map((d) => (
                    <div key={d.label}>
                        {d.label}: {d.slots} slots · {d.booked}/{d.capacity}
                    </div>
                ))}
            </div>
        </div>
    );
}