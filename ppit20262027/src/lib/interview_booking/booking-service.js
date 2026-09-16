import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, BOOKING_CONFIG } from './constants';

const parentDocPath = (parentId = BOOKING_CONFIG.PARENT_DOC_ID) =>
    `${COLLECTIONS.PARENT}/${parentId}`;

const slotDocPath = (slotId, parentId = BOOKING_CONFIG.PARENT_DOC_ID) =>
    `${COLLECTIONS.PARENT}/${parentId}/${COLLECTIONS.TIME_SLOTS}/${slotId}`;

const bookingsColPath = (slotId, parentId = BOOKING_CONFIG.PARENT_DOC_ID) =>
    `${COLLECTIONS.PARENT}/${parentId}/${COLLECTIONS.TIME_SLOTS}/${slotId}/${COLLECTIONS.BOOKINGS}`;

const applicationDocPath = (userId) =>
    `${COLLECTIONS.APPLICATIONS}/${userId}`;

export async function bookTimeSlotAdmin(
    request,
    parentId = BOOKING_CONFIG.PARENT_DOC_ID
) {
    const { slotId, userId, userEmail, userName, notes } = request;

    if (!slotId || !userId) {
        return { success: false, error: 'Missing slotId or userId' };
    }

    const db = getFirestore();
    const slotRef = db.doc(slotDocPath(slotId, parentId));
    const bookingsCol = db.collection(bookingsColPath(slotId, parentId));
    const bookingRef = bookingsCol.doc();
    const appRef = db.doc(applicationDocPath(userId));

    try {
        const result = await db.runTransaction(async (transaction) => {
            // ---- READS ----
            const slotSnap = await transaction.get(slotRef);
            const appSnap = await transaction.get(appRef);

            // ---- GLOBAL CHECK: user already has an interview? ----
            if (appSnap.exists) {
                const app = appSnap.data();
                if (
                    app.interview?.status === 'scheduled' &&
                    app.interview?.slotId
                ) {
                    throw new Error(
                        'You have already booked an interview slot'
                    );
                }
            }

            // ---- SLOT VALIDATION ----
            if (!slotSnap.exists) throw new Error('Time slot does not exist');

            const slot = slotSnap.data();

            if (slot.isCancelled) throw new Error('This slot has been cancelled');
            if (slot.isFull || (slot.currentBookings || 0) >= slot.maxBookings) {
                throw new Error('This slot is already full');
            }

            const newCount = (slot.currentBookings || 0) + 1;
            const isFull = newCount >= slot.maxBookings;

            // ---- WRITES ----
            transaction.update(slotRef, {
                currentBookings: FieldValue.increment(1),
                isFull,
            });

            transaction.set(bookingRef, {
                slotId,
                dayId: slot.dayId,
                hourLabel: slot.hourLabel,
                userId,
                userEmail,
                userName,
                status: 'confirmed',
                notes: notes || null,
                bookedAt: FieldValue.serverTimestamp(),
            });

            const interviewData = {
                slotId,
                dayId: slot.dayId,
                dayLabel: slot.dayLabel,
                hourLabel: slot.hourLabel,
                endLabel: slot.endLabel,
                bookingId: bookingRef.id,
                scheduledAt: slot.startTime,
                interviewer: slot.interviewer,
                interviewerEmail: slot.interviewerEmail,
                location: slot.location,
                meetingLink: slot.meetingLink || null,
                status: 'scheduled',
                updatedAt: Timestamp.now(),
            };

            if (appSnap.exists) {
                transaction.update(appRef, {
                    interview: interviewData,
                    userId,
                    email: userEmail,
                    name: userName,
                });
            } else {
                transaction.set(appRef, {
                    userId,
                    email: userEmail,
                    name: userName,
                    interview: interviewData,
                    createdAt: FieldValue.serverTimestamp(),
                });
            }

            return {
                bookingId: bookingRef.id,
                remaining: slot.maxBookings - newCount,
            };
        });

        return {
            success: true,
            bookingId: result.bookingId,
            slotId,
            remaining: result.remaining,
            message: `Booked! ${result.remaining} spot(s) left.`,
        };
    } catch (err) {
        console.error('[bookTimeSlotAdmin]', err);
        return { success: false, error: err.message || 'Booking failed' };
    }
}

export async function getTimeSlotsAdmin(parentId = BOOKING_CONFIG.PARENT_DOC_ID) {
    const db = getFirestore();
    const slotsCol = db.collection(
        `${COLLECTIONS.PARENT}/${parentId}/${COLLECTIONS.TIME_SLOTS}`
    );
    const snap = await slotsCol.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}