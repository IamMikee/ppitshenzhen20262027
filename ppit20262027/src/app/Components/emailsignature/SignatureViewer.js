'use client';

import { useEffect, useState } from 'react';

export default function SignatureViewer({ signature, onClose }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    if (!signature) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-200"
            onClick={handleClose}
            style={{ opacity: isVisible ? 1 : 0 }}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
                style={{ transform: isVisible ? 'scale(1)' : 'scale(0.95)', transition: 'transform 200ms' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{signature.name}</h3>
                        <p className="text-xs text-gray-400">
                            {signature.isActive && <span className="text-blue-600 font-medium mr-2">● Active</span>}
                            Last updated: {signature.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Email Preview */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Email Header */}
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-600">Subject: <span className="font-normal text-gray-500">Example Email</span></p>
                        <p className="text-sm font-medium text-gray-600">Body:</p>
                    </div>

                    {/* Email Body */}
                    <div className="p-4 min-h-[100px] bg-white">
                        <div className="text-sm text-gray-700">
                            <p>Hi there,</p>
                            <p className="mt-2">This is what your email will look like with this signature attached.</p>
                            <div className="mt-4" dangerouslySetInnerHTML={{ __html: signature.html }} />
                        </div>
                    </div>
                </div>

                {/* Close button */}
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}