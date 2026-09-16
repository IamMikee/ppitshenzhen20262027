import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// --- Admin init ---
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();

const PARENT = 'interviewTimeSlot';
const PARENT_ID = 'sept-2025';
const TIME_SLOTS = 'timeSlots';

const days = ['2025-09-19', '2025-09-20'];
const hours = [9, 10, 11, 12, 13, 14, 15, 16];
const interviewers = [
    { name: 'Alice Chen', email: 'alice@company.com' },
    { name: 'Bob Kumar', email: 'bob@company.com' },
    { name: 'Carla Diaz', email: 'carla@company.com' },
];

export async function POST() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { success: false, error: 'Seed disabled in production' },
            { status: 403 }
        );
    }

    try {
        // --- Parent doc ---
        // Admin SDK: db.doc('collection/docId').set({...})
        const parentRef = db.doc(`${PARENT}/${PARENT_ID}`);
        await parentRef.set(
            {
                title: 'September 2025 Interviews',
                description: 'Fixed interview schedule — 19 & 20 September 2025',
                days,
                hourRange: '09:00–17:00',
                createdAt: Timestamp.now(),
            },
            { merge: true }
        );

        // --- Batch write all slots ---
        const batch = db.batch();
        let idx = 0;

        for (const dayId of days) {
            for (const hour of hours) {
                const [y, m, d] = dayId.split('-').map(Number);
                const start = new Date(y, m - 1, d, hour, 0, 0, 0);
                const end = new Date(y, m - 1, d, hour + 1, 0, 0, 0);
                const slotId = `${dayId.replace(/-/g, '')}_${String(hour).padStart(2, '0')}00`;
                const interviewer = interviewers[idx % interviewers.length];
                idx++;

                // Admin SDK: db.doc('path/to/doc')
                const slotRef = db.doc(`${PARENT}/${PARENT_ID}/${TIME_SLOTS}/${slotId}`);

                batch.set(
                    slotRef,
                    {
                        dayId,
                        dayLabel: dayId,
                        hourLabel: `${String(hour).padStart(2, '0')}:00`,
                        endLabel: `${String(hour + 1).padStart(2, '0')}:00`,
                        startTime: Timestamp.fromDate(start),
                        endTime: Timestamp.fromDate(end),
                        duration: 60,
                        interviewer: interviewer.name,
                        interviewerEmail: interviewer.email,
                        maxBookings: 4,
                        currentBookings: 0,
                        isFull: false,
                        isCancelled: false,
                        location: 'Google Meet',
                        meetingLink: 'https://meet.google.com/pending',
                        createdAt: Timestamp.now(),
                    },
                    { merge: true }
                );
            }
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            slotsCreated: days.length * hours.length,
            days: days.length,
            slotsPerDay: hours.length,
            maxBookings: 4,
        });
    } catch (err) {
        console.error('[seed] failed:', err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}