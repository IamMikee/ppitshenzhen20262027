'use client';

import { useState, useEffect } from 'react';
import {
    HOUR_SLOTS,
    getVenue,
    getInterviewWindowState,
    getVenueForApplicant,
} from '@/lib/interview_booking/constants';
import SlotPicker from './SlotPicker';
import BookingDetails from './BookingDetails';

export default function InterviewStage({ user, applicationData }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Route the applicant to their venue based on application.university
    const venueId = getVenueForApplicant(applicationData);
    const venue = getVenue(venueId);

    const interview = applicationData?.interview || null;
    const hasBooking = interview?.status === 'scheduled';

    if (!venue) {
        return (
            <div className="text-center py-12 text-gray-500">
                ⚠️ No interview venue configured for your application. Please contact recruitment.
            </div>
        );
    }

    // ---------- BOOKED ----------
    if (hasBooking) {
        return <BookingDetails interview={interview} />;
    }

    // ---------- TIME LOCK ----------
    const windowState = getInterviewWindowState(venueId, now);

    if (windowState.state === 'not-open') {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Interview Scheduling Locked
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                    Slot selection opens soon. Please check back on the date below.
                </p>
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-gray-600">📅 Opens on</p>
                    <p className="text-gray-800 font-semibold">
                        {windowState.opensAt.toLocaleString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        ⏳ {formatCountdown(windowState.opensAt, now)} from now
                    </p>
                </div>
            </div>
        );
    }

    if (windowState.state === 'closed') {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Interview Scheduling Closed
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                    The scheduling window has closed. Please contact the recruitment team if you haven&apos;t booked a slot.
                </p>
                <a
                    href="mailto:ppitshenzhen@gmail.com"
                    className="mt-6 inline-block bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                >
                    📧 Contact Recruitment
                </a>
            </div>
        );
    }

    // ---------- OPEN ----------
    return (
        <InterviewBookingPicker
            user={user}
            venue={venue}
            applicationData={applicationData}
        />
    );
}

// ---------------------------------------------------------------------------

function InterviewBookingPicker({ user, venue, applicationData }) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let unsub = () => { };
        (async () => {
            const { collection, onSnapshot } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            const { COLLECTIONS, BOOKING_CONFIG } = await import(
                '@/lib/interview_booking/constants'
            );

            const slotsCol = collection(
                db,
                COLLECTIONS.PARENT,
                BOOKING_CONFIG.PARENT_DOC_ID,
                COLLECTIONS.TIME_SLOTS
            );

            unsub = onSnapshot(slotsCol, (snap) => {
                const data = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((s) => !s.isCancelled)
                    .filter((s) => s.venueId === venue.id);
                setSlots(data);
                setLoading(false);
            });
        })();
        return () => unsub();
    }, [venue.id]);

    // Slot map keyed by `${dayId}_${hourLabel}`
    const slotMap = {};
    slots.forEach((s) => {
        if (s.dayId && s.hourLabel) {
            slotMap[`${s.dayId}_${s.hourLabel}`] = s;
        }
    });

    const handleBook = async (slotId) => {
        if (!user) {
            setMessage('Please sign in first');
            return;
        }
        setMessage(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/interview-booking/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ slotId }),
            });
            const text = await res.text();
            if (!text) {
                setMessage(`❌ Empty response (${res.status})`);
                return;
            }
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                setMessage(`❌ Non-JSON (${res.status})`);
                return;
            }
            if (!res.ok || data.success === false) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            setMessage(`✅ ${data.message}`);
        } catch (err) {
            setMessage(`❌ ${err.message}`);
        }
    };

    if (loading) {
        return (
            <p className="text-gray-500 py-8 text-center">
                Loading available slots…
            </p>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-1">
                    🎯 Pick Your Interview Slot
                </h4>
                <p className="text-sm text-gray-600">
                    Each slot has limited capacity. You can only book one slot for the entire recruitment.
                </p>
            </div>

            {message && (
                <div className="p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-600">
                    {message}
                </div>
            )}

            <SlotPicker
                days={venue.days}
                hours={HOUR_SLOTS}
                slotMap={slotMap}
                currentUserId={user?.uid}
                onBook={handleBook}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------

function formatCountdown(target, now) {
    const ms = Math.max(0, target - now);
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}