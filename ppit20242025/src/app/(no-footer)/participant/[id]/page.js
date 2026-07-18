"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";


import bg_mobile from "../../../../../public/Nusantara/bg_mobile.webp";
import bg_pc from "../../../../../public/Nusantara/bg_pc.webp";
import topImage1 from "../../../../../public/Nusantara/topImage1.webp";
import topImage2 from "../../../../../public/Nusantara/topImage2.webp";

import base_envelope from "../../../../../public/Nusantara/base_envelope.webp";
import back_envelope from "../../../../../public/Nusantara/back_envelope.webp";
import front_envelope from "../../../../../public/Nusantara/front_envelope.webp";
import shadow_envelope from "../../../../../public/Nusantara/shadow_envelope.webp";

import poster1 from "../../../../../public/Nusantara/poster1.webp";
import poster2 from "../../../../../public/Nusantara/poster2.webp";

export default function ParticipantPage() {
  const { id: participantId } = useParams();

  const [step, setStep] = useState("closed"); // closed → opened → lowered → poster
  const [posterPage, setPosterPage] = useState(0); // 0 = first page, 1 = second page

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!participantId) return;

    fetch(`${process.env.NEXT_PUBLIC_SCRIPT_URL}?id=${participantId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(setData)
      .catch(setError);
  }, [participantId]);

  console.log("Fetched data:", data);


  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-black text-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-bold mb-4 text-red-500">Error</h2>
          <p className="text-red-400">
            Failed to load participant data.
          </p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  /* ---------------- SHARED TRANSFORMS ---------------- */
  const moveDown = step === "lowered";
  const moveBottom = step === "poster";

  const envelopeTransform = `
    translateX(-50%)
    ${moveDown ? "translateY(80px)" : ""}
    ${moveBottom ? "translateY(420px) rotate(-11.89deg)" : ""}
  `;

  const baseEnvelopeTransform = `
    translateX(-50%)
    ${moveDown ? "translateY(80px)" : ""}
    ${moveBottom ? "translateX(45px) translateY(415px) rotate(-11.89deg)" : ""}
  `;

  const shadowEnvelopeTransform = `
    translateX(-50%)
    ${moveDown ? "translateY(80px)" : ""}
    ${moveBottom ? "translateX(50px) translateY(415px) rotate(-11.89deg)" : ""}
  `;

  /* ---------------- HANDLERS ---------------- */
  const handleGlobalClick = () => {
    if (step === "closed") setStep("opened");
    else if (step === "opened") setStep("lowered");
    else if (step === "lowered") {
      setPosterPage(0); // first page
      setStep("poster");
    }
  };

  const handlePosterClick = (e) => {
    if (step === "lowered") {
      setPosterPage(0); // first page
      setStep("poster");
    }
    e.stopPropagation();
    if (step === "poster") setPosterPage((prev) => (prev === 0 ? 1 : 0));
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex items-center justify-center"
      onClick={handleGlobalClick} // global click anywhere
    >

      {/* Background */}
      <Image
        src={bg_mobile}
        alt="bg"
        fill
        className="block lg:hidden object-cover -z-10"
        priority
        style={{ maxWidth: "none" }}
      />
      <Image
        src={bg_pc}
        alt="bg"
        fill
        className="hidden lg:block object-cover -z-10"
        priority
        style={{ maxWidth: "none" }}
      />

      {/* Decorations */}
      <Image src={topImage1} alt="" className="absolute top-10 left-6 z-30 w-[112px] lg:w-[176px]" style={{ maxWidth: "none" }} />
      <Image src={topImage2} alt="" className="absolute top-10 right-6 z-30 w-[92px] lg:w-[141px]" style={{ maxWidth: "none" }} />

      {/* Shadow */}
      <div
        className="absolute left-1/2 top-[300px] h-lg:top-[510px] transition-all duration-700 ease-in-out"
        style={{ transform: shadowEnvelopeTransform, zIndex: 5 }}
      >
        <Image src={shadow_envelope} alt="" width={399} style={{ maxWidth: "none" }} />
      </div>

      {/* Poster */}
      <div
        className="absolute left-1/2 top-[270px] h-md:top-[480px] h-lg:top-[480px] cursor-pointer transition-all duration-700 ease-in-out"
        style={{
          transform: `
            translateX(-50%)
            ${step === "poster" ? "scale(1) translateY(-30%)" : ""}
          `,
          zIndex: step === "poster" ? 30 : 15, // increase z-index when big
        }}
        onClick={handlePosterClick}
      >
        {step === "poster" ? (
          <>
            {posterPage === 0 ? (
              <div className="relative">
              {/* First Page */}
               <Image
                src={poster1}
                alt=""
                className={`
                  w-[362.9px]
                  h-md:w-[450px]
                  h-lg:w-[550px]
                  rotate-0
                  drop-shadow-[10px_10px_3px_rgba(0,0,0,0.6)]
                  transition-all duration-700 ease-in-out
                  ${posterPage === 0 ? "opacity-100" : "opacity-0"}
                `}
                style={{ maxWidth: "none" }}
              />

              {/* Participant name */}
              <div
                className="
                  absolute
                  top-[113px]
                  left-[118px]

                  w-[207px]
                  h-[25px]

                  h-lg:top-[165px]
                  h-lg:left-[178px]
                  h-lg:w-[300px]
                  h-lg:h-[40px]

                  font-cinzel-decorative
                  bg-gradient-to-r from-[#ae8625] via-[#f7ef8a] to-[#ae8625]
                  bg-clip-text
                  text-transparent
                  text-lg
                  h-lg:text-3xl
                  text-center
                  overflow-hidden
                  whitespace-nowrap
                "
              >
                {data.name}
              </div>
            </div>
            ) : (
              // Second page
              <>
                <Image
                src={poster2}
                alt=""
                className={`
                  w-[362.9px]
                  h-md:w-[450px]
                  h-lg:w-[550px]
                  drop-shadow-[10px_10px_3px_rgba(0,0,0,0.6)]
                  transition-all duration-700 ease-in-out
                  ${posterPage === 1 ? "opacity-100" : "opacity-0"}
                `}
                style={{ maxWidth: "none" }}
              />
              </>
            )}
          </>
        ) : (
          <div className="relative rotate-[87.81deg]">
          <Image
            src={poster1}
            alt=""
            width={225}
            style={{ maxWidth: "none" }}
          />
          {/* Participant name */}
              <div
                className="
                  absolute 
                  top-[68px] 
                  left-[74px]
                  w-[120px]
                  h-[17px]
                  text-center
                  font-cinzel-decorative
                  bg-gradient-to-r from-[#ae8625] via-[#f7ef8a] to-[#ae8625]
                  bg-clip-text
                  text-transparent
                  text-sm
                  overflow-hidden
                  whitespace-nowrap
                "
              >
                {data.name}
              </div>
          </div>
        )}
      </div>

      {/* Base Envelope */}
      <div
        className="absolute left-1/2 top-[300px] h-lg:top-[510px] transition-all duration-700 ease-in-out"
        style={{ transform: baseEnvelopeTransform, zIndex: 20 }}
      >
        <Image src={base_envelope} alt="" width={347.7} style={{ maxWidth: "none" }}/>
      </div>

      {/* Front Envelope */}
      {step === "closed" && (
        <div
          className="absolute left-1/2 top-[290px] h-lg:top-[500px] transition-opacity duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: "translateX(-50%)", zIndex: 25 }}
          onClick={handleGlobalClick}
        >
          <Image src={front_envelope} alt="" width={371.45} style={{ maxWidth: "none" }}/>
        </div>
      )}

      {/* Back Envelope */}
      {step !== "closed" && (
        <div
          className="absolute left-1/2 top-[102px] h-lg:top-[313px] transition-all duration-700 ease-in-out"
          style={{
            transform: envelopeTransform,
            zIndex: 10, // lower than poster
          }}
          onClick={handleGlobalClick}
        >
          <Image src={back_envelope} alt="" width={347.7} style={{ maxWidth: "none" }}/>
        </div>
      )}

    </div>
  );
} 



{/*
import Image from "next/image";
import COPA from "../../../../../public/COPA/COPA.png";
import bgImage from "../../../../../public/Nusantara/bgNewYears.webp";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";

// Set up Montserrat font
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

// Set up Legend font (assuming it's a local font)
const legend = localFont({
  src: "../../../../../public/FONT/Legend_Bold.otf",
  variable: "--font-legend",
  display: "swap",
});

export default async function ParticipantPage({ params }) {
  const { id: participantId } = params;

  try {
    // --- DATA FETCHING (Unchanged) ---
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SCRIPT_URL}?id=${participantId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(data);
    // --- END DATA FETCHING ---

    // --- ERROR HANDLING (Unchanged) ---
    if (data.error) {
      return (
        <div
          className={`min-h-screen bg-gray-900 flex items-center justify-center p-4 ${montserrat.variable}`}
        >
          <div className="bg-black text-white p-6 rounded-lg shadow-md max-w-md w-full font-sans">
            <h2 className="text-xl font-bold mb-4 text-red-500">Error</h2>
            <p className="text-red-400">{data.error}</p>
          </div>
        </div>
      );
    }
    // --- END ERROR HANDLING ---

    // --- MAIN COMPONENT RENDER ---
    return (
      <div
        // Use a dark background for the page to blend with the card
        className="min-h-screen flex items-center justify-center p-4 ${montserrat.variable} ${legend.variable}"
        style={{
          backgroundImage: `url(${bgImage.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
      }}
      >
        // Card Container: Black background, max width, full width up to max, no rounding
        <div className="bg-black text-white max-w-sm w-full overflow-hidden shadow-xl font-sans">
          // Header: Flex layout, padding, bottom border
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <div className="text-lg font-bold font-montserrat tracking-wide">
              // Uppercase district/cabang
              DISTRICT | {data.cabang?.toUpperCase()}
            </div>
            // Ensure COPA image has appropriate alt text and size
            <Image
              src={COPA}
              alt="COPA Logo"
              width={80} // Adjusted size slightly
              height={32}
              priority // Load header logo quickly
            />
          </div>

          // Image and Name Overlay Section
          <div className="relative">
            // Image Container: Set aspect ratio or height
            <div className="w-full h-96 bg-gray-700">
              {" "}
              // Adjust height (h-96) as needed
              {data.photo ? (
                <img
                  src={data.photo}
                  alt={data.name || "Participant"}
                  // Cover ensures the image fills the container, cropping if necessary
                  // w-full and h-full make it fill the parent div
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400 font-montserrat">
                    No image available
                  </span>
                </div>
              )}
            </div>

            // Name Overlay: Positioned absolutely at the bottom of the relative parent
            <div className="absolute bottom-0 left-0 right-0 px-4 pt-16 pb-4 bg-gradient-to-t from-black via-black/80 to-transparent">
              <h1 className="text-4xl font-extrabold tracking-wider leading-tight font-legend text-center text-white">
                // Map name words to uppercase divs for line breaks
                {data.name?.split(" ").map((word, index) => (
                  <div key={index}>{word.toUpperCase()}</div>
                ))}
              </h1>
            </div>
          </div>

          // Content Below Image: Padding applied here
          <div className="p-6 pt-4">
            // Sport Category / Competitions Banner: Centered
            <div className="text-center mt-[-1rem] mb-6">
              {" "}
              // Negative margin to pull it up slightly, adjust as needed
              <div className="bg-red-600 text-white py-2 px-4 inline-block">
                <span className="font-medium font-montserrat text-sm uppercase">
                  // Join cabang and UNIQUE competition names, ensure uppercase
                  {(() => {
                    const competitionNames = data.competitions?.map(comp => comp.competition) || [];
                    const uniqueCompetitionNames = [...new Set(competitionNames)];
                    return [
                      ...uniqueCompetitionNames
                    ]
                      .filter(Boolean)
                      .join(" | ")
                      .toUpperCase();
                  })()}
                </span>
              </div>
            </div>

            // Details Section
            <div className="space-y-5">
              {" "}
              // Add space between detail items
              // Next Match Section
              <div>
                <p className="text-xs text-gray-400 font-montserrat mb-1 uppercase tracking-wide">
                  Next Match:
                </p>
                // Use the specific format from the image
                {data.competitions && data.competitions.length > 0 ? (
                  data.competitions.map((comp, index) => (
                    <p key={index} className="text-lg font-montserrat">
                      // Attempt to mimic "18.30 - vs Opponent" format
                      // This assumes timeLocation might contain opponent info
                      // You might need to adjust data structure/parsing here
                      {comp.timeLocation || "To be announced"}
                    </p>
                  ))
                ) : (
                  <p className="text-lg font-montserrat">To be announced</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    // --- CATCH BLOCK (Unchanged) ---
    return (
      <div
        className={`min-h-screen bg-gray-900 flex items-center justify-center p-4 ${montserrat.variable}`}
      >
        <div className="bg-black text-white p-6 rounded-lg shadow-md max-w-md w-full font-sans">
          <h2 className="text-xl font-bold mb-4 text-red-500">Error</h2>
          <p className="text-red-400">
            An error occurred while loading the participant data. Please try
            again later.
          </p>
          <p className="text-sm text-gray-500 mt-2">Error: {error.message}</p>
        </div>
      </div>
    );
    // --- END CATCH BLOCK ---
  }
}
    */}