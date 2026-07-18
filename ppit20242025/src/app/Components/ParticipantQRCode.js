'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

export default function ParticipantQRCode({ participantId }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    // Set the URL only on the client side
    setUrl(`${window.location.origin}/participant/${participantId}`);
  }, [participantId]);

  if (!url) {
    return null; // Don't render anything until we have the URL
  }

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
      <div className="p-2 bg-white">
        <QRCode
          value={url}
          size={200}
          level="H"
          className="mb-4"
        />
      </div>
      <p className="text-sm text-gray-600 text-center">
        Scan this code to view participant details
      </p>
    </div>
  );
} 