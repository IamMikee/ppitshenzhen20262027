"use client";
import { useState } from "react";
import Image from "next/image";
import Header from "../../Components/Header";

export default function CommitteeCarousel({ input }) {
	const [menuOpen, setMenuOpen] = useState(false); // Track the state of the menu

	const toggleMenu = () => {
		setMenuOpen(!menuOpen); // Toggle the menu visibility
	};

	const [activeSection, setActiveSection] = useState(0);
	const [showOverlay, setShowOverlay] = useState(false);

	
	const sections = []; // Sections and images
	const members = []; // Members for the overlay
	const departmentLayouts = {};	// Corrected layout configurations

    
    //Algorithm to create design dynamically
    for(let i = 0; i<input[0].length; i++) { //i => department code, loop through folders
        // for sections variable
        sections.push({
            id: i,
            title: input[0][i],
            description: input[1][i],
            image: `/BANNER_CMT_FULL/Full/${input[0][i]}.webp`, //FORMAT FILE FOTO DIVISI: "NAMA_DIVISI.webp" (in caps, sesuai dgn nama yg ada di folder)
        })

        //for members and departmentlayouts
        for(let j = 0; j<input[2][i].length; j++) { //j => member code/looping through members
            members.push({
                id: parseInt(`${i+1}${j+1}`),
                cardImage: `/CMT_Assets/${input[0][i]} ${input[1][i]}/${input[2][i][j]}`,
                department: i,
            })
        }
        departmentLayouts[i] = { type: `${input[2][i].length}`}
    }


	// Member card component with responsive design
	function MemberCard({ member }) {
		return (
			<>
				<div className="w-full rounded-lg overflow-hidden hover:scale-105 transform transition-transform duration-300 aspect-[3/4] max-w-[200px]">
                    <img
                        src={member.cardImage}
                        alt={`Card for Member ${member.id}`}
                        autoPlay
                        loop
                        muted
                        playsInline
                        width={200}
                        height={260}
                        className="object-cover"
                        style={{ objectFit: "contain" }}  // equivalent of objectFit="contain"
                    />
				</div>
			</>
		);
	}

	// Layout component with custom arrangements
	function Layout({ type, members }) {
		switch (type) {
			case "6":
				if (members.length !== 6) return <div>Invalid member count</div>;
				return (
					<div className="grid grid-rows-2 justify-center gap-2 md:gap-6">
						{/* First row: 3 cards */}
						<div className="gap-2 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[0]} />
							<MemberCard member={members[1]} />
							<MemberCard member={members[2]} />
						</div>
						{/* Second row: 3 cards */}
						<div className=" gap-2 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[3]} />
							<MemberCard member={members[4]} />
							<MemberCard member={members[5]} />
						</div>
					</div>
				);
			case "5":
				if (members.length !== 5) return <div>Invalid member count</div>;
				return (
					<div className="grid grid-rows-2 justify-center gap-2 md:gap-6">
						{/* First row: 3 cards */}
						<div className="gap-2 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[0]} />
							<MemberCard member={members[1]} />
							<MemberCard member={members[2]} />
						</div>
						{/* Second row: 2 cards */}
						<div className="px-14 md:px-0 gap-2 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[3]} />
							<MemberCard member={members[4]} />
						</div>
					</div>
				);

			case "7":
				if (members.length !== 7) return <div>Invalid member count</div>;
				return (
					<div className="grid grid-rows-2 justify-center gap-2 md:gap-6">
						{/* First row: 4 cards */}
						<div className="gap-1 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[0]} />
							<MemberCard member={members[1]} />
							<MemberCard member={members[2]} />
							<MemberCard member={members[3]} />
						</div>
						{/* Second row: 3 cards */}
						<div className=" px-8 md:px:0 gap-1 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[4]} />
							<MemberCard member={members[5]} />
							<MemberCard member={members[6]} />
						</div>
					</div>
				);
			case "8":
				if (members.length !== 8) return <div>Invalid member count</div>;
				return (
					<div className="grid grid-rows-2 justify-center gap-2 md:gap-8">
						{/* First row: 4 cards */}
						<div className="flex-nowrap gap-1 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[0]} />
							<MemberCard member={members[1]} />
							<MemberCard member={members[2]} />
							<MemberCard member={members[3]} />
						</div>
						{/* Second row: 4 cards */}
						<div className="flex-nowrap gap-1 md:gap-8 flex flex-row justify-center">
							<MemberCard member={members[4]} />
							<MemberCard member={members[5]} />
							<MemberCard member={members[6]} />
							<MemberCard member={members[7]} />
						</div>
					</div>
				);
			default:
				return (
					<div className="grid grid-cols-3 gap-2 justify-items-center">
						{members.map((member, index) => (
							<div key={index}>
								<MemberCard member={member} />
							</div>
						))}
					</div>
				);
		}
	}

	return (
		<div className="w-full overflow-x-hidden">
			<Header menuOpen={menuOpen} toggleMenu={toggleMenu} />
			<div className="bg-[#7E0C0E] text-white font-[500] font-montserrat">
				{/* Banner Section */}
				<div className="relative h-[50vh] xl:h-screen w-full mb-[2%] bg-black">
					<Image
						src="/BANNER_CMT_FULL/banner.webp"
						alt="Banner Background"
						fill
						className="object-cover opacity-70"
						priority
						quality={100}
					/>
					<div className="absolute inset-0 bg-black bg-opacity-20" />
					<div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white">
						<h1 className="text-5xl md:text-6xl font-bold leading-tight drop-shadow-lg">
							<span className="block text-4xl md:text-6xl sm:text-4xl -mb-2 md:-mb-4 shadow-md" style={{textShadow: "0px 5px 10px #000000"}}>
								Meet The
							</span>
							<span className="block text-6xl md:text-8xl sm:text-6xl -mt-2 md:-mt-4" style={{textShadow: "0px 5px 10px #000000"}}>
								Committee
							</span>
						</h1>
					</div>
				</div>
					
				{/* Navigation Buttons */}
				<div className="flex flex-wrap justify-center space-x-5 md:space-x-4 mt-10 xl:mt-0 mb-0 xl:mb-3 md:w-[80%] w-[90%] mx-auto md:px-2 xl:px-0">
					{sections.map((section, index) => (
						<button
						key={section.id}
						onClick={() => setActiveSection(index)}
						className={`mb-2 px-4 md:px-6 py-1.5 lg:text-lg md:text-base sm:text-md text-sm rounded-full font-montserrat font-semibold ${
							activeSection === index
							? "bg-white text-black border-white border-[2px]"
							: "bg-red-500 text-white hover:bg-red-700 hover:text-white hover:scale-110 transition duration-300"
						}`}
						>
							{section.title}
						</button>
					))}
				</div>

				{/* Main Content */}
				<div className="flex xl:flex-row flex-col items-center justify-center xl:px-[8%] lg:pb-16 pb-12 mt-8">
					<div className="relative h-[45vh] sm:h-[60vh] lg:h-[80vh] overflow-hidden rounded-lg flex items-center justify-center xl:ml-auto xl:mr-0 mx-auto aspect-[4/5]">
						{sections.map((section, index) => (
							<Image
							key={section.id}
							src={section.image}
							alt={`Image for ${section.description}`}
							fill
							className={`w-full object-contain lg:px-8 transition-opacity duration-400 ease-in-out ${
								activeSection === index ? "opacity-100" : "opacity-0"
							}`}
							quality={100}
							/>
						))}
					</div>
					<div className="flex flex-col items-center justify-center xl:items-start md:w-[50%] w-[85%] space-y-4 pl-8 mt-4 lg:mt-0 lg:pl-16 pr-8">
						<h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-6xl font-bold text-center xl:text-left leading-tight w-full">
							{sections[activeSection].description}
						</h2>
						<button
							onClick={() => setShowOverlay(true)}
							className="px-6 py-2 bg-red-500 text-white font-semibold rounded-full hover:bg-red-700 hover:scale-110 transition duration-300"
							>
							View Members
						</button>
					</div>
				</div>
				
				{/* Overlay Section */}
				{showOverlay && (
					<div
						className="fixed inset-0 bg-black bg-opacity-80  z-[1000] flex items-center justify-center "
						onClick={() => setShowOverlay(false)}
					>
						<div className="p-2 max-w-5xl w-full mx-auto">
							{departmentLayouts[activeSection] && (
								<Layout
									type={departmentLayouts[activeSection].type}
									members={members
										.filter((member) => member.department === activeSection)
										.sort((a, b) => a.id - b.id)}
								/>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}