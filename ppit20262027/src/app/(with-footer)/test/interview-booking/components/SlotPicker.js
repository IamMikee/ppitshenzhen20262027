'use client';

import { useMemo, useState } from 'react';

export default function SlotPicker({
    days,
    hours,
    slotMap,
    currentUserId,
    onBook,
}) {
    const [selectedDay, setSelectedDay] = useState(days[0]?.id || '');
    const [selectedHour, setSelectedHour] = useState('');
    const [booking, setBooking] = useState(false);

    // Available hours for the selected day (with capacity)
    const hourOptions = useMemo(() => {
        return hours.map((h) => {
            const slot = slotMap[`${selectedDay}_${h.label}`];
            const booked = slot?.currentBookings || 0;
            const max = slot?.maxBookings || 0;
            const remaining = Math.max(0, max - booked);
            const full = !slot || remaining <= 0;

            return {
                ...h,
                slot,
                remaining,
                max,
                full,
                exists: !!slot,
            };
        });
    }, [selectedDay, hours, slotMap]);

    const selected = hourOptions.find((h) => h.label === selectedHour);
    const canBook =
        !!currentUserId &&
        selected &&
        selected.exists &&
        !selected.full &&
        !booking;

    const handleConfirm = async () => {
        if (!selected?.slot?.id) return;
        setBooking(true);
        try {
            await onBook(selected.slot.id);
            setSelectedHour(''); // reset after booking
        } finally {
            setBooking(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold">Select Your Interview Slot</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Day dropdown */}
                <label className="block">
                    <span className="text-sm text-gray-400 mb-1 block">
                        Interview Day
                    </span>
                    <select
                        value={selectedDay}
                        onChange={(e) => {
                            setSelectedDay(e.target.value);
                            setSelectedHour('');
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                    >
                        {days.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.label}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Time dropdown */}
                <label className="block">
                    <span className="text-sm text-gray-400 mb-1 block">
                        Time Slot (1 hour)
                    </span>
                    <select
                        value={selectedHour}
                        onChange={(e) => setSelectedHour(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                    >
                        <option value="">— Select a time —</option>
                        {hourOptions.map((h) => (
                            <option
                                key={h.label}
                                value={h.label}
                                disabled={!h.exists || h.full}
                            >
                                {h.label} – {h.endLabel}
                                {!h.exists
                                    ? ' (not available)'
                                    : h.full
                                        ? ' (FULL)'
                                        : ` (${h.remaining}/${h.max} left)`}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Selection summary */}
            {selected && selected.exists && (
                <div
                    className={`rounded border p-4 text-sm ${selected.full
                            ? 'border-red-800 bg-red-950/30'
                            : 'border-gray-700 bg-gray-800/40'
                        }`}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-gray-400">Date: </span>
                            {days.find((d) => d.id === selectedDay)?.label}
                        </div>
                        <div>
                            <span className="text-gray-400">Time: </span>
                            {selected.label} – {selected.endLabel}
                        </div>
                        <div>
                            <span className="text-gray-400">Interviewer: </span>
                            {selected.slot.interviewer}
                        </div>
                        <div>
                            <span className="text-gray-400">Location: </span>
                            {selected.slot.location}
                        </div>
                        <div>
                            <span className="text-gray-400">Capacity: </span>
                            <span
                                className={
                                    selected.full
                                        ? 'text-red-400'
                                        : 'text-green-400'
                                }
                            >
                                {selected.remaining} / {selected.max} available
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Book button */}
            <div className="flex justify-end">
                <button
                    onClick={handleConfirm}
                    disabled={!canBook}
                    className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-sm font-medium"
                >
                    {booking
                        ? 'Booking…'
                        : !currentUserId
                            ? 'Sign in to book'
                            : !selected
                                ? 'Select a time first'
                                : selected.full
                                    ? 'Slot Full'
                                    : 'Confirm Booking'}
                </button>
            </div>
        </div>
    );
}