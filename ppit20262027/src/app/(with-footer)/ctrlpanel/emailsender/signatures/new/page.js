'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSignature } from '../../../../../../services/emailSignature';
import SignatureEditor from '../../../../../Components/emailsignature/SignatureEditor';

export default function NewSignaturePage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const getUserId = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('user-id') || 'unknown-user';
        }
        return 'unknown-user';
    };

    const handleSave = async (formData, userId) => {
        setSaving(true);
        try {
            await createSignature(formData, userId || getUserId());
            router.push('/ctrlpanel/emailsender/signatures');
        } catch (error) {
            alert('Failed to create signature: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        router.push('/ctrlpanel/emailsender/signatures');
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <SignatureEditor
                isNew={true}
                onSave={handleSave}
                onDiscard={handleDiscard}
                isLoading={saving}
            />
        </div>
    );
}