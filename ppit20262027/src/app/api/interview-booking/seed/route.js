import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import {
    VENUES,
    HOUR_SLOTS,
    BOOKING_CONFIG,
    buildSlotId,
    COLLECTIONS,
} from '@/lib/interview_booking/constants';

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

export async function POST() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { success: false, error: 'Seed disabled in production' },
            { status: 403 }
        );
    }

    try {
        const PARENT = COLLECTIONS.PARENT;
        const PARENT_ID = BOOKING_CONFIG.PARENT_DOC_ID;
        const TIME_SLOTS = COLLECTIONS.TIME_SLOTS;

        // --- Parent doc ---
        const parentRef = db.doc(`${PARENT}/${PARENT_ID}`);
        await parentRef.set(
            {
                title: 'September 2026 Interviews',
                description:
                    'Fixed interview schedule — CUHKSZ (21–22 Sep) & UTOWN (19–20 Sep)',
                venues: VENUES.map((v) => v.id),
                hourRange: '16:00–22:00',
                createdAt: Timestamp.now(),
            },
            { merge: true }
        );

        // --- Build all slots ---
        const batch = db.batch();
        let count = 0;

        for (const venue of VENUES) {
            for (const day of venue.days) {
                for (const hourSlot of HOUR_SLOTS) {
                    const [y, m, d] = day.id.split('-').map(Number);

                    const start = new Date(
                        y,
                        m - 1,
                        d,
                        hourSlot.hour,
                        0,
                        0,
                        0
                    );
                    const end = new Date(
                        y,
                        m - 1,
                        d,
                        hourSlot.hour + 1,
                        0,
                        0,
                        0
                    );

                    const slotId = buildSlotId(
                        venue.id,
                        day.id,
                        hourSlot.hour
                    );

                    const slotRef = db.doc(
                        `${PARENT}/${PARENT_ID}/${TIME_SLOTS}/${slotId}`
                    );

                    batch.set(
                        slotRef,
                        {
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
                        { merge: true }
                    );

                    count++;
                }
            }
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            slotsCreated: count,
            venues: VENUES.length,
            slotsPerVenue: count / VENUES.length,
            maxBookings: BOOKING_CONFIG.DEFAULT_MAX_BOOKINGS,
        });
    } catch (err) {
        console.error('[seed] failed:', err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}