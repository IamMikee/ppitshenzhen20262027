'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSignature } from '../../../../../../../services/emailSignature';
import SignatureEditor from '../../../../../../Components/emailsignature/SignatureEditor';

export default function NewSignaturePage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const handleSave = async (formData) => {
        setSaving(true);
        try {
            await createSignature(formData, 'user-id'); // Replace with actual user ID
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
                userId="user-id" // Replace with actual user ID
                isLoading={saving}
            />
        </div>
    );
}