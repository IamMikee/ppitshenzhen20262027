export async function uploadFileToCloudinary(file, folder = 'email-attachments') {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_EMAIL);
        formData.append('folder', folder);
        
        // Generate unique public ID
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        const timestamp = Date.now();
        formData.append('public_id', `${timestamp}_${fileName}`);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return {
            url: data.secure_url,
            publicId: data.public_id,
            format: data.format,
            bytes: data.bytes,
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}