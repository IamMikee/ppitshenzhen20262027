'use client';

import { useState } from 'react';
import RecipientSelector from './RecipientSelector';
import ContentEditor from './ContentEditor';
import SchedulePicker from './SchedulePicker';
import { uploadFileToCloudinary } from '../../../services/cloudinary';
import { getActiveSignature } from '../../../services/emailSignature';

export default function EmailForm({ onSuccess }) {
    const [recipients, setRecipients] = useState([]);
    const [content, setContent] = useState({ text: '', html: '', subject: '' });
    const [scheduledTime, setScheduledTime] = useState(null);
    const [sendNow, setSendNow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [sendIndividually, setSendIndividually] = useState(false);

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

            if (!content.text) {
                throw new Error('Please provide email content');
            }

            if (!sendNow && !scheduledTime) {
                throw new Error('Please select a send time or send now');
            }

            // Upload attachments to Cloudinary
            let uploadedAttachments = [];
            const attachmentFiles = content.attachmentFiles || [];

            if (attachmentFiles.length > 0) {
                for (const file of attachmentFiles) {
                    try {
                        const result = await uploadFileToCloudinary(file, 'email-attachments');
                        uploadedAttachments.push({
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            cloudinaryUrl: result.url,
                            publicId: result.publicId,
                        });
                    } catch (error) {
                        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                    }
                }
            }

            // Prepare email content with attachment metadata
            const emailContent = {
                subject: content.subject,
                text: content.text,
                html: content.text.replace(/\n/g, '<br>'),
                attachments: uploadedAttachments, // Cloudinary URLs stored in Firestore
            };

            //Attach signature (only if HTML is active)
            const activeSignature = await getActiveSignature();

            if (activeSignature) {
                const isHTML = /<[a-z][\s\S]*>/i.test(content.text);
                const htmlContent = isHTML ? content.text : content.text.replace(/\n/g, '<br>');

                emailContent.text = content.text + (isHTML ? activeSignature.html : activeSignature.text);
                emailContent.html = htmlContent + activeSignature.html;
            }

            // Send the email
            const response = await fetch('/api/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipients,
                    content: emailContent,
                    scheduledTime: sendNow ? null : scheduledTime,
                    sendNow,
                    sendIndividually,
                    attachmentFiles: uploadedAttachments.map(a => ({
                        name: a.name,
                        cloudinaryUrl: a.cloudinaryUrl,
                        type: a.type,
                    })),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send email');
            }

            // Reset form
            setRecipients([]);
            setContent({
                text: '',
                subject: '',
                attachments: [],
                attachmentFiles: []
            });
            setScheduledTime(null);
            setSendNow(false);
            setSendIndividually(false);

            if (onSuccess) onSuccess();

            setSuccess(data.message || 'Email processed successfully');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Toggle Component
    const ToggleSwitch = ({ label, checked, onChange, description }) => (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {description && (
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                )}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Compose Email
            </h2>

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

            {/* Recipients */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send To <span className="text-red-500">*</span>
                </label>
                <RecipientSelector
                    selectedRecipients={recipients}
                    onRecipientsChange={setRecipients}
                />
                {recipients.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">{recipients.length}</span> recipient(s) selected
                    </p>
                )}
            </div>

            {/* TOGGLES SECTION */}
            <div className="space-y-3 bg-gray-50/50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Email Options</h3>

                {/* Send Individually Toggle */}
                <ToggleSwitch
                    label="Send Individually"
                    description="Each recipient gets their own email (personalized sending)"
                    checked={sendIndividually}
                    onChange={setSendIndividually}
                />
            </div>

            {/* Content */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Content <span className="text-red-500">*</span>
                </label>
                <ContentEditor
                    content={content}
                    onContentChange={setContent}
                />
                {sendIndividually && (
                    <p className="mt-1 text-xs text-green-600">
                        👤 Send Individually enabled: Each recipient will receive a separate personalized email.
                    </p>
                )}
            </div>

            {/* Schedule */}
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

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
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