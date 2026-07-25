import { NextResponse } from 'next/server';
import { processScheduledEmails } from '@/services/email';

export async function GET(request) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        if (!cronSecret) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json(
                { error: 'Cron secret not configured' },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error('Unauthorized cron request');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Process scheduled emails
        const result = await processScheduledEmails();
        
        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}