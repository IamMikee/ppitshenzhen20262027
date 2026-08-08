'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getAllSignatures,
    deleteSignature,
    setActiveSignature
} from '../../../../../services/emailSignature';
import SignatureCard from '../../../../Components/emailsignature/SignatureCard';

export default function SignaturesPage() {
    const router = useRouter();
    const [signatures, setSignatures] = useState([]);
    const [loading, setLoading] = useState(true);

    const getUserId = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('user-id') || 'unknown-user';
        }
        return 'unknown-user';
    };

    useEffect(() => {
        fetchSignatures();
    }, []);

    const fetchSignatures = async () => {
        setLoading(true);
        try {
            const data = await getAllSignatures();
            setSignatures(data);
        } catch (error) {
            console.error('Error fetching signatures:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteSignature(id);
            await fetchSignatures();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleSetActive = async (id) => {
        try {
            const userId = getUserId();
            await setActiveSignature(id, userId);
            await fetchSignatures();
        } catch (error) {
            alert(error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-300">Loading signatures...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/ctrlpanel/emailsender"
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Back to Email Sender"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-200">📝 Email Signatures</h1>
                        <p className="text-sm text-gray-500">Create and manage email signatures for your broadcasts</p>
                    </div>
                </div>
                <Link
                    href="/ctrlpanel/emailsender/signatures/new"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Signature
                </Link>
            </div>

            {/* Signatures Grid */}
            {signatures.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-4xl mb-4">✉️</div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No signatures yet</h3>
                    <p className="text-sm text-gray-400 mb-4">Create your first email signature to get started.</p>
                    <Link
                        href="/ctrlpanel/emailsender/signatures/new"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                        Create Signature
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {signatures.map((sig) => (
                        <SignatureCard
                            key={sig.id}
                            signature={sig}
                            onDelete={handleDelete}
                            onSetActive={handleSetActive}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}