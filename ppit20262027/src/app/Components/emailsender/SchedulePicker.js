'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';

export default function SchedulePicker({
  sendNow,
  onSendNowChange,
  scheduledTime,
  onScheduledTimeChange,
}) {
  const [date, setDate] = useState('');

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Singapore'
    });
  };

  const today = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={sendNow}
            onChange={() => {
              onSendNowChange(true);
              onScheduledTimeChange(null);
              setDate('');
            }}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-500">Send Now</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!sendNow}
            onChange={() => onSendNowChange(false)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-500">Schedule</span>
        </label>
      </div>

      {!sendNow && (
        <div className="bg-gray-50 rounded-md p-4 space-y-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  setDate(selectedDate);

                  if (selectedDate) {
                    const [year, month, day] = selectedDate.split('-');
                    const scheduledDate = new Date(`${year}-${month}-${day}T08:00:00+08:00`);
                    const timestamp = Timestamp.fromDate(scheduledDate);
                    onScheduledTimeChange(timestamp);
                  }
                }}
                className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                min={today}
              />
            </div>
            <p className="text-xs text-gray-500">
              Reminder: scheduled emails are sent daily at <b>8:00 AM (GMT+8)</b>
            </p>
          </div>
        </div>
      )}

      {scheduledTime && !sendNow && date && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Scheduled for: <strong>{formatDisplayDate(date)} at 8:00 AM (GMT+8)</strong>
          </p>
        </div>
      )}
    </div>
  );
}