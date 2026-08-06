import { NextResponse } from 'next/server';
import { 
    getEmailSends, 
    getAllRecipients, 
    createEmailSend,
    sendEmails
} from '@/services/email';

export async function POST(request) {
    try {
        const body = await request.json();
        const { 
            recipients, 
            content, 
            scheduledTime, 
            sendNow,
            sendIndividually = false,
            useHTML = false,
        } = body;

        if (!recipients || recipients.length === 0) {
            return NextResponse.json(
                { error: 'At least one recipient is required' },
                { status: 400 }
            );
        }

        if (!content || (!content.text && !content.html)) {
            return NextResponse.json(
                { error: 'Email content is required' },
                { status: 400 }
            );
        }

        // Prepare content based on HTML mode
        const emailContent = {
            subject: content.subject || 'Broadcast Email',
            text: useHTML ? '' : content.text,
            html: useHTML ? content.text : content.text.replace(/\n/g, '<br>'),
            isHTML: useHTML,
        };

        // If sending individually, prepare for multiple sends
        if (sendIndividually) {
            // Store as individual send
            const emailData = {
                recipients,
                content: emailContent,
                scheduledTime: scheduledTime || null,
                status: 'pending',
                sendNow: sendNow || false,
                sendIndividually: true,
                useHTML: useHTML,
            };

            const result = await createEmailSend(emailData);

            if (sendNow) {
                // Send individually - one email per recipient
                await sendEmails(recipients, emailContent, result.id, 'broadcast', true);
            }

            return NextResponse.json({
                success: true,
                data: result,
                message: sendNow ? `${recipients.length} emails sent individually` : `${recipients.length} emails scheduled individually`
            });
        }

        // Regular bulk send
        const emailData = {
            recipients,
            content: emailContent,
            scheduledTime: scheduledTime || null,
            status: 'pending',
            sendNow: sendNow || false,
            sendIndividually: false,
            useHTML: useHTML,
        };

        const result = await createEmailSend(emailData);

        if (sendNow) {
            await sendEmails(recipients, emailContent, result.id, 'broadcast', false);
        }

        return NextResponse.json({
            success: true,
            data: result,
            message: sendNow ? 'Email sent successfully' : 'Email scheduled successfully'
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}