// src/app/api/emails/send/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { updateEmailStatus } from '../../../../services/email';

const MAX_RECIPIENTS_PER_EMAIL = 80;
const DELAY_BETWEEN_BATCHES = 5000;
const DELAY_BETWEEN_INDIVIDUAL = 2000;
const RATE_LIMIT_WAIT = 30000;
const MAX_RETRIES = 3;

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

        // Helper function to send with retry
        const sendWithRetry = async (mailOptions, context) => {
            let lastError = null;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const info = await transporter.sendMail(mailOptions);
                    return { success: true, info };
                } catch (error) {
                    lastError = error;
                    console.log(`⚠️ Attempt ${attempt}/${MAX_RETRIES} failed for ${context}:`, error.message);

                    if (error.message?.includes('Too many login attempts')) {
                        console.log(`⏳ Rate limit hit, waiting ${RATE_LIMIT_WAIT / 1000} seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WAIT));
                    } else if (attempt < MAX_RETRIES) {
                        const waitTime = attempt * 2000;
                        console.log(`⏳ Waiting ${waitTime / 1000} seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }
            return { success: false, error: lastError };
        };

        if (isIndividual === false) {
            // Split recipients into batches of 80
            const batches = [];
            for (let i = 0; i < to.length; i += MAX_RECIPIENTS_PER_EMAIL) {
                batches.push(to.slice(i, i + MAX_RECIPIENTS_PER_EMAIL));
            }

            console.log(`📧 Sending ${to.length} recipients in ${batches.length} batches (max ${MAX_RECIPIENTS_PER_EMAIL} per batch)`);

            let totalSent = 0;
            let failedBatches = [];

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`📤 Processing batch ${i + 1}/${batches.length} with ${batch.length} recipients...`);

                const mailOptions = {
                    from: `"PPIT Shenzhen" <${process.env.GMAIL_USER}>`,
                    to: process.env.GMAIL_USER,
                    bcc: batch,
                    subject: subject || 'Broadcast Email',
                    text: text || '',
                    html: html || text?.replace(/\n/g, '<br>') || '',
                    attachments: attachments,
                };

                const result = await sendWithRetry(mailOptions, `batch ${i + 1}`);

                if (result.success) {
                    totalSent += batch.length;
                    console.log(`✅ Batch ${i + 1}/${batches.length}: Successfully sent to ${batch.length} recipients (BCC)`);
                } else {
                    console.error(`❌ Batch ${i + 1}/${batches.length}: FAILED after ${MAX_RETRIES} attempts - ${result.error?.message || 'Unknown error'}`);
                    failedBatches.push({ batchNumber: i + 1, count: batch.length, error: result.error?.message });
                }

                // Delay between batches
                if (i < batches.length - 1) {
                    console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                }
            }

            const failedCount = failedBatches.reduce((sum, b) => sum + b.count, 0);
            console.log(`📊 SUMMARY: Sent ${totalSent} recipients, ${failedCount} failed in ${failedBatches.length} batches`);

            if (emailId) {
                await updateEmailStatus(emailId, 'sent');
            }

            return NextResponse.json({
                success: true,
                message: `Sent to ${totalSent} recipients in ${batches.length} batches (BCC)`,
                results: {
                    successful: totalSent,
                    failed: failedCount,
                    failedBatches: failedBatches,
                }
            });
        }

        // INDIVIDUAL SEND - with delay between each email
        const results = [];
        let rateLimitHit = false;

        for (let i = 0; i < to.length; i++) {
            const recipient = to[i];
            console.log(`📤 Processing recipient ${i + 1}/${to.length}: ${recipient}`);

            const mailOptions = {
                from: `"PPIT Shenzhen" <${process.env.GMAIL_USER}>`,
                to: recipient,
                subject: subject || 'Broadcast Email',
                text: text || '',
                html: html || text?.replace(/\n/g, '<br>') || '',
                attachments: attachments,
            };

            const result = await sendWithRetry(mailOptions, recipient);

            if (result.success) {
                console.log(`✅ Sent to ${recipient} (${i + 1}/${to.length})`);
                results.push({ recipient, success: true, messageId: result.info.messageId });
            } else {
                console.error(`❌ Failed to send to ${recipient} after ${MAX_RETRIES} attempts: ${result.error?.message || 'Unknown error'}`);
                results.push({ recipient, success: false, error: result.error?.message });
            }

            // Delay between individual emails
            if (i < to.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_INDIVIDUAL));
            }
        }

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`📊 SUMMARY: Sent ${successful.length} emails successfully, ${failed.length} failed`);

        if (emailId) {
            if (failed.length === 0) {
                await updateEmailStatus(emailId, 'sent');
                console.log(`✅ Email status updated to 'sent'`);
            } else {
                await updateEmailStatus(
                    emailId,
                    'sent',
                    `${failed.length} recipients failed`
                );
                console.log(`⚠️ Email status updated to 'sent' with ${failed.length} failures`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sent to ${successful.length} recipients individually`,
            results: {
                successful: successful.length,
                failed: failed.length,
                details: results,
            }
        });

    } catch (error) {
        console.error('❌ Email sending error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}