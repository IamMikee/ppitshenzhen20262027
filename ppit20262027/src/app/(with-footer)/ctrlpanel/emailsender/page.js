'use client';

import { useState, useEffect } from 'react';
import EmailForm from '../../../Components/emailsender/EmailForm';
import EmailList from '../../../Components/emailsender/EmailList';

export default function EmailSenderPage() {
  const [emails, setEmails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/emails');
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-300">Email Broadcast</h1>
        <p className="text-gray-400 mt-2">Send emails to participants and committee members</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EmailForm onSuccess={fetchEmails} />
        </div>
        <div className="lg:col-span-1">
          <EmailList emails={emails} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}