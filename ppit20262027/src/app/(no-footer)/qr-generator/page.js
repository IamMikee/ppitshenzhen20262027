"use client";

import QRCode from 'react-qr-code';
import { useRef, useState, useEffect } from 'react';

// Helper: truncate text to fit within a max character count
const truncateTitle = (title, maxLength = 80) => {
  if (!title) return '';
  return title.length > maxLength ? title.slice(0, maxLength - 1).trimEnd() + '…' : title;
};

// Helper: wrap text into lines that fit a given pixel width
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
};

export default function Page() {
  const [inputUrl, setInputUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [titleLoading, setTitleLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // State for the modal
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [fallbackDomain, setFallbackDomain] = useState('');

  // State for inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const editInputRef = useRef(null);

  const qrRef = useRef(null);

  // Focus the input when edit mode is activated
  useEffect(() => {
    if (isEditingTitle && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditingTitle]);

  const handleGenerateQR = async () => {
    if (!inputUrl.trim()) return;

    setQrUrl(inputUrl);
    setShowQR(true);
    setPageTitle('');
    setTitleLoading(true);

    // Fallback: Extract the domain name in case the title fails
    let domainName = inputUrl;
    try {
      domainName = new URL(inputUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      domainName = inputUrl;
    }

    try {
      const res = await fetch(`/api/fetch-link-title?url=${encodeURIComponent(inputUrl)}`);
      const data = await res.json();

      if (data.title) {
        setPageTitle(truncateTitle(data.title, 80));
      } else {
        // Title failed to fetch, trigger the modal
        setFallbackDomain(domainName);
        setCustomTitleInput('');
        setShowTitleModal(true);
      }
    } catch (err) {
      console.error('Title fetch failed:', err);
      // Fetch failed, trigger the modal
      setFallbackDomain(domainName);
      setCustomTitleInput('');
      setShowTitleModal(true);
    } finally {
      setTitleLoading(false);
    }
  };

  const handleModalConfirm = () => {
    const finalTitle = customTitleInput.trim() || fallbackDomain;
    setPageTitle(truncateTitle(finalTitle, 80));
    setShowTitleModal(false);
  };

  const handleReset = () => {
    setShowQR(false);
    setInputUrl('');
    setQrUrl('');
    setPageTitle('');
    setIsEditingTitle(false);
  };

  const handleEditTitleClick = () => {
    setEditTitleValue(pageTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const newTitle = editTitleValue.trim() || fallbackDomain;
    setPageTitle(truncateTitle(newTitle, 80));
    setIsEditingTitle(false);
  };

  const downloadQR = () => {
    setDownloadLoading(true);

    try {
      const svg = qrRef.current.querySelector('svg');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const qrSize = 400;
      const padding = 24;
      const titleFont = 'bold 20px sans-serif';
      const lineHeight = 26;
      const maxTextWidth = qrSize - padding * 2;

      // Measure title height first
      ctx.font = titleFont;
      const lines = pageTitle
        ? wrapText(ctx, pageTitle, maxTextWidth)
        : [];
      const titleHeight = lines.length * lineHeight;

      canvas.width = qrSize + padding * 2;
      canvas.height = padding + titleHeight + (titleHeight ? 12 : 0) + qrSize + padding;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw title (centered)
      if (lines.length) {
        ctx.fillStyle = '#111827';
        ctx.font = titleFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, padding + i * lineHeight);
        });
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = () => {
        const qrY = padding + titleHeight + (titleHeight ? 12 : 0);
        ctx.drawImage(img, padding, qrY, qrSize, qrSize);

        const link = document.createElement('a');
        link.download = 'qr-code.png';
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
    <>
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm w-full">
          {!showQR ? (
            <>
              <h1 className="text-xl font-semibold mb-2 text-gray-700">
                Generate QR Code
              </h1>
              <p className="text-sm text-gray-600 mb-4">
                Enter a URL to create a QR code
              </p>

              <div className="space-y-4">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerateQR();
                  }}
                />

                <button
                  onClick={handleGenerateQR}
                  disabled={!inputUrl.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generate QR Code
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-600">
                  Your QR Code
                </h1>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back
                </button>
              </div>

              {/* Page title above QR with inline editing */}
              <div className="mb-2 flex items-start justify-center gap-2 px-2 min-h-[2.5rem]">
                {titleLoading ? (
                  <span className="animate-spin h-4 w-4 mt-1 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                ) : isEditingTitle ? (
                  <div className="flex items-center w-full gap-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 text-center"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="Save"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : pageTitle ? (
                  <>
                    <p className="text-md font-semibold text-gray-800 line-clamp-2 max-w-[240px] leading-tight text-center break-words">
                      {pageTitle}
                    </p>
                    <button
                      onClick={handleEditTitleClick}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1 flex-shrink-0 mt-0.5"
                      title="Edit title"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </>
                ) : null}
              </div>

              <div ref={qrRef} className="bg-white p-4 rounded-xl inline-block">
                <QRCode
                  value={qrUrl}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>

              <p className="text-sm text-gray-600 mt-4 break-all">
                {qrUrl}
              </p>

              <button
                onClick={downloadQR}
                disabled={downloadLoading || titleLoading}
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
            </>
          )}
        </div>
      </div>

      {/* Modal for Custom Title Input */}
      {showTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Failed to fetch link title
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We couldn't extract the title from the provided URL. You can provide a custom title for your QR code below.
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-gray-700 flex justify-between">
                <span>Custom Title</span>
                <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={customTitleInput}
                onChange={(e) => setCustomTitleInput(e.target.value)}
                placeholder={fallbackDomain}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-black"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleModalConfirm();
                }}
              />
              <p className="text-xs text-gray-500">
                Leave blank and click OK to use the fallback domain: <span className="font-semibold text-gray-700">{fallbackDomain}</span>
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleModalConfirm}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}