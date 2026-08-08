import { NextResponse } from 'next/server';
import {
    getEmailSends,
    getAllRecipients,
    getBirthdayTemplates,
    createEmailSend,
    sendEmails,
    updateEmailStatus
} from '../../../services/email';

// ============================================================
// GET /api/emails
// Query params:
//   - type=recipients&cohort=2026  → Get recipients (optionally filtered by cohort)
//   - type=birthday-templates     → Get birthday templates
//   - lastDoc=xxx&limit=10        → Paginated email sends
// ============================================================
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const lastDoc = searchParams.get('lastDoc');
        const cohort = searchParams.get('cohort');
        const limit = parseInt(searchParams.get('limit') || '10');

        // Get recipients (with optional cohort filter)
        if (type === 'recipients') {
            const recipients = await getAllRecipients(cohort);
            return NextResponse.json({
                success: true,
                recipients
            });
        }

        // Get birthday templates
        if (type === 'birthday-templates') {
            const templates = await getBirthdayTemplates();
            return NextResponse.json({
                success: true,
                templates
            });
        }

        // Default: Get paginated email sends
        const result = await getEmailSends(lastDoc, limit);
        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('GET /api/emails error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// ============================================================
// POST /api/emails
// Body:
//   - recipients: string[]
//   - content: { subject, text, html, attachments }
//   - scheduledTime: string | null
//   - sendNow: boolean
//   - sendIndividually: boolean
//   - attachmentFiles: { name, cloudinaryUrl, type }[] (already uploaded)
// ============================================================
export async function POST(request) {
    try {
        const host = request.headers.get('host') || 'ppitshenzhen.org';
        const origin = request.headers.get('origin') ||
            (process.env.NODE_ENV === 'production'
                ? `https://${host}`
                : `http://localhost:3000`);

        const body = await request.json();
        const {
            recipients,
            content,
            scheduledTime,
            sendNow,
            sendIndividually = false,
            attachmentFiles = [],
        } = body;

        // Validate
        if (!recipients || recipients.length === 0) {
            return NextResponse.json(
                { success: false, error: 'At least one recipient is required' },
                { status: 400 }
            );
        }

        if (!content || (!content.text && !content.html)) {
            return NextResponse.json(
                { success: false, error: 'Email content is required' },
                { status: 400 }
            );
        }

        // The attachmentFiles are passed from the client with Cloudinary URLs
        const attachments = attachmentFiles.map(file => ({
            name: file.name,
            size: file.size || 0,
            type: file.type || 'application/octet-stream',
            cloudinaryUrl: file.cloudinaryUrl,
            publicId: file.publicId || null,
        }));

        const emailContent = {
            subject: content.subject || 'Broadcast Email',
            text: content.text,
            html: content.text?.replace(/\n/g, '<br>') || '',
            attachments: attachments, // Cloudinary URLs for storage
        };

        const emailData = {
            recipients,
            content: emailContent,
            scheduledTime: scheduledTime || null,
            status: 'pending',
            sendNow: sendNow || false,
            sendIndividually: sendIndividually,
            type: 'broadcast',
            attachmentFiles: attachments, // Store attachment metadata
        };

        const result = await createEmailSend(emailData);

        // If send now, trigger immediate sending
        if (sendNow) {
            // Pass attachmentFiles to sendEmails for nodemailer
            await sendEmails(
                recipients,
                emailContent,
                result.id,
                'broadcast',
                sendIndividually,
                attachments,
                origin
            );
        }

        const message = sendNow
            ? (sendIndividually
                ? `${recipients.length} emails sent individually`
                : 'Email sent successfully')
            : (sendIndividually
                ? `${recipients.length} emails scheduled individually`
                : 'Email scheduled successfully');

        return NextResponse.json({
            success: true,
            data: result,
            message,
            attachments: attachments, // Return attachment info
        });

    } catch (error) {
        console.error('POST /api/emails error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}