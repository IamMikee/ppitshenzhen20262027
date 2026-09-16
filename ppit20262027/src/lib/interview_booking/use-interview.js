'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from './constants';

/**
 * Watches applications/{uid}.interview in real time.
 * Returns:
 *   interview: the interview object or null
 *   loading:   true until first snapshot
 *   hasBooking: true if interview.status === 'scheduled'
 */
export function useInterview(userId) {
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setInterview(null);
            setLoading(false);
            return;
        }

        const ref = doc(db, COLLECTIONS.APPLICATIONS, userId);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setInterview(data.interview || null);
                } else {
                    setInterview(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error('[useInterview]', err);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [userId]);

    return {
        interview,
        loading,
        hasBooking: interview?.status === 'scheduled',
    };
}