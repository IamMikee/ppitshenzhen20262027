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
            setSelectedHour('');
        } finally {
            setBooking(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-sm text-gray-500 mb-1 block">
                        Interview Day
                    </span>
                    <select
                        value={selectedDay}
                        onChange={(e) => {
                            setSelectedDay(e.target.value);
                            setSelectedHour('');
                        }}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        {days.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block">
                    <span className="text-sm text-gray-500 mb-1 block">
                        Time Slot (1 hour)
                    </span>
                    <select
                        value={selectedHour}
                        onChange={(e) => setSelectedHour(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
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

            {selected && selected.exists && (
                <div
                    className={`rounded-lg border p-4 text-sm ${selected.full
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-gray-500">Date: </span>
                            <span className="text-gray-800">
                                {days.find((d) => d.id === selectedDay)?.label}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Time: </span>
                            <span className="text-gray-800">
                                {selected.label} – {selected.endLabel}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Capacity: </span>
                            <span
                                className={
                                    selected.full
                                        ? 'text-red-600 font-medium'
                                        : 'text-green-600 font-medium'
                                }
                            >
                                {selected.remaining} / {selected.max} available
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleConfirm}
                    disabled={!canBook}
                    className="px-6 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-red-600 to-amber-500 text-white hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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