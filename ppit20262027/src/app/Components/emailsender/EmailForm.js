'use client';

import { useState, useEffect } from 'react';
import RecipientSelector from './RecipientSelector';
import ContentEditor from './ContentEditor';
import SchedulePicker from './SchedulePicker';
import BirthdayTemplateManager from './BirthdayTemplateManager';

export default function EmailForm({ onSuccess }) {
  const [emailType, setEmailType] = useState('broadcast'); // 'broadcast' or 'birthday'
  const [recipients, setRecipients] = useState([]);
  const [content, setContent] = useState({ text: '', html: '', subject: '' });
  const [scheduledTime, setScheduledTime] = useState(null);
  const [sendNow, setSendNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate
      if (recipients.length === 0) {
        throw new Error('Please select at least one recipient');
      }

      if (!content.text && !content.html) {
        throw new Error('Please provide email content');
      }

      if (!sendNow && !scheduledTime) {
        throw new Error('Please select a send time or send now');
      }

      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          content,
          scheduledTime: sendNow ? null : scheduledTime,
          sendNow,
          type: emailType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      // Reset form
      setRecipients([]);
      setContent({ text: '', html: '', subject: '' });
      setScheduledTime(null);
      setSendNow(false);
      
      if (onSuccess) onSuccess();
      
      setSuccess(data.message || 'Email processed successfully');
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Compose Email
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEmailType('broadcast')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              emailType === 'broadcast'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Broadcast
          </button>
          <button
            type="button"
            onClick={() => setEmailType('birthday')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              emailType === 'birthday'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎂 Birthday
          </button>
        </div>
      </div>

      {emailType === 'birthday' && (
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
          <p className="text-sm text-purple-700 flex items-center gap-2">
            <span className="text-lg">🎉</span>
            Birthday emails are sent automatically on each person's birthday.
            Configure the template below.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-md flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Send To <span className="text-red-500">*</span>
        </label>
        <RecipientSelector 
          selectedRecipients={recipients}
          onRecipientsChange={setRecipients}
          type={emailType}
        />
        {recipients.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium">{recipients.length}</span> recipient(s) selected
          </p>
        )}
      </div>

      {emailType === 'birthday' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Birthday Template
          </label>
          <BirthdayTemplateManager />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Content <span className="text-red-500">*</span>
        </label>
        <ContentEditor 
          content={content}
          onContentChange={setContent}
          isBirthday={emailType === 'birthday'}
        />
        {emailType === 'birthday' && (
          <p className="mt-2 text-xs text-gray-500">
            💡 Use {'{name}'} as a placeholder for the recipient's name
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Send Schedule <span className="text-red-500">*</span>
        </label>
        <SchedulePicker 
          sendNow={sendNow}
          onSendNowChange={setSendNow}
          scheduledTime={scheduledTime}
          onScheduledTimeChange={setScheduledTime}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full text-white py-2.5 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 ${
          emailType === 'birthday' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          sendNow ? 'Send Now' : 'Schedule Send'
        )}
      </button>
    </form>
  );
}