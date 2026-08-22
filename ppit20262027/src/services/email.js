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
        let scheduledTime = emailData.scheduledTime;

        if (scheduledTime && typeof scheduledTime === 'object' && scheduledTime.seconds !== undefined) {
            // Convert serialized Map to Timestamp
            scheduledTime = new Timestamp(scheduledTime.seconds, scheduledTime.nanoseconds || 0);
        } else if (scheduledTime instanceof Date) {
            scheduledTime = Timestamp.fromDate(scheduledTime);
        } else if (typeof scheduledTime === 'string') {
            scheduledTime = Timestamp.fromDate(new Date(scheduledTime));
        }

        const docRef = await addDoc(collection(db, EMAIL_SENDS_COLLECTION), {
            ...emailData,
            scheduledTime: scheduledTime,
            status: scheduledTime ? 'scheduled' : 'pending',
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
        // Convert Date to Timestamp for Firestore query
        const timestamp = Timestamp.fromDate(currentTime);

        console.log(`Querying for scheduled emails <= ${timestamp.seconds} (${currentTime.toISOString()})`);

        const q = query(
            collection(db, EMAIL_SENDS_COLLECTION),
            where('status', '==', 'scheduled'),
            where('scheduledTime', '<=', timestamp)
        );
        const querySnapshot = await getDocs(q);

        console.log(`Found ${querySnapshot.size} scheduled emails due`);

        const emails = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const scheduledTime = data.scheduledTime?.toDate?.() || new Date(data.scheduledTime);
            console.log(`Email: ${data.content?.subject}, scheduled: ${scheduledTime.toISOString()}`);
            emails.push({
                id: doc.id,
                ...data,
                scheduledTime: scheduledTime // Convert to Date for easier handling
            });
        });
        return emails;
    } catch (error) {
        console.error('Error fetching scheduled emails:', error);
        return [];
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

export async function sendEmails(recipients, content, emailId, type = 'broadcast', individually = false, attachmentFiles = [], origin = null) {
    try {
        await updateEmailStatus(emailId, 'sending');

        const emailData = {
            to: recipients,
            subject: content.subject || 'Broadcast Email',
            html: content.html || content.text?.replace(/\n/g, '<br>') || '',
            text: content.text || '',
            type: type,
            individually: individually,
            attachmentFiles: attachmentFiles
        };

        const apiUrl = `${origin}/api/emails/send`;

        if (individually) {
            const results = [];
            for (const recipient of recipients) {
                try {
                    const response = await fetch(apiUrl, {
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

        const response = await fetch(apiUrl, {
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
        console.log(`Checking scheduled emails at ${now.toISOString()}`);

        // Get all due scheduled emails
        const scheduledEmails = await getScheduledEmails(now);
        console.log(`Found ${scheduledEmails.length} scheduled emails due`);

        let processed = 0;
        for (const email of scheduledEmails) {
            try {
                console.log(`Sending: ${email.content?.subject} (${email.recipients?.length || 0} recipients)`);

                await sendEmails(
                    email.recipients,
                    email.content,
                    email.id,
                    email.type || 'broadcast',
                    email.sendIndividually || false,
                    email.attachmentFiles || []
                );
                processed++;
                console.log(`✅ Sent email ${email.id}`);
            } catch (error) {
                console.error(`❌ Failed to send email ${email.id}:`, error);
            }
        }

        console.log(`Processed ${processed} scheduled emails`);
        return { processed };
    } catch (error) {
        console.error('Error processing scheduled emails:', error);
        throw error;
    }
}

// ============================================================
// WRAPS EMAIL IN PROPER VIEWPORT
// ============================================================
export function getEmailWrapper(content) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  
  <style>
    /* Gmail-specific styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    /* This prevents Gmail from resizing fonts on mobile */
    body, 
    .body, 
    .container, 
    .content, 
    .main-content,
    table, 
    td, 
    p, 
    a, 
    div, 
    span,
    h1, h2, h3, h4, h5, h6 {
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
      mso-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }
    
    /* Reset body */
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Main container - this is crucial for mobile */
    .email-container {
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
      padding: 20px 15px;
      background-color: #ffffff;
    }
    
    /* All text must have explicit sizes */
    .email-container * {
      font-size: 14px;
      line-height: 1.6;
    }
    
    .email-container h1 {
      font-size: 28px !important;
      line-height: 1.2 !important;
      margin: 0 0 15px 0 !important;
    }
    
    .email-container h2 {
      font-size: 24px !important;
      line-height: 1.3 !important;
      margin: 0 0 12px 0 !important;
    }
    
    .email-container h3 {
      font-size: 20px !important;
      line-height: 1.4 !important;
      margin: 0 0 10px 0 !important;
    }
    
    .email-container p {
      font-size: 14px !important;
      line-height: 1.6 !important;
      margin: 0 0 12px 0 !important;
    }
    
    .email-container div,
    .email-container span,
    .email-container li {
      font-size: 14px !important;
      line-height: 1.6 !important;
    }
    
    /* Images - make them responsive */
    .email-container img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
    }
    
    /* Gmail app specific fixes */
    u + .body .email-container {
      width: 100% !important;
    }
    
    /* Outlook and older clients */
    .ReadMsgBody {
      width: 100% !important;
    }
    .ExternalClass {
      width: 100% !important;
    }
    .ExternalClass,
    .ExternalClass p,
    .ExternalClass span,
    .ExternalClass font,
    .ExternalClass td,
    .ExternalClass div {
      line-height: 100% !important;
    }
    
    /* Mobile-specific adjustments */
    @media only screen and (max-width: 480px) {
      .email-container {
        padding: 15px 10px !important;
        width: 100% !important;
      }
      
      .email-container h1 {
        font-size: 24px !important;
      }
      
      .email-container h2 {
        font-size: 20px !important;
      }
      
      .email-container h3 {
        font-size: 18px !important;
      }
      
      .email-container p,
      .email-container div,
      .email-container span {
        font-size: 14px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${content}
  </div>
</body>
</html>
  `;
};