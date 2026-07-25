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
  serverTimestamp,
} from 'firebase/firestore';

const EMAIL_SENDS_COLLECTION = 'emailSends';
const BIRTHDAY_TEMPLATES_COLLECTION = 'birthdayTemplates';

// ============ EMAIL SENDING FUNCTIONS ============

// Send emails using Gmail API or Nodemailer
export async function sendEmails(recipients, content, emailId, type = 'broadcast') {
  try {
    await updateEmailStatus(emailId, 'sending');

    // Prepare email data
    const emailData = {
      to: recipients,
      subject: content.subject || 'Broadcast Email',
      html: content.html || content.text?.replace(/\n/g, '<br>') || '',
      text: content.text || '',
      type: type,
    };

    // Call your email sending API
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId,
        ...emailData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send emails');
    }

    const result = await response.json();
    
    // Update status to sent
    await updateEmailStatus(emailId, 'sent', null);
    return result;
  } catch (error) {
    console.error('Error sending emails:', error);
    await updateEmailStatus(emailId, 'failed', error.message);
    throw error;
  }
}

// ============ BROADCAST EMAIL FUNCTIONS ============

export async function createEmailSend(emailData) {
  try {
    const docRef = await addDoc(collection(db, EMAIL_SENDS_COLLECTION), {
      ...emailData,
      type: 'broadcast',
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

export async function getEmailSends(lastDoc = null, pageSize = 20) {
  try {
    let q = query(
      collection(db, EMAIL_SENDS_COLLECTION),
      where('type', '==', 'broadcast'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        collection(db, EMAIL_SENDS_COLLECTION),
        where('type', '==', 'broadcast'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
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

// ============ BIRTHDAY EMAIL FUNCTIONS ============

// Get all recipients with birthday info
export async function getBirthdayRecipients() {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const recipients = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email && data.birthday) {
        recipients.push({
          id: doc.id,
          email: data.email,
          name: data.name || data.displayName || '',
          birthday: data.birthday, // Store as date string or timestamp
          department: data.department || '',
        });
      }
    });
    return recipients;
  } catch (error) {
    console.error('Error fetching birthday recipients:', error);
    throw error;
  }
}

// Get all recipients (for broadcast)
export async function getAllRecipients() {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const recipients = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email) {
        recipients.push({
          id: doc.id,
          email: data.email,
          name: data.name || data.displayName || '',
          department: data.department || '',
          birthday: data.birthday || null,
        });
      }
    });
    return recipients;
  } catch (error) {
    console.error('Error fetching recipients:', error);
    throw error;
  }
}

// Get birthday templates
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
    throw error;
  }
}

// Create or update birthday template
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

// Process automated birthday emails
export async function processBirthdayEmails() {
  try {
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;
    
    // Get all users with birthdays today
    const recipients = await getBirthdayRecipients();
    const birthdayPeople = recipients.filter(r => {
      if (!r.birthday) return false;
      const bday = new Date(r.birthday);
      return `${bday.getMonth() + 1}-${bday.getDate()}` === todayStr;
    });

    if (birthdayPeople.length === 0) {
      console.log('No birthdays today');
      return { sent: 0, message: 'No birthdays today' };
    }

    // Get active birthday template
    const templates = await getBirthdayTemplates();
    const activeTemplate = templates.find(t => t.isActive);

    if (!activeTemplate) {
      console.log('No active birthday template found');
      return { sent: 0, message: 'No active birthday template' };
    }

    // Send birthday emails
    let sentCount = 0;
    for (const person of birthdayPeople) {
      try {
        // Personalize content
        const personalizedContent = {
          subject: activeTemplate.subject.replace(/{name}/g, person.name || ''),
          text: activeTemplate.text.replace(/{name}/g, person.name || ''),
          html: activeTemplate.html?.replace(/{name}/g, person.name || ''),
        };

        // Create email record
        const emailData = {
          recipients: [person.email],
          content: personalizedContent,
          type: 'birthday',
          status: 'pending',
          scheduledTime: null,
          sendNow: true,
          recipientInfo: person,
        };

        const result = await createEmailSend(emailData);
        await sendEmails([person.email], personalizedContent, result.id, 'birthday');
        sentCount++;
      } catch (error) {
        console.error(`Error sending birthday email to ${person.email}:`, error);
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

// ============ COMMON FUNCTIONS ============

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

export async function processScheduledEmails() {
  try {
    const now = new Date();
    const scheduledEmails = await getScheduledEmails(now);
    
    let processed = 0;
    for (const email of scheduledEmails) {
      const scheduledTime = email.scheduledTime.toDate ? 
        email.scheduledTime.toDate() : new Date(email.scheduledTime);
      
      // Check if it's time to send (hourly precision)
      if (scheduledTime.getHours() === now.getHours() && 
          scheduledTime.getDate() === now.getDate() &&
          scheduledTime.getMonth() === now.getMonth() &&
          scheduledTime.getFullYear() === now.getFullYear()) {
        await sendEmails(email.recipients, email.content, email.id, email.type || 'broadcast');
        processed++;
      }
    }
    return { processed };
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    throw error;
  }
}