"use client";

import { useEffect, useRef, useState } from "react";
import { CldImage } from "next-cloudinary";

function MasonryImage({ src }) {
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current?.querySelector("img");
    if (!img) return;

    function updateSpan() {
      const rowHeight = 8;
      const rowGap = 16;

      const height = img.getBoundingClientRect().height;
      const span = Math.ceil((height + rowGap) / (rowHeight + rowGap));

      ref.current.style.gridRowEnd = `span ${span}`;
    }

    if (img.complete) {
      updateSpan();
    } else {
      img.addEventListener("load", updateSpan);
      return () => img.removeEventListener("load", updateSpan);
    }
  }, [src]);

  return (
    <div ref={ref}>
      <CldImage
        src={src}
        width={600}
        height={800}
        alt="Event photo"
        className="rounded-xl w-full h-auto"
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
      />
    </div>
  );
}


export default function EventsGallery({ folder }) {
  const [images, setImages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  const loaderRef = useRef(null);

  async function loadMore() {
    if (loading) return;

    setLoading(true);

    const res = await fetch(
      `/api/load-images?folder=${folder}&cursor=${cursor || ""}`
    );

    const data = await res.json();

    setImages((prev) => [...prev, ...data.images]);

    setCursor(data.nextCursor);
    setLoading(false);
  }

  useEffect(() => {
    async function resetAndLoad() {
      setLoading(true);
      setImages([]);
      setCursor(null);

      const res = await fetch(`/api/load-images?folder=${folder}`);
      const data = await res.json();

      setImages(data.images);
      setCursor(data.nextCursor);
      setLoading(false);
    }

    resetAndLoad();
  }, [folder]);


  // Infinite scroll
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor && !loading) {
          loadMore();
        }
      },
      {
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [cursor, loading]);

  return (
    <>
      <div
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 px-6 auto-rows-[8px]"
      >
        {images.map((img) => (
          <MasonryImage key={img} src={img} />
        ))}

      </div>

      {cursor && (
        <div ref={loaderRef} className="h-16 text-center text-gray-400">
          {loading && "Loading more photos…"}
        </div>
      )}
    </>
  );
}
