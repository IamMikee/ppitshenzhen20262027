import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { updateEmailStatus } from '../../../../services/email';

const MAX_RECIPIENTS_PER_EMAIL = 100;

export async function POST(request) {
    try {
        const { to, subject, html, text, emailId, attachmentFiles, isIndividual } = await request.json();

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

        const buildAttachments = async () => {
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
                    }
                }
            }
            return attachments;
        };

        const attachments = await buildAttachments();

        if (isIndividual === false) {
            // Split recipients into batches of 100
            const batches = [];
            for (let i = 0; i < to.length; i += MAX_RECIPIENTS_PER_EMAIL) {
                batches.push(to.slice(i, i + MAX_RECIPIENTS_PER_EMAIL));
            }

            console.log(`📧 Sending ${to.length} recipients in ${batches.length} batches`);

            let totalSent = 0;

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                try {
                    const mailOptions = {
                        from: `"PPIT Shenzhen" <${process.env.GMAIL_USER}>`,
                        to: process.env.GMAIL_USER,
                        bcc: batch,
                        subject: subject || 'Broadcast Email',
                        text: text || '',
                        html: html || text?.replace(/\n/g, '<br>') || '',
                        attachments: attachments,
                    };

                    const info = await transporter.sendMail(mailOptions);
                    totalSent += batch.length;
                    console.log(`✅ Batch ${i + 1}/${batches.length}: Sent to ${batch.length} recipients (BCC)`);
                } catch (error) {
                    console.error(`❌ Batch ${i + 1} failed:`, error);
                    // Continue with next batch
                }
            }

            console.log(`✅ Sent bulk email to ${totalSent} recipients in ${batches.length} batches (BCC)`);

            if (emailId) {
                await updateEmailStatus(emailId, 'sent');
            }

            return NextResponse.json({
                success: true,
                message: `Sent to ${totalSent} recipients in ${batches.length} batches (BCC)`,
                results: {
                    successful: totalSent,
                    failed: to.length - totalSent,
                }
            });
        }

        const sendPromises = to.map(async (recipient) => {
            try {
                const mailOptions = {
                    from: `"PPIT Shenzhen" <${process.env.GMAIL_USER}>`,
                    to: recipient,
                    subject: subject || 'Broadcast Email',
                    text: text || '',
                    html: html || text?.replace(/\n/g, '<br>') || '',
                    attachments: attachments,
                };

                const info = await transporter.sendMail(mailOptions);
                console.log(`✅ Sent individual email to ${recipient}`);
                return { recipient, success: true, messageId: info.messageId };
            } catch (error) {
                console.error(`Failed to send to ${recipient}:`, error);
                return { recipient, success: false, error: error.message };
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
            message: `Sent to ${successful.length} recipients individually`,
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