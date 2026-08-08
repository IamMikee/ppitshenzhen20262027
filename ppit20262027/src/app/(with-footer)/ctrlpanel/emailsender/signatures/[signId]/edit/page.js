'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSignatureById, updateSignature } from '../../../../../../../services/emailSignature';
import SignatureEditor from '../../../../../../Components/emailsignature/SignatureEditor';

export default function EditSignaturePage() {
    const params = useParams();
    const router = useRouter();
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const getUserId = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('user-id') || 'unknown-user';
        }
        return 'unknown-user';
    };

    useEffect(() => {
        const fetchSignature = async () => {
            try {
                const data = await getSignatureById(params.signId);
                if (data) {
                    setSignature(data);
                } else {
                    router.push('/ctrlpanel/emailsender/signatures');
                }
            } catch (error) {
                console.error('Error fetching signature:', error);
                router.push('/ctrlpanel/emailsender/signatures');
            } finally {
                setLoading(false);
            }
        };
        fetchSignature();
    }, [params.signId, router]);

    const handleSave = async (formData, userId) => {
        setSaving(true);
        try {
            await updateSignature(params.signId, formData, userId || getUserId());
            router.push('/ctrlpanel/emailsender/signatures');
        } catch (error) {
            alert('Failed to save signature: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        router.push('/ctrlpanel/emailsender/signatures');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!signature) return null;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <SignatureEditor
                initialData={signature}
                isNew={false}
                onSave={handleSave}
                onDiscard={handleDiscard}
                isLoading={saving}
            />
        </div>
    );
}