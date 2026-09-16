'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import {
    COLLECTIONS,
    BOOKING_CONFIG,
    INTERVIEW_DAYS,
    HOUR_SLOTS,
} from '@/lib/interview_booking/constants';
import { useInterview } from '@/lib/interview_booking/use-interview';
import SlotPicker from './components/SlotPicker';
import BookingDetails from './components/BookingDetails';
import DebugPanel from './components/DebugPanel';

export default function InterviewBookingTestPage() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Listen to Firebase Auth state directly
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setAuthLoading(false);
        });
        return () => unsub();
    }, []);

    // Real-time slots
    useEffect(() => {
        const slotsCol = collection(
            db,
            COLLECTIONS.PARENT,
            BOOKING_CONFIG.PARENT_DOC_ID,
            COLLECTIONS.TIME_SLOTS
        );

        const unsub = onSnapshot(slotsCol, (snap) => {
            const data = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((s) => !s.isCancelled);
            setSlots(data);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // Real-time interview status for the signed-in user
    const {
        interview,
        loading: interviewLoading,
        hasBooking,
    } = useInterview(user?.uid);

    // Map: `${dayId}_${hour}` -> slot
    const slotMap = useMemo(() => {
        const m = {};
        slots.forEach((s) => {
            if (s.dayId && s.hourLabel) {
                m[`${s.dayId}_${s.hourLabel}`] = s;
            }
        });
        return m;
    }, [slots]);

    const handleBook = async (slotId) => {
        if (!user) {
            setMessage('Please sign in first');
            return;
        }

        setMessage(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/test/interview-booking/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ slotId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage(`✅ ${data.message}`);
        } catch (err) {
            setMessage(`❌ ${err.message}`);
        }
    };

    const handleSeed = async () => {
        try {
            const res = await fetch('/api/test/interview-booking/seed', {
                method: 'POST',
            });

            const text = await res.text();          // read raw first
            console.log('[seed] status:', res.status);
            console.log('[seed] body:', text);

            if (!text) {
                setMessage(`❌ Server returned empty response (status ${res.status})`);
                return;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                setMessage(`❌ Server returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`);
                return;
            }

            if (!res.ok || !data.success) {
                setMessage(`❌ Seed failed: ${data.error || res.status}`);
                return;
            }

            setMessage(
                `✅ Seeded ${data.slotsCreated} slots (2 days × 8 hours × ${data.maxBookings} seats)`
            );
        } catch (err) {
            setMessage(`❌ Network error: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8 mt-16">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">
                            🧪 Interview Booking — TEST
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            19 & 20 September 2025 · 09:00–17:00 · 4 per slot
                        </p>
                    </div>
                    <button
                        onClick={handleSeed}
                        className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded text-sm"
                    >
                        Seed Schedule
                    </button>
                </div>

                {/* Auth banner — just for dev awareness */}
                {!authLoading && (
                    <div className="mb-6 flex items-center justify-between p-3 rounded bg-gray-900 border border-gray-700 text-sm">
                        {user ? (
                            <span>
                                Signed in as{' '}
                                <span className="text-white">
                                    {user.displayName || user.email}
                                </span>
                            </span>
                        ) : (
                            <span className="text-gray-400">
                                Not signed in —{' '}
                                <a
                                    href="/login"
                                    className="text-blue-400 underline"
                                >
                                    go to login
                                </a>
                            </span>
                        )}
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-3 rounded bg-gray-800 border border-gray-700 text-sm">
                        {message}
                    </div>
                )}

                {/* -------- CONDITIONAL UI -------- */}
                {loading || (user && interviewLoading) ? (
                    <p>Loading slots…</p>
                ) : user && hasBooking ? (
                    <BookingDetails interview={interview} />
                ) : (
                    <SlotPicker
                        days={INTERVIEW_DAYS}
                        hours={HOUR_SLOTS}
                        slotMap={slotMap}
                        currentUserId={user?.uid}
                        onBook={handleBook}
                    />
                )}

                {process.env.NODE_ENV !== 'production' && (
                    <DebugPanel slots={slots} userId={user?.uid} />
                )}
            </div>
        </div>
    );
}