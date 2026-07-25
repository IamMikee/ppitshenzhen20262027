import { NextResponse } from 'next/server';
import { 
  getEmailSends, 
  getAllRecipients, 
  getBirthdayRecipients,
  createEmailSend,
  sendEmails,
  getBirthdayTemplates,
  saveBirthdayTemplate
} from '@/services/email';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const lastDoc = searchParams.get('lastDoc');

    if (type === 'recipients') {
      const recipients = await getAllRecipients();
      return NextResponse.json({ recipients });
    }

    if (type === 'birthday-recipients') {
      const recipients = await getBirthdayRecipients();
      return NextResponse.json({ recipients });
    }

    if (type === 'birthday-templates') {
      const templates = await getBirthdayTemplates();
      return NextResponse.json({ templates });
    }

    // Get email sends with pagination
    const result = await getEmailSends(lastDoc);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      recipients, 
      content, 
      scheduledTime, 
      sendNow, 
      type = 'broadcast',
      templateData 
    } = body;

    // Handle template saving
    if (type === 'template') {
      const result = await saveBirthdayTemplate(templateData);
      return NextResponse.json({
        success: true,
        data: result,
        message: 'Template saved successfully'
      });
    }

    // Validate broadcast email
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

    // Create email send record
    const emailData = {
      recipients,
      content,
      scheduledTime: scheduledTime || null,
      status: 'pending',
      sendNow: sendNow || false,
      type: type || 'broadcast',
    };

    const result = await createEmailSend(emailData);

    // If send now, trigger immediate sending
    if (sendNow) {
      await sendEmails(recipients, content, result.id, type || 'broadcast');
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