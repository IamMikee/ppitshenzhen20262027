'use client';

import { useState } from 'react';

export default function ContentEditor({ content, onContentChange }) {
  const [mode, setMode] = useState('text');

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    onContentChange({ ...content, [name]: value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      onContentChange({
        ...content,
        text: text,
        html: text,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Paste Text
        </button>
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'file'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upload File
        </button>
      </div>

      {mode === 'text' && (
        <div className="space-y-3">
          <input
            type="text"
            name="subject"
            value={content.subject || ''}
            onChange={handleTextChange}
            placeholder="Email Subject"
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <textarea
            name="text"
            value={content.text || ''}
            onChange={handleTextChange}
            placeholder="Paste your email content here..."
            rows={6}
            className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {mode === 'file' && (
        <div className="space-y-3">
          <input
            type="file"
            accept=".txt,.doc,.docx"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {content.text && (
            <div className="border rounded-md p-3 bg-gray-50">
              <p className="text-sm text-gray-500 mb-2">File preview:</p>
              <div className="max-h-40 overflow-y-auto text-sm whitespace-pre-wrap font-mono">
                {content.text.substring(0, 500)}
                {content.text.length > 500 && (
                  <span className="text-gray-400">... (truncated)</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}