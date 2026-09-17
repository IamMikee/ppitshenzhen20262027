import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { bookTimeSlotAdmin } from '@/lib/interview_booking/booking-service';
import { getVenueForApplicant, getInterviewWindowState } from '@/lib/interview_booking/constants';

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
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await getAuth().verifyIdToken(idToken);

        const { slotId, notes } = await req.json();
        if (!slotId) {
            return NextResponse.json({ error: 'Missing slotId' }, { status: 400 });
        }

        const db = getFirestore();
        const appSnap = await db
            .collection('applications')
            .doc(decoded.uid)
            .get();

        if (!appSnap.exists) {
            return NextResponse.json(
                { error: 'No application found for this user' },
                { status: 403 }
            );
        }

        const applicationData = appSnap.data();
        const userVenueId = getVenueForApplicant(applicationData);
        const win = getInterviewWindowState(userVenueId);

        // slotId format: `${venueId}_${dayId}_${hour}00`
        const slotVenueId = slotId.split('_')[0];

        if (slotVenueId !== userVenueId) {
            return NextResponse.json(
                { error: 'This slot is not available for your venue' },
                { status: 403 }
            );
        }

        if (win.state !== 'open') {
            return NextResponse.json(
                { error: 'Interview scheduling is not currently open for your venue' },
                { status: 403 }
            );
        }

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