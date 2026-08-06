import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { getUserNameByEmail } from './forms';

const EMAIL_SENDS_COLLECTION = 'emailSends';
const BIRTHDAY_TEMPLATES_COLLECTION = 'birthdayTemplates';
const USERS_COLLECTION = 'users';

// ============================================================
// EMAIL CRUD OPERATIONS
// ============================================================

export async function createEmailSend(emailData) {
    try {
        const docRef = await addDoc(collection(db, EMAIL_SENDS_COLLECTION), {
            ...emailData,
            status: emailData.scheduledTime ? 'scheduled' : 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { id: docRef.id, ...emailData };
    } catch (error) {
        console.error('Error creating email send:', error);
        throw error;
    }
}

export async function getEmailSends(lastDoc = null, limitCount = 10) {
    try {
        let q = query(
            collection(db, EMAIL_SENDS_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        if (lastDoc) {
            q = query(
                collection(db, EMAIL_SENDS_COLLECTION),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(limitCount)
            );
        }

        const querySnapshot = await getDocs(q);
        const emails = [];
        let lastVisible = null;

        querySnapshot.forEach((doc) => {
            emails.push({ id: doc.id, ...doc.data() });
            lastVisible = doc;
        });

        return { emails, lastVisible };
    } catch (error) {
        console.error('Error fetching email sends:', error);
        throw error;
    }
}

export async function updateEmailStatus(emailId, status, error = null) {
    try {
        const docRef = doc(db, EMAIL_SENDS_COLLECTION, emailId);
        await updateDoc(docRef, {
            status,
            sentAt: status === 'sent' ? serverTimestamp() : null,
            error: error || null,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating email status:', error);
        throw error;
    }
}

export async function getScheduledEmails(currentTime) {
    try {
        const q = query(
            collection(db, EMAIL_SENDS_COLLECTION),
            where('status', '==', 'scheduled'),
            where('scheduledTime', '<=', currentTime)
        );
        const querySnapshot = await getDocs(q);
        const emails = [];
        querySnapshot.forEach((doc) => {
            emails.push({ id: doc.id, ...doc.data() });
        });
        return emails;
    } catch (error) {
        console.error('Error fetching scheduled emails:', error);
        throw error;
    }
}

// ============================================================
// RECIPIENT FUNCTIONS
// ============================================================

export async function getAllRecipients(cohort = null) {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        let q;
        
        if (cohort) {
            q = query(
                usersRef,
                where('status', '==', 'active'),
                where('graduated', '==', false),
                where('cohortYear', '==', parseInt(cohort))
            );
        } else {
            q = query(
                usersRef,
                where('status', '==', 'active'),
                where('graduated', '==', false)
            );
        }
        
        const querySnapshot = await getDocs(q);
        const recipients = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            recipients.push({
                id: doc.id,
                email: data.email,
                name: data.name || data.displayName || '',
                cohortYear: data.cohortYear || null,
                birthday: data.birthday || null,
            });
        });
        
        return recipients;
    } catch (error) {
        console.error('Error fetching recipients:', error);
        return [];
    }
}

export async function getBirthdayRecipients() {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(
            usersRef,
            where('status', '==', 'active'),
            where('graduated', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        const today = new Date();
        const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;
        const recipients = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.birthday) {
                const bday = new Date(data.birthday);
                const bdayStr = `${bday.getMonth() + 1}-${bday.getDate()}`;
                if (bdayStr === todayStr) {
                    recipients.push({
                        id: doc.id,
                        email: data.email,
                        name: data.name || data.displayName || '',
                        birthday: data.birthday,
                    });
                }
            }
        });
        
        return recipients;
    } catch (error) {
        console.error('Error fetching birthday recipients:', error);
        return [];
    }
}

// ============================================================
// BIRTHDAY TEMPLATE FUNCTIONS
// ============================================================

export async function getBirthdayTemplates() {
    try {
        const q = query(
            collection(db, BIRTHDAY_TEMPLATES_COLLECTION),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const templates = [];
        querySnapshot.forEach((doc) => {
            templates.push({ id: doc.id, ...doc.data() });
        });
        return templates;
    } catch (error) {
        console.error('Error fetching birthday templates:', error);
        return [];
    }
}

export async function getActiveBirthdayTemplate() {
    try {
        const q = query(
            collection(db, BIRTHDAY_TEMPLATES_COLLECTION),
            where('isActive', '==', true),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('Error getting active birthday template:', error);
        return null;
    }
}

export async function saveBirthdayTemplate(templateData) {
    try {
        let docRef;
        if (templateData.id) {
            docRef = doc(db, BIRTHDAY_TEMPLATES_COLLECTION, templateData.id);
            await updateDoc(docRef, {
                ...templateData,
                updatedAt: serverTimestamp(),
            });
        } else {
            docRef = await addDoc(collection(db, BIRTHDAY_TEMPLATES_COLLECTION), {
                ...templateData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
        return { id: docRef.id, ...templateData };
    } catch (error) {
        console.error('Error saving birthday template:', error);
        throw error;
    }
}

// ============================================================
// SEND EMAILS (NO PERSONALIZATION FOR BROADCAST)
// ============================================================

export async function sendEmails(recipients, content, emailId, type = 'broadcast', individually = false) {
    try {
        await updateEmailStatus(emailId, 'sending');

        const emailData = {
            to: recipients,
            subject: content.subject || 'Broadcast Email',
            html: content.html || content.text?.replace(/\n/g, '<br>') || '',
            text: content.text || '',
            type: type,
            individually: individually,
        };

        if (individually) {
            const results = [];
            for (const recipient of recipients) {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/emails/send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            emailId,
                            ...emailData,
                            to: [recipient],
                            isIndividual: true,
                        }),
                    });
                    const result = await response.json();
                    results.push({ recipient, success: response.ok, result });
                } catch (error) {
                    results.push({ recipient, success: false, error: error.message });
                }
            }
            
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            await updateEmailStatus(
                emailId, 
                successful.length > 0 ? 'sent' : 'failed', 
                failed.length > 0 ? `${failed.length} recipients failed` : null
            );
            
            return { results, successful: successful.length, failed: failed.length };
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/emails/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emailId,
                ...emailData,
                isIndividual: false,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send emails');
        }

        const result = await response.json();
        await updateEmailStatus(emailId, 'sent', null);
        return result;
    } catch (error) {
        console.error('Error sending emails:', error);
        await updateEmailStatus(emailId, 'failed', error.message);
        throw error;
    }
}

// ============================================================
// BIRTHDAY PROCESSING (ONLY PERSONALIZATION HERE)
// ============================================================

export async function processBirthdayEmails() {
    try {
        const today = new Date();
        const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;
        
        console.log(`🎂 Checking birthdays for ${todayStr}...`);
        
        const birthdayPeople = await getBirthdayRecipients();

        if (birthdayPeople.length === 0) {
            console.log('No birthdays today');
            return { sent: 0, message: 'No birthdays today' };
        }

        console.log(`🎂 Found ${birthdayPeople.length} birthdays today`);

        const activeTemplate = await getActiveBirthdayTemplate();

        if (!activeTemplate) {
            console.log('No active birthday template found');
            return { sent: 0, message: 'No active birthday template' };
        }

        let sentCount = 0;
        for (const person of birthdayPeople) {
            try {
                const name = person.name || person.email.split('@')[0];
                
                const personalizedContent = {
                    subject: activeTemplate.subject.replace(/{name}/g, name),
                    text: activeTemplate.text.replace(/{name}/g, name),
                    html: activeTemplate.html?.replace(/{name}/g, name),
                };

                const emailData = {
                    recipients: [person.email],
                    content: personalizedContent,
                    type: 'birthday',
                    status: 'pending',
                    scheduledTime: null,
                    sendNow: true,
                    sendIndividually: false,
                    useHTML: true,
                    recipientInfo: person,
                };

                const result = await createEmailSend(emailData);
                await sendEmails([person.email], personalizedContent, result.id, 'birthday', false);
                sentCount++;
                console.log(`✅ Sent birthday email to ${name} (${person.email})`);
            } catch (error) {
                console.error(`❌ Error sending birthday email to ${person.email}:`, error);
            }
        }

        return { 
            sent: sentCount, 
            total: birthdayPeople.length,
            message: `Sent ${sentCount} birthday emails out of ${birthdayPeople.length}` 
        };
    } catch (error) {
        console.error('Error processing birthday emails:', error);
        throw error;
    }
}

// ============================================================
// SCHEDULED EMAIL PROCESSING
// ============================================================

export async function processScheduledEmails() {
    try {
        const now = new Date();
        const scheduledEmails = await getScheduledEmails(now);
        
        let processed = 0;
        for (const email of scheduledEmails) {
            const scheduledTime = email.scheduledTime.toDate ? 
                email.scheduledTime.toDate() : new Date(email.scheduledTime);
            
            if (scheduledTime.getHours() === now.getHours() && 
                scheduledTime.getDate() === now.getDate() &&
                scheduledTime.getMonth() === now.getMonth() &&
                scheduledTime.getFullYear() === now.getFullYear()) {
                await sendEmails(
                    email.recipients, 
                    email.content, 
                    email.id, 
                    email.type || 'broadcast',
                    email.sendIndividually || false
                );
                processed++;
            }
        }
        return { processed };
    } catch (error) {
        console.error('Error processing scheduled emails:', error);
        throw error;
    }
}