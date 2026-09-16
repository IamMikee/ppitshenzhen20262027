import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { bookTimeSlotAdmin } from '@/lib/interview_booking/booking-service';

// --- Firebase Admin init (server-only, runs once) ---
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function POST(req) {
    try {
        // 1. Verify the user is signed in
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await getAuth().verifyIdToken(idToken);

        // 2. Read the request body
        const body = await req.json();
        const { slotId, notes } = body;

        if (!slotId) {
            return NextResponse.json(
                { error: 'Missing slotId' },
                { status: 400 }
            );
        }

        // 3. Book the slot (Admin SDK atomic transaction — bypasses rules)
        const result = await bookTimeSlotAdmin({
            slotId,
            userId: decoded.uid,
            userEmail: decoded.email || '',
            userName: decoded.name || decoded.email || 'Applicant',
            notes,
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error('[book route]', err);
        return NextResponse.json(
            { error: err.message || 'Booking failed' },
            { status: 500 }
        );
    }
}