'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';
import SignatureViewer from './SignatureViewer';

export default function SignatureEditor({
    initialData,
    isNew = false,
    onSave,
    onDiscard,
    userId,
    isLoading = false,
}) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        html: '',
        text: '',
        isActive: false,
    });
    const [showViewer, setShowViewer] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalData, setOriginalData] = useState(null);

    useEffect(() => {
        if (initialData) {
            const data = {
                name: initialData.name || '',
                html: initialData.html || '',
                text: initialData.text || '',
                isActive: initialData.isActive || false,
            };
            setFormData(data);
            setOriginalData(data);
        }
    }, [initialData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('Please enter a signature name.');
            return;
        }
        if (!formData.html.trim()) {
            alert('Please add content to your signature.');
            return;
        }
        await onSave(formData);
    };

    const handleDiscard = () => {
        if (hasChanges) {
            if (confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                onDiscard();
            }
        } else {
            onDiscard();
        }
    };

    const handleBack = () => {
        handleDiscard();
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                        title="Go back"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold text-gray-800">
                        {isNew ? 'Create New Signature' : `Edit: ${formData.name || 'Untitled'}`}
                    </h1>
                    {formData.isActive && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">
                            Active
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowViewer(true)}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                    👁️ View
                </button>
            </div>

            {/* Signature Name */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signature Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Default, Committee, Alumni, etc."
                    className="w-full border rounded-md px-3 py-2 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Rich Text Editor */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signature Content <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                    value={formData.html}
                    onChange={(html) => handleChange('html', html)}
                    placeholder="Write your signature here... Include your name, title, logo, links, etc."
                />
            </div>

            {/* Plain text version */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plain Text Version <span className="text-xs text-gray-400">(for text-only emails)</span>
                </label>
                <textarea
                    value={formData.text}
                    onChange={(e) => handleChange('text', e.target.value)}
                    rows={3}
                    className="w-full border rounded-md px-3 py-2 text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Plain text version of your signature... (will be used for emails without HTML)"
                />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 mb-6">
                <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">
                    Set as active (this signature will be used in all emails)
                </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                    onClick={handleDiscard}
                    className="px-6 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                    Discard Changes
                </button>
                <button
                    onClick={handleSave}
                    disabled={isLoading || !hasChanges}
                    className="px-6 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Saving...' : isNew ? 'Create Signature' : 'Save Changes'}
                </button>
            </div>

            {/* Viewer Overlay */}
            {showViewer && (
                <SignatureViewer
                    signature={formData}
                    onClose={() => setShowViewer(false)}
                />
            )}
        </div>
    );
}