'use client';

import { useState } from 'react';

export default function SchedulePicker({
  sendNow,
  onSendNowChange,
  scheduledTime,
  onScheduledTimeChange,
}) {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');

  const handleScheduleChange = () => {
    if (date && hour !== '') {
      const [year, month, day] = date.split('-');
      const scheduledDate = new Date(year, month - 1, day, parseInt(hour), 0, 0);
      onScheduledTimeChange(scheduledDate.toISOString());
    }
  };

  const today = new Date().toISOString().split('T')[0];

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
                  setDate(e.target.value);
                  setTimeout(handleScheduleChange, 100);
                }}
                className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
                min={today}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Hour:</label>
              <select
                value={hour}
                onChange={(e) => {
                  setHour(e.target.value);
                  setTimeout(handleScheduleChange, 100);
                }}
                className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-500"
              >
                <option value="">Select hour</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            ⏰ Emails are sent at the beginning of the hour (XX:00:00)
          </p>
        </div>
      )}

      {scheduledTime && !sendNow && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Scheduled for: <strong>{new Date(scheduledTime).toLocaleString()}</strong>
          </p>
        </div>
      )}
    </div>
  );
}