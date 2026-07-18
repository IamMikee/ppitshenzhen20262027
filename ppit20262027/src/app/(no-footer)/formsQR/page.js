"use client";

import QRCode from 'react-qr-code';

export default function Page() {
  const url = "https://www.ppitshenzhen.org/form";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm w-full">
        <h1 className="text-xl font-semibold mb-4">
          Scan to Open Form
        </h1>

        <div className="bg-white p-4 rounded-xl inline-block">
          <QRCode
            value={url}
            size={200}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>

        <p className="text-sm text-gray-600 mt-4 break-all">
          {url}
        </p>
      </div>
    </div>
  );
}

