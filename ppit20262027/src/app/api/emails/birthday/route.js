import { NextResponse } from 'next/server';
import { processBirthdayEmails, getBirthdayRecipients } from '@/services/email';

// GET: Check today's birthdays
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'check') {
      const recipients = await getBirthdayRecipients();
      const today = new Date();
      const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;
      
      const birthdays = recipients.filter(r => {
        if (!r.birthday) return false;
        const bday = new Date(r.birthday);
        return `${bday.getMonth() + 1}-${bday.getDate()}` === todayStr;
      });

      return NextResponse.json({
        today: todayStr,
        birthdayCount: birthdays.length,
        birthdays: birthdays.map(b => ({ name: b.name, email: b.email }))
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: Process birthday emails
export async function POST(request) {
  try {
    const result = await processBirthdayEmails();
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}