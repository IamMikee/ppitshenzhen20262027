'use client';

export default function BookingDetails({ interview }) {
    if (!interview) return null;

    const scheduled = interview.scheduledAt?.toDate?.();
    const dateStr = scheduled
        ? scheduled.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : '—';
    const timeStr =
        interview.hourLabel && interview.endLabel
            ? `${interview.hourLabel} – ${interview.endLabel}`
            : '—';

    return (
        <div className="rounded-lg border border-green-800 bg-green-950/20 p-6">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✅</span>
                <div>
                    <h2 className="text-xl font-semibold">
                        Interview Scheduled
                    </h2>
                    <p className="text-sm text-green-400">
                        You&apos;re all set. No further action needed.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
                <Detail label="Date" value={dateStr} />
                <Detail label="Time" value={timeStr} />
                <Detail
                    label="Interviewer"
                    value={interview.interviewer || '—'}
                />
                <Detail label="Location" value={interview.location || '—'} />
                {interview.meetingLink && (
                    <div className="md:col-span-2">
                        <span className="text-gray-400 block mb-1">
                            Meeting Link
                        </span>
                        <a
                            href={interview.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline break-all"
                        >
                            {interview.meetingLink}
                        </a>
                    </div>
                )}
                <Detail
                    label="Booking ID"
                    value={interview.bookingId || '—'}
                    mono
                />
                <Detail label="Status" value={interview.status} />
            </div>

            <p className="text-xs text-gray-500 mt-6">
                Need to reschedule or cancel? Contact the team at{' '}
                <a
                    href="mailto:interviews@company.com"
                    className="text-blue-400 underline"
                >
                    interviews@company.com
                </a>
            </p>
        </div>
    );
}

function Detail({ label, value, mono = false }) {
    return (
        <div>
            <span className="text-gray-400 block mb-1">{label}</span>
            <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
        </div>
    );
}