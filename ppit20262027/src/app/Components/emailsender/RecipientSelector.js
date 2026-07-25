'use client';

import { useState, useEffect } from 'react';

export default function RecipientSelector({ selectedRecipients, onRecipientsChange, type = 'broadcast' }) {
  const [mode, setMode] = useState('individual');
  const [individualInput, setIndividualInput] = useState('');
  const [databaseRecipients, setDatabaseRecipients] = useState([]);
  const [selectedDbRecipients, setSelectedDbRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (mode === 'database') {
      fetchDatabaseRecipients();
    }
  }, [mode, type]);

  const fetchDatabaseRecipients = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'birthday' 
        ? '/api/emails?type=birthday-recipients'
        : '/api/emails?type=recipients';
      const response = await fetch(endpoint);
      const data = await response.json();
      setDatabaseRecipients(data.recipients || []);
      
      // Pre-select any that are already in selectedRecipients
      const preSelected = data.recipients
        ?.filter(r => selectedRecipients.includes(r.email))
        .map(r => r.email) || [];
      setSelectedDbRecipients(preSelected);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component (same as before)

  // Add birthday indicator in the list
  const filteredDbRecipients = databaseRecipients.filter(r =>
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* ... mode buttons ... */}

      {mode === 'database' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search recipients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-500 py-4">Loading recipients...</div>
            ) : filteredDbRecipients.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                {searchTerm ? 'No matching recipients found' : 'No recipients found in database'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDbRecipients.map((recipient) => (
                  <label key={recipient.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDbRecipients.includes(recipient.email)}
                      onChange={() => toggleDatabaseRecipient(recipient.email)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {recipient.name && <span className="font-medium">{recipient.name}</span>}
                      <span className={recipient.name ? 'text-gray-500' : ''}>
                        {recipient.name ? ` (${recipient.email})` : recipient.email}
                      </span>
                      {type === 'birthday' && recipient.birthday && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          🎂 {new Date(recipient.birthday).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ... rest of the component ... */}
    </div>
  );
}