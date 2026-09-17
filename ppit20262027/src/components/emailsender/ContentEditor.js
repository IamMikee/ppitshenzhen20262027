'use client';

import { useState, useEffect } from 'react';

export default function ContentEditor({ content, onContentChange }) {
    const [attachments, setAttachments] = useState([]);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        // If parent has attachments data but local state doesn't match
        if (content.attachments && content.attachments.length > 0) {
            // Check if we need to sync (avoid unnecessary updates)
            const needsSync = content.attachments.some((parentAtt, index) => {
                const localAtt = attachments[index];
                return !localAtt ||
                    parentAtt.id !== localAtt.id ||
                    parentAtt.name !== localAtt.name;
            });

            if (needsSync && attachments.length === 0) {
                // Rebuild local attachments from parent data
                const syncedAttachments = content.attachments.map(a => ({
                    id: a.id || Date.now() + Math.random().toString(36).substr(2, 5),
                    file: a.file || null,
                    name: a.name,
                    size: a.size || 0,
                    type: a.type || 'application/octet-stream',
                    uploaded: a.uploaded || false,
                    url: a.url || null,
                }));
                setAttachments(syncedAttachments);
            }
        } else if (!content.attachments || content.attachments.length === 0) {
            // If parent has no attachments, clear local state
            if (attachments.length > 0) {
                setAttachments([]);
            }
        }
    }, [content.attachments]);

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        onContentChange({ ...content, [name]: value });
    };

    const handleFileAttach = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadError('');

        // Validate each file
        const validFiles = [];
        let errorMsg = '';

        for (const file of files) {
            // Max 5MB
            if (file.size > 5 * 1024 * 1024) {
                errorMsg = `"${file.name}" exceeds 5MB limit.`;
                break;
            }

            // Check for duplicates
            if (attachments.some(f => f.name === file.name && f.size === file.size)) {
                errorMsg = `"${file.name}" is already attached.`;
                break;
            }

            validFiles.push(file);
        }

        if (errorMsg) {
            setUploadError(errorMsg);
            e.target.value = '';
            return;
        }

        // Create attachment objects with the actual File objects
        const newAttachments = validFiles.map(file => ({
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            uploaded: false,
            url: null,
        }));

        const updatedAttachments = [...attachments, ...newAttachments];
        setAttachments(updatedAttachments);
        e.target.value = '';

        // Pass attachments to parent (including the File objects)
        const attachmentData = updatedAttachments.map(a => ({
            id: a.id,
            name: a.name,
            size: a.size,
            type: a.type,
            file: a.file,
            url: a.url || null,
            uploaded: a.uploaded,
        }));

        onContentChange({
            ...content,
            attachments: attachmentData,
            attachmentFiles: updatedAttachments.map(a => a.file),
        });
    };

    const removeAttachment = (id) => {
        const updatedAttachments = attachments.filter(a => a.id !== id);
        setAttachments(updatedAttachments);

        const attachmentData = updatedAttachments.map(a => ({
            id: a.id,
            name: a.name,
            size: a.size,
            type: a.type,
            file: a.file,
            url: a.url || null,
            uploaded: a.uploaded,
        }));

        onContentChange({
            ...content,
            attachments: attachmentData,
            attachmentFiles: updatedAttachments.map(a => a.file),
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType) => {
        if (fileType?.startsWith('image/')) return '🖼️';
        if (fileType?.startsWith('video/')) return '🎬';
        if (fileType?.startsWith('audio/')) return '🎵';
        if (fileType?.includes('pdf')) return '📄';
        if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
        if (fileType?.includes('excel') || fileType?.includes('sheet')) return '📊';
        if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return '📽️';
        if (fileType?.includes('zip') || fileType?.includes('rar') || fileType?.includes('archive')) return '📦';
        return '📎';
    };

    return (
        <div className="space-y-4">
            {/* Subject */}
            <input
                type="text"
                name="subject"
                value={content.subject || ""}
                onChange={handleTextChange}
                placeholder="Email Subject"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600 font-semibold"
            />

            {/* Main Content */}
            <textarea
                name="text"
                value={content.text || ''}
                onChange={handleTextChange}
                placeholder="Paste your email content here..."
                rows={6}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
            />

            {/* Attachment Section */}
            <div className="space-y-3">
                {/* Upload Button */}
                <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-sm text-gray-600 font-medium">Attach Files</span>
                            <span className="text-xs text-gray-400">(max 5MB each)</span>
                        </div>
                        <input
                            type="file"
                            multiple
                            onChange={handleFileAttach}
                            className="hidden"
                        />
                    </label>
                </div>

                {/* Upload Error */}
                {uploadError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                        {uploadError}
                    </div>
                )}

                {/* Attachment List */}
                {attachments.length > 0 && (
                    <div className="border rounded-md p-3 space-y-2 bg-gray-50">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attachments ({attachments.length})
                        </h4>
                        {attachments.map((attachment) => (
                            <div
                                key={attachment.id}
                                className="flex items-center justify-between bg-white rounded-md p-2 border border-gray-200"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-lg">{getFileIcon(attachment.type)}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-700 truncate max-w-[200px] sm:max-w-[300px]">
                                            {attachment.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {formatFileSize(attachment.size)}
                                            {attachment.uploaded && (
                                                <span className="ml-2 text-green-500">✓ Uploaded</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(attachment.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                    title="Remove attachment"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}