import { db } from '../lib/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

const COLLECTION = 'emailSettings';

// Get all signatures
export async function getAllSignatures() {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('type', '==', 'signature'),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const signatures = [];
        querySnapshot.forEach((doc) => {
            signatures.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return signatures;
    } catch (error) {
        console.error('Error fetching signatures:', error);
        return [];
    }
}

// Get a single signature by ID
export async function getSignatureById(id) {
    try {
        const docRef = doc(db, COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching signature:', error);
        return null;
    }
}

// Get active signature
export async function getActiveSignature() {
    try {
        const q = query(
            collection(db, COLLECTION),
            where('type', '==', 'signature'),
            where('isActive', '==', true),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching active signature:', error);
        return null;
    }
}

// Create a new signature
export async function createSignature(data, userId) {
    try {
        // If this is the first signature, make it active
        const existing = await getAllSignatures();
        const isFirst = existing.length === 0;

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...data,
            type: 'signature',
            isActive: isFirst ? true : false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
            updatedBy: userId
        });
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error('Error creating signature:', error);
        throw error;
    }
}

// Update a signature
export async function updateSignature(id, data, userId) {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: userId
        });
        return { id, ...data };
    } catch (error) {
        console.error('Error updating signature:', error);
        throw error;
    }
}

// Delete a signature
export async function deleteSignature(id) {
    try {
        // Get the signature first to check if it's active
        const sig = await getSignatureById(id);
        if (sig && sig.isActive) {
            throw new Error('Cannot delete the active signature. Please set another signature as active first.');
        }
        await deleteDoc(doc(db, COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting signature:', error);
        throw error;
    }
}

// Set a signature as active
export async function setActiveSignature(id, userId) {
    try {
        // Get all signatures
        const all = await getAllSignatures();
        
        // Deactivate all
        for (const sig of all) {
            if (sig.id !== id && sig.isActive) {
                const ref = doc(db, COLLECTION, id === sig.id ? id : sig.id);
                await updateDoc(ref, {
                    isActive: false,
                    updatedAt: serverTimestamp(),
                    updatedBy: userId
                });
            }
        }

        // Activate the selected one
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            isActive: true,
            updatedAt: serverTimestamp(),
            updatedBy: userId
        });

        return { success: true };
    } catch (error) {
        console.error('Error setting active signature:', error);
        throw error;
    }
}