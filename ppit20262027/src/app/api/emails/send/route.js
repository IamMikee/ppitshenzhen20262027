import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { updateEmailStatus } from '../../../../services/email';

const MAX_RECIPIENTS_PER_EMAIL = 80;
const DELAY_BETWEEN_BATCHES = 5000;
const DELAY_BETWEEN_INDIVIDUAL = 2000;

export async function POST(request) {
    try {
        const { to, subject, html, text, emailId, attachmentFiles, isIndividual } = await request.json();

        if (!to || to.length === 0) {
            return NextResponse.json(
                { error: 'No recipients specified' },
                { status: 400 }
            );
        }

        // Use connection pool (reuses the same connection)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
            pool: true,      
            maxConnections: 1,  
            maxMessages: Infinity,
            rateLimit: true,
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
            // Split recipients into batches of 80
            const batches = [];
            for (let i = 0; i < to.length; i += MAX_RECIPIENTS_PER_EMAIL) {
                batches.push(to.slice(i, i + MAX_RECIPIENTS_PER_EMAIL));
            }

            console.log(`📧 Sending ${to.length} recipients in ${batches.length} batches (max ${MAX_RECIPIENTS_PER_EMAIL} per batch)`);

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

                    // FIX 2: Delay between batches
                    if (i < batches.length - 1) {
                        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                    }
                } catch (error) {
                    console.error(`❌ Batch ${i + 1} failed:`, error);
                    // If rate-limited, wait longer
                    if (error.message?.includes('Too many login attempts')) {
                        console.log('⏳ Rate limit hit, waiting 30 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 30000));
                    }
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

        // INDIVIDUAL SEND - with delay between each email
        const results = [];
        for (let i = 0; i < to.length; i++) {
            const recipient = to[i];
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
                console.log(`✅ Sent individual email to ${recipient} (${i + 1}/${to.length})`);
                results.push({ recipient, success: true, messageId: info.messageId });

                if (i < to.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_INDIVIDUAL));
                }
            } catch (error) {
                console.error(`Failed to send to ${recipient}:`, error);
                results.push({ recipient, success: false, error: error.message });

                if (error.message?.includes('Too many login attempts')) {
                    console.log('⏳ Rate limit hit, waiting 30 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            }
        }

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