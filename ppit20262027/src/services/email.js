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

        // If sending individually, call API for each recipient
        if (individually) {
            const results = [];
            for (const recipient of recipients) {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/emails/send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            emailId,
                            ...emailData,
                            to: [recipient], // Send one at a time
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
            
            await updateEmailStatus(emailId, successful.length > 0 ? 'sent' : 'failed', 
                failed.length > 0 ? `${failed.length} recipients failed` : null);
            
            return { results, successful: successful.length, failed: failed.length };
        }

        // Regular bulk send
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/emails/send`, {
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