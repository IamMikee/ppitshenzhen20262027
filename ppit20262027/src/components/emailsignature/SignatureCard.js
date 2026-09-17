'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SignatureCard({ signature, onDelete, onSetActive }) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        await onDelete(signature.id);
        setShowDeleteConfirm(false);
    };

    return (
        <div className={`bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow ${signature.isActive ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">
                        {signature.name || 'Untitled Signature'}
                    </h3>
                    {signature.isActive && (
                        <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1">
                            Active
                        </span>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                        Updated: {formatDate(signature.updatedAt)}
                    </p>
                </div>
            </div>

            {/* Preview */}
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-3 max-h-12 overflow-hidden relative">
                <div dangerouslySetInnerHTML={{ __html: signature.html || 'No content' }} />
                {signature.html && signature.html.length > 100 && (
                    <div className="absolute bottom-0 right-0 bg-gradient-to-l from-gray-50 to-transparent w-8 h-full" />
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Link
                    href={`/ctrlpanel/emailsender/signatures/${signature.id}/view`}
                    className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                    View
                </Link>
                <Link
                    href={`/ctrlpanel/emailsender/signatures/${signature.id}/edit`}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                    Edit
                </Link>
                {!signature.isActive && (
                    <button
                        onClick={() => onSetActive(signature.id)}
                        className="px-3 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    >
                        Set Active
                    </button>
                )}
                {!signature.isActive && (
                    <button
                        onClick={handleDelete}
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    >
                        Delete
                    </button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Delete Signature?</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete "{signature.name}"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}