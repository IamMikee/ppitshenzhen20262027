'use client';

import { useState } from 'react';

export default function EmailList({ emails, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return '✅';
      case 'failed': return '❌';
      case 'scheduled': return '📅';
      case 'sending': return '⏳';
      default: return '⏳';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      let date;
      if (timestamp.seconds !== undefined && typeof timestamp.seconds === 'number') {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      }
      else if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      else if (typeof timestamp === 'number') {
        date = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
      }
      else {
        console.warn('Unknown timestamp type:', timestamp);
        return 'N/A';
      }

      if (isNaN(date.getTime())) return 'N/A';

      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Broadcasts</h3>
        <div className="text-center text-gray-500 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          Loading broadcasts...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
        <span>Recent Broadcasts</span>
        <span className="text-sm font-normal text-gray-500">{emails.length} total</span>
      </h3>

      {emails.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="font-medium">No broadcasts yet</p>
          <p className="text-sm mt-1">Create your first broadcast using the form</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {emails.map((email) => (
            <div
              key={email.id}
              className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate text-gray-600">
                      {email.content?.subject || 'No Subject'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(email.status)}`}>
                      {getStatusIcon(email.status)} {email.status || 'pending'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>👥 {email.recipients?.length || 0} recipients</span>
                    {email.scheduledTime && (
                      <span>📅 {formatDate(email.scheduledTime)}</span>
                    )}
                    {email.sentAt && (
                      <span>✅ {formatDate(email.sentAt)}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatDate(email.createdAt)}
                </div>
              </div>

              {expandedId === email.id && (
                <div className="mt-3 pt-3 border-t text-sm space-y-2">
                  <div>
                    <strong className="text-gray-700">Recipients:</strong>
                    <div className="max-h-24 overflow-y-auto text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded break-all">
                      {email.recipients?.join(', ')}
                    </div>
                  </div>
                  <div>
                    <strong className="text-gray-700">Content Preview:</strong>
                    <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {email.content?.text?.substring(0, 300)}
                      {email.content?.text?.length > 300 && (
                        <span className="text-gray-400">... (truncated)</span>
                      )}
                    </div>
                  </div>
                  {email.error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      ❌ Error: {email.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}