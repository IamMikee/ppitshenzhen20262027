import { NextResponse } from 'next/server';
import { getBirthdayTemplates, saveBirthdayTemplate } from '@/services/email';

export async function GET() {
  try {
    const templates = await getBirthdayTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await saveBirthdayTemplate(body);
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Template saved successfully'
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}