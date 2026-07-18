"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function EventTabs({ slug, events }) {
  const pathname = usePathname();
  const containerRef = useRef(null);

  // 🔹 Restore scroll position on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("event-tabs-scroll");
    if (containerRef.current && savedScroll) {
      containerRef.current.scrollLeft = Number(savedScroll);
    }
  }, []);

  // 🔹 Save scroll position before navigating
  const handleClick = () => {
    if (containerRef.current) {
      sessionStorage.setItem(
        "event-tabs-scroll",
        containerRef.current.scrollLeft
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex gap-4 px-6 mb-10 overflow-x-auto scrollbar-hide"
    >
      {events.map((event) => {
        const active = pathname.endsWith(event.slug);

        return (
          <Link
            key={event.slug}
            href={`/events/${slug}/${event.slug}`}
            onClick={handleClick}
            className={`px-5 py-2 rounded-full whitespace-nowrap transition font-montserrat font-semibold ${
              active
                ? "bg-gray-200 text-black"
                : "bg-red-500 text-white hover:bg-gray-200 hover:text-black"
            }`}
          >
            {event.title}
          </Link>
        );
      })}
    </div>
  );
}
