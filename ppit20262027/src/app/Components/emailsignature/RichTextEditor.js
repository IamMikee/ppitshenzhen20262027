'use client';

import { useState, useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onChange, placeholder = 'Write your signature here...', onImageInsert, pendingImages = [] }) {
    const editorRef = useRef(null);
    const popupRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageSize, setImageSize] = useState(100);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [showPopup, setShowPopup] = useState(false);
    const [fontSize, setFontSize] = useState('3');
    const isInternalUpdate = useRef(false);

    useEffect(() => {
        if (editorRef.current && !isInternalUpdate.current) {
            const currentContent = editorRef.current.innerHTML;
            const newContent = value || '';
            if (currentContent !== newContent) {
                editorRef.current.innerHTML = newContent;
                checkIsEmpty(newContent);
                setTimeout(applySizesFromAttributes, 100);
            }
        }
    }, [value]);

    const applySizesFromAttributes = () => {
        if (!editorRef.current) return;
        const images = editorRef.current.querySelectorAll('.signature-image');
        images.forEach((img) => {
            const size = img.dataset.size || '100';
            const sizeMultiplier = parseInt(size) / 100;
            const baseWidth = img.naturalWidth || 400;
            const newWidth = Math.round(baseWidth * sizeMultiplier);
            img.style.width = newWidth + 'px';
            img.style.height = 'auto';
        });
    };

    const checkIsEmpty = (content) => {
        if (!content || content === '<br>' || content === '<div><br></div>') {
            setIsEmpty(true);
            return;
        }
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const hasText = tempDiv.textContent?.trim().length > 0;
        const hasImages = tempDiv.querySelectorAll('img').length > 0;
        setIsEmpty(!hasText && !hasImages);
    };

    const handleInput = () => {
        if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            isInternalUpdate.current = true;
            onChange(content);
            checkIsEmpty(content);
            setTimeout(() => {
                isInternalUpdate.current = false;
            }, 0);
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
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const localUrl = URL.createObjectURL(file);

            // Insert image with local URL and a data attribute
            const img = `<img src="${localUrl}" alt="Signature image" data-size="100" data-local="true" style="max-width: 100%; height: auto; border-radius: 4px;" class="signature-image" />`;
            document.execCommand('insertHTML', false, img);

            if (onImageInsert) {
                onImageInsert(file, localUrl);
            }

            handleInput();
        };
        input.click();
    };

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleImageClick = (e) => {
            const img = e.target.closest('img');
            if (img && img.classList.contains('signature-image')) {
                e.preventDefault();
                e.stopPropagation();

                // Remove previous selection
                document.querySelectorAll('.signature-image.selected').forEach(el => {
                    el.classList.remove('selected');
                    el.style.outline = 'none';
                    el.style.boxShadow = 'none';
                });

                // Select this image
                img.classList.add('selected');
                img.style.outline = '3px solid #3b82f6';
                img.style.outlineOffset = '3px';
                img.style.boxShadow = '0 0 0 6px rgba(59, 130, 246, 0.2)';
                img.style.borderRadius = '6px';

                setSelectedImage(img);
                setImageSize(parseInt(img.dataset.size || '100'));

                // Position popup at cursor position
                setPopupPosition({
                    top: e.clientY - 40,
                    left: e.clientX + 15,
                });

                setShowPopup(true);
            }
        };

        const handleEditorClick = (e) => {
            if (!e.target.closest('img') && !e.target.closest('.image-popup')) {
                clearSelection();
            }
        };

        editor.addEventListener('click', handleImageClick);
        editor.addEventListener('click', handleEditorClick);

        return () => {
            editor.removeEventListener('click', handleImageClick);
            editor.removeEventListener('click', handleEditorClick);
        };
    }, []);

    const clearSelection = () => {
        document.querySelectorAll('.signature-image.selected').forEach(el => {
            el.classList.remove('selected');
            el.style.outline = 'none';
            el.style.boxShadow = 'none';
        });
        setSelectedImage(null);
        setShowPopup(false);
    };

    const handleSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setImageSize(newSize);

        if (!selectedImage) return;

        const sizeMultiplier = newSize / 100;
        const baseWidth = selectedImage.naturalWidth || parseInt(selectedImage.style.width) || 400;
        const newWidth = Math.round(baseWidth * sizeMultiplier);

        selectedImage.style.width = newWidth + 'px';
        selectedImage.style.height = 'auto';
        selectedImage.dataset.size = newSize;

        handleInput();
    };

    const handleFontSizeChange = (size) => {
        setFontSize(size);
        execCommand('fontSize', false, size);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) && !e.target.closest('.signature-image')) {
                clearSelection();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="border border-gray-300 rounded-md overflow-hidden bg-white relative">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
                <button
                    onClick={() => execCommand('bold')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Bold"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3h6.5a4.5 4.5 0 0 1 0 9H4V3zm0 9h7.5a4.5 4.5 0 0 1 0 9H4V12z" /></svg>
                </button>
                <button
                    onClick={() => execCommand('italic')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Italic"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3h4.5l-2.5 14H7.5L10 3z" /></svg>
                </button>
                <button
                    onClick={() => execCommand('underline')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Underline"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 17h14v2H3v-2zm2-14h2v10a3 3 0 0 0 6 0V3h2v10a5 5 0 0 1-10 0V3z" /></svg>
                </button>
                <button
                    onClick={() => execCommand('strikeThrough')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Strikethrough"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 10h14v2H3v-2zm12-6v4h-3V4h3zm-7 0v4H5V4h3z" /></svg>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <button
                    onClick={() => execCommand('insertUnorderedList')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Bullet list"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5-12h8v2H10V6zm0 7h8v2H10v-2zm0 7h8v2H10v-2z" /></svg>
                </button>
                <button
                    onClick={() => execCommand('insertOrderedList')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Numbered list"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h2v1H2V4zm0 5h2v1H2V9zm0 5h2v1H2v-1zm4-8h12v2H6V6zm0 5h12v2H6v-2zm0 5h12v2H6v-2z" /></svg>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <select
                    value={fontSize}
                    onChange={(e) => handleFontSizeChange(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
                >
                    <option value="1">Small</option>
                    <option value="3">Normal</option>
                    <option value="5">Large</option>
                    <option value="7">Huge</option>
                </select>

                <div className="w-px h-6 bg-gray-300 mx-1" />

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
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4zm0 2h12v8l-3-3-2 2-3-3-4 4V5z" /></svg>
                    )}
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <button
                    onClick={() => {
                        const url = prompt('Enter URL:');
                        if (url) execCommand('createLink', url);
                    }}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Insert link"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4z" /><path d="M14 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4" /></svg>
                </button>
                <button
                    onClick={() => execCommand('unlink')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Remove link"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm1-6a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" /></svg>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <button
                    onClick={() => execCommand('undo')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Undo"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4v2H4V4h3zm0 4H4V6h3v2zm0 4H4v-2h3v2zm0 4H4v-2h3v2zm12 0h-9v-2h9v2zm0-4h-9v-2h9v2zm0-4h-9V6h9v2zm0-4h-9V4h9v2z" /></svg>
                </button>
                <button
                    onClick={() => execCommand('redo')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Redo"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 4v2h3V4h-3zm0 4h3V6h-3v2zm0 4h3v-2h-3v2zm0 4h3v-2h-3v2zm-9 0h9v-2H4v2zm0-4h9v-2H4v2zm0-4h9V6H4v2zm0-4h9V4H4v2z" /></svg>
                </button>
            </div>

            {/* Editor body */}
            <div className="relative">
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    className="p-4 min-h-[200px] focus:outline-none text-gray-700 prose prose-sm max-w-none"
                />
                {isEmpty && (
                    <div className="absolute top-4 left-4 text-gray-400 text-sm pointer-events-none select-none">
                        {placeholder}
                    </div>
                )}
            </div>

            {/* Image Resize Popup */}
            {showPopup && selectedImage && (
                <div
                    ref={popupRef}
                    className="fixed z-[9999] hover:bg-white bg-white/70 rounded-xl shadow-2xl border border-gray-300/50 p-4 min-w-[190px] image-popup transition-all duration-200"
                    style={{
                        top: popupPosition.top + 'px',
                        left: popupPosition.left + 'px',
                        position: 'fixed',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header with faded text */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500/70">Image Size</span>
                        <span className="text-sm font-bold text-blue-600/80">{imageSize}%</span>
                    </div>

                    {/* Slider - slightly transparent track */}
                    <input
                        type="range"
                        min="10"
                        max="150"
                        value={imageSize}
                        onChange={handleSizeChange}
                        className="w-full h-2 bg-gray-300/60 rounded-full appearance-none cursor-pointer accent-blue-600/80"
                    />

                    {/* Labels with faded text */}
                    <div className="flex justify-between text-[10px] text-gray-400/70 mt-1">
                        <span>10%</span>
                        <span>100%</span>
                        <span>150%</span>
                    </div>

                    {/* Close button with faded text */}
                    <button
                        onClick={clearSelection}
                        className="mt-2.5 w-full text-xs text-gray-500/60 hover:text-gray-700 hover:bg-gray-100/80 py-1 rounded transition-colors"
                    >
                        Close ✕
                    </button>
                </div>
            )}
        </div>
    );
}