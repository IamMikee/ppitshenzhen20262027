'use client';

export default function BookingDetails({ interview }) {
    if (!interview) return null;

    const scheduled = interview.scheduledAt?.toDate?.();
    const dateStr = scheduled
        ? scheduled.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : '—';
    const timeStr =
        interview.hourLabel && interview.endLabel
            ? `${interview.hourLabel} – ${interview.endLabel}`
            : '—';

    return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <div className="flex items-start gap-3 mb-6">
                <span className="text-3xl">✅</span>
                <div>
                    <h3 className="text-xl font-semibold text-green-800">
                        Interview Scheduled
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        You&apos;re all set. No further action needed.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
                    <span className="text-xl">📅</span>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Date</p>
                        <p className="text-gray-800 font-semibold">{dateStr}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
                    <span className="text-xl">🕐</span>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Time</p>
                        <p className="text-gray-800 font-semibold">{timeStr}</p>
                    </div>
                </div>
            </div>

            <p className="text-xs text-gray-500 mt-6">
                Need to reschedule or cancel? Contact{' '}
                <a
                    href="mailto:ppitshenzhen@gmail.com"
                    className="text-red-600 underline"
                >
                    ppitshenzhen@gmail.com
                </a>
            </p>
        </div>
    );
}