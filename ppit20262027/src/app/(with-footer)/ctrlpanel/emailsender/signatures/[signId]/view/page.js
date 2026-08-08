'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSignatureById } from '../../../../../../../services/emailSignature';
import SignatureViewer from '../../../../../../Components/emailsignature/SignatureViewer';

export default function ViewSignaturePage() {
    const params = useParams();
    const router = useRouter();
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(true);

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

    const handleClose = () => {
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

    return <SignatureViewer signature={signature} onClose={handleClose} />;
}