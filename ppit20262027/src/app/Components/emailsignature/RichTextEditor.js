'use client';

import { useState, useRef, useEffect } from 'react';
import { uploadFileToCloudinary } from '../../../services/cloudinary';

export default function RichTextEditor({ value, onChange, placeholder = 'Write your signature here...' }) {
    const editorRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize editor content
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    const handleImageUpload = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setIsLoading(true);
            try {
                const result = await uploadFileToCloudinary(file, 'email-signatures');
                const img = `<img src="${result.url}" alt="Signature image" style="max-width: 300px; height: auto; border-radius: 4px;" class="resizable-image" />`;
                document.execCommand('insertHTML', false, img);
                handleInput();
            } catch (error) {
                console.error('Failed to upload image:', error);
                alert('Failed to upload image. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        input.click();
    };

    const handleFontSize = (size) => {
        execCommand('fontSize', false, size);
        // Fix: fontSize uses 1-7, map to actual sizes
        const sizes = { 1: '10px', 2: '13px', 3: '16px', 4: '18px', 5: '24px', 6: '32px', 7: '48px' };
        if (sizes[size]) {
            document.execCommand('fontSize', false, size);
        }
    };

    return (
        <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
                {/* Text formatting */}
                <button
                    onClick={() => execCommand('bold')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Bold"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3h6.5a4.5 4.5 0 0 1 0 9H4V3zm0 9h7.5a4.5 4.5 0 0 1 0 9H4V12z"/></svg>
                </button>
                <button
                    onClick={() => execCommand('italic')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Italic"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3h4.5l-2.5 14H7.5L10 3z"/></svg>
                </button>
                <button
                    onClick={() => execCommand('underline')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Underline"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 17h14v2H3v-2zm2-14h2v10a3 3 0 0 0 6 0V3h2v10a5 5 0 0 1-10 0V3z"/></svg>
                </button>
                <button
                    onClick={() => execCommand('strikeThrough')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Strikethrough"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 10h14v2H3v-2zm12-6v4h-3V4h3zm-7 0v4H5V4h3z"/></svg>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* List */}
                <button
                    onClick={() => execCommand('insertUnorderedList')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Bullet list"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5-12h8v2H10V6zm0 7h8v2H10v-2zm0 7h8v2H10v-2z"/></svg>
                </button>
                <button
                    onClick={() => execCommand('insertOrderedList')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Numbered list"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h2v1H2V4zm0 5h2v1H2V9zm0 5h2v1H2v-1zm4-8h12v2H6V6zm0 5h12v2H6v-2zm0 5h12v2H6v-2z"/></svg>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Font size */}
                <select
                    onChange={(e) => handleFontSize(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
                >
                    <option value="3">Normal</option>
                    <option value="1">Small</option>
                    <option value="3">Normal</option>
                    <option value="5">Large</option>
                    <option value="7">Huge</option>
                </select>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Color picker */}
                <input
                    type="color"
                    onChange={(e) => execCommand('foreColor', e.target.value)}
                    className="w-6 h-6 p-0 border-0 cursor-pointer bg-transparent"
                    title="Text color"
                />
                <input
                    type="color"
                    onChange={(e) => execCommand('hiliteColor', e.target.value)}
                    className="w-6 h-6 p-0 border-0 cursor-pointer bg-transparent"
                    title="Highlight color"
                />

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Image */}
                <button
                    onClick={handleImageUpload}
                    disabled={isLoading}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50"
                    title="Insert image"
                >
                    {isLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4zm0 2h12v8l-3-3-2 2-3-3-4 4V5z"/></svg>
                    )}
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Link */}
                <button
                    onClick={() => {
                        const url = prompt('Enter URL:');
                        if (url) execCommand('createLink', url);
                    }}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Insert link"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4z"/><path d="M14 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4"/></svg>
                </button>

                {/* Remove link */}
                <button
                    onClick={() => execCommand('unlink')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Remove link"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm1-6a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Undo/Redo */}
                <button
                    onClick={() => execCommand('undo')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Undo"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4v2H4V4h3zm0 4H4V6h3v2zm0 4H4v-2h3v2zm0 4H4v-2h3v2zm12 0h-9v-2h9v2zm0-4h-9v-2h9v2zm0-4h-9V6h9v2zm0-4h-9V4h9v2z"/></svg>
                </button>
                <button
                    onClick={() => execCommand('redo')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Redo"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 4v2h3V4h-3zm0 4h3V6h-3v2zm0 4h3v-2h-3v2zm0 4h3v-2h-3v2zm-9 0h9v-2H4v2zm0-4h9v-2H4v2zm0-4h9V6H4v2zm0-4h9V4H4v2z"/></svg>
                </button>
            </div>

            {/* Editor body */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-4 min-h-[200px] focus:outline-none text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: value || '' }}
                placeholder={placeholder}
                style={{ fontFamily: 'Arial, sans-serif' }}
            />
            {!value && (
                <div className="absolute text-gray-400 text-sm pointer-events-none p-4" style={{ top: '2.5rem', left: 0 }}>
                    {placeholder}
                </div>
            )}
        </div>
    );
}