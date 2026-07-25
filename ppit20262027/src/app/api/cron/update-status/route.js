// src/app/api/cron/update-statuses/route.js
import { NextResponse } from 'next/server';
import { updateUserStatus } from '../../../../services/forms';

export async function GET(request) {
    try {
        // 1. Verify cron secret
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // 2. Check if first day of month
        const now = new Date();
        const isFirstDay = now.getDate() === 1;
        
        if (!isFirstDay) {
            return NextResponse.json({
                success: true,
                message: 'Not the first day of the month. Skipping.',
                executed: false
            });
        }

        // 3. Run the status update
        console.log('🔄 Updating user statuses...');
        const result = await updateUserStatus();
        console.log(`✅ Updated ${result.updated} users`);

        return NextResponse.json({
            success: true,
            ...result,
            executed: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Status update error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}