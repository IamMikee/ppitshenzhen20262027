/* Square JPG thumbnail of a Cloudinary image (PDF and some email clients can't show WebP). */
export function coverThumbUrl(url, size = 240) {
  if (!url) return "";
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/f_jpg,q_auto,w_${size},h_${size},c_fill/`);
  }
  return url;
}
