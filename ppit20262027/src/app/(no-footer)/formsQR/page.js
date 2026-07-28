"use client";

import QRCode from 'react-qr-code';
import { useRef, useState } from 'react';

export default function Page() {
  const url = "https://www.ppitshenzhen.org/";
  const [downloadLoading, setDownloadLoading] = useState(false);
  const qrRef = useRef(null);

  const downloadQR = () => {
    setDownloadLoading(true);

    try {
      // Get the SVG element
      const svg = qrRef.current.querySelector('svg');

      // Create a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas size
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      // Create an image from the SVG
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = () => {
        // Draw white background (for transparency)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Draw the QR code
        ctx.drawImage(img, 0, 0, size, size);

        // Create download link
        const link = document.createElement('a');
        link.download = 'ppit-qr-code.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        setDownloadLoading(false);
      };

      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

    } catch (error) {
      console.error('Error downloading QR:', error);
      setDownloadLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm w-full">
        <h1 className="text-xl font-semibold mb-4">
          Scan to Open Form
        </h1>

        <div
          ref={qrRef}
          className="bg-white p-4 rounded-xl inline-block"
        >
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

        {/* Download Button */}
        <button
          onClick={downloadQR}
          disabled={downloadLoading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {downloadLoading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download QR Code
            </>
          )}
        </button>
      </div>
    </div>
  );
}