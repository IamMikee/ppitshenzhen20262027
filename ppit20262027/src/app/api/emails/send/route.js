import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { updateEmailStatus } from '@/services/email';

// Configure Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
  },
});

export async function POST(request) {
  try {
    const { to, subject, html, text, emailId } = await request.json();

    // Validate
    if (!to || to.length === 0) {
      throw new Error('No recipients specified');
    }

    // For multiple recipients, send individually or use BCC
    const sendPromises = to.map(async (recipient) => {
      try {
        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: recipient,
          subject: subject || 'Broadcast Email',
          text: text || '',
          html: html || text?.replace(/\n/g, '<br>') || '',
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${recipient}: ${info.messageId}`);
        return { recipient, success: true, messageId: info.messageId };
      } catch (error) {
        console.error(`Failed to send to ${recipient}:`, error);
        return { recipient, success: false, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Update status
    if (emailId) {
      if (failed.length === 0) {
        await updateEmailStatus(emailId, 'sent');
      } else if (successful.length === 0) {
        await updateEmailStatus(emailId, 'failed', 'All recipients failed');
      } else {
        await updateEmailStatus(emailId, 'sent', `${failed.length} recipients failed`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent to ${successful.length} recipients`,
      results: {
        successful: successful.length,
        failed: failed.length,
        details: { successful, failed }
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