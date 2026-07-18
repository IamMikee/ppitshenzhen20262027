"use client";
import { useState, useEffect } from "react";

export default function LoadingScreen({ logoSrc, text, onFinish }) {
  const [animateSplit, setAnimateSplit] = useState(false);
  const [animateText, setAnimateText] = useState(false);

  useEffect(() => {
    // Slide in text after 0.5s
    const textTimer = setTimeout(() => setAnimateText(true), 500);

    // Split background after 2s
    const splitTimer = setTimeout(() => {
      setAnimateSplit(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 700); // remove overlay after split
    }, 2000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(splitTimer);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 overflow-hidden pointer-events-none">
      {/* Top and bottom split panels */}
      <div
        className={`absolute top-0 left-0 w-full h-1/2 bg-[#8C0000] transition-transform duration-700 ease-in-out ${
          animateSplit ? "-translate-y-full" : "translate-y-0"
        }`}
      />
      <div
        className={`absolute bottom-0 left-0 w-full h-1/2 bg-[#8C0000] transition-transform duration-700 ease-in-out ${
          animateSplit ? "translate-y-full" : "translate-y-0"
        }`}
      />

      {/* Logo */}
      <img
        src={logoSrc}
        alt="Logo"
        className={`w-32 h-32 object-contain z-30 transition-opacity duration-700 ease-out ${
          animateSplit ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Text sliding behind fixed | */}
      <div className="mt-4 relative z-30 flex items-center h-[32px] w-[300px]">
        {/* Fixed vertical line */}
        <div className={`absolute left-6 h-full w-[2px] bg-white z-40 transition-opacity duration-700 ease-out ${
          animateSplit ? "opacity-0" : "opacity-100"
        }`} />

        {/* Wrapper to hide text before it reaches the line */}
        <div className="absolute left-6 h-full overflow-hidden z-30 w-[calc(100%-1rem)]">
          <div
            className={`h-full text-[26px] text-white font-cinzel font-bold transition-transform duration-700 ease-out ${
              animateText
                ? animateSplit
                  ? "translate-x-[150%] opacity-0" // slides out and fades
                  : "translate-x-4 opacity-100" // slides in from left
                : "-translate-x-full opacity-0" // start completely hidden
            }`}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
