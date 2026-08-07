import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { updateEmailStatus } from '../../../../services/email';

export async function POST(request) {
    try {
        const { to, subject, html, text, emailId, attachmentFiles } = await request.json();

        if (!to || to.length === 0) {
            return NextResponse.json(
                { error: 'No recipients specified' },
                { status: 400 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        const sendPromises = to.map(async (recipient) => {
            try {
                const attachments = [];
                if (attachmentFiles && attachmentFiles.length > 0) {
                    for (const file of attachmentFiles) {
                        try {
                            const response = await fetch(file.cloudinaryUrl || file.url);
                            if (!response.ok) throw new Error(`Failed to download ${file.name}`);
                            
                            const buffer = await response.arrayBuffer();
                            attachments.push({
                                filename: file.name,
                                content: Buffer.from(buffer),
                                contentType: file.type || 'application/octet-stream',
                            });
                        } catch (error) {
                            console.error(`Failed to download ${file.name}:`, error);
                            // Continue without this attachment
                        }
                    }
                }

                const mailOptions = {
                    from: `"PPIT Shenzhen" <${process.env.GMAIL_USER}>`,
                    to: recipient,
                    subject: subject || 'Broadcast Email',
                    text: text || '',
                    html: html || text?.replace(/\n/g, '<br>') || '',
                    attachments: attachments,
                };

                const info = await transporter.sendMail(mailOptions);
                return { 
                    recipient, 
                    success: true, 
                    messageId: info.messageId 
                };
            } catch (error) {
                console.error(`Failed to send to ${recipient}:`, error);
                return { 
                    recipient, 
                    success: false, 
                    error: error.message 
                };
            }
        });

        const results = await Promise.all(sendPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        if (emailId) {
            if (failed.length === 0) {
                await updateEmailStatus(emailId, 'sent');
            } else {
                await updateEmailStatus(
                    emailId, 
                    'sent', 
                    `${failed.length} recipients failed`
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sent to ${successful.length} recipients`,
            results: {
                successful: successful.length,
                failed: failed.length,
            }
        });
    } catch (error) {
        console.error('Email sending error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}