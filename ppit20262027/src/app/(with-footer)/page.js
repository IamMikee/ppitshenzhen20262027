"use client";
import Image from "next/image";
import PPIT from "../../../public/Home/foto_tangga.webp";
import PPITTablet from "../../../public/Home/foto_tangga.webp";
import PPITMobile from "../../../public/Home/foto_tangga.webp";
import AboutImage from "../../../public/Home/3D_Logo.webp";
import Mission from "../../../public/Home/mission.webp";
import couplesweater from "../../../public/Home/couplesweater.webp";
import sweatercewe from "../../../public/Home/sweatercewe.webp";
import sweatercowo from "../../../public/Home/sweatercowo.webp";
import GuidebookImage from "../../../public/Home/fotoguidebook.webp";
import Link from "next/link";

export default function Home() {

	const universities = [
		{
			name: "Peking University Shenzhen Graduate School", 
			ranking: "#14 QS World Rankings 2026",
			color: "#F00000"
		},
		{
			name: "Tsinghua Shenzhen International Graduate School",
			ranking: "#17 QS World Rankings 2026",
			color: "#F8650C"
		},
		{
			name: "The Chinese University of Hong Kong, Shenzhen",
			ranking: "#32 QS World Rankings 2026",
			color: "#FFC917"
		},
		{
			name: "Harbin Institute of Technology Shenzhen",
			ranking: "#256 QS World Rankings 2026",
			color: "#FFC917"
		},
		{
			name: "Southern University of Science and Technology",
			ranking: "#343 QS World Rankings 2026",
			color: "#F8650C"
		},
		{
			name: "Shenzhen University",
			ranking: "#452 QS World Rankings 2026",
			color: "#F00000"
		},
	];

	return (
		<>
			{/* Hero Section */}
			<div className="relative font-montserrat">
				<div className="relative h-[110vh] -top-10">
					<Image
						src={PPITMobile}
						alt="PPIT Hero"
						className="sm:hidden block w-full h-full object-cover"
						priority
						quality={90}
					/>
					<Image
						src={PPIT}
						alt="PPIT Hero"
						className="lg:block hidden w-full h-full object-cover"
						priority
						quality={100}
					/>
					<Image
						src={PPITTablet}
						alt="PPIT Hero"
						className="lg:hidden sm:block hidden w-full h-full object-cover "
						quality={75}
					/>

					<div className="absolute inset-x-0 bottom-10 flex flex-col items-center z-10">
						<Link
							href="#about-us"
							className="text-white text-4xl font-light tracking-wider mb-3 drop-shadow-lg"
						>
							find out more
						</Link>
						<Link
							href="#about-us"
							className="animate-bounce mb-8 drop-shadow-lg !smooth-scroll"
						>
							<svg
								width="64"
								height="64"
								viewBox="0 0 24 24"
								fill="none"
								className="text-white"
							>
								<path
									d="M7 10L12 15L17 10"
									stroke="currentColor"
									strokeWidth="3.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</Link>
					</div>
				</div>
				
				{/* Red wave transition */}
				<div className="absolute -bottom-1 left-0 w-full h-[150px] pointer-events-none overflow-hidden">
				<svg
					viewBox="0 0 1440 320"
					preserveAspectRatio="none"
					className="w-full h-full"
				>
					{/* Base red wave */}
					<path
					d="M0 96L48 106.7C96 117 192 139 288 160C384 181 480 181 576 160C672 139 768 96 864 80C960 64 1056 75 1152 96C1248 117 1344 149 1392 165.3L1440 181V320H0V96Z"
					fill="#7E0C0E"
					/>
				</svg>
				</div>
			</div>
			
			<div className="relative overflow-hidden">

			{/* About Section */}
			<section
				id="about-us"
				className="relative py-20 md:px-12 px-8 lg:px-8 w-full mx-auto bg-[#7E0C0E]"
			>
			{/* Center */}
				<div className="relative z-10 max-w-[90rem] mx-auto md:px-12 px-8 lg:px-8 text-white">
					<div className="flex items-center justify-center lg:block">
						<hr className="w-[20%] md:w-[10%] my-4 border-t-[3px] border-white" />
					</div>

					<h2 className="text-center lg:text-left sm:text-4xl text-3xl font-bold mb-4 text-white font-montserrat">
						ABOUT US
					</h2>
					<div className="grid grid-row-4 md:grid-cols-8 md:grid-rows-1 gap-8">
						<div className="row-start-2 md:row-start-1 md:col-span-5 lg:col-span-6">
							<div className="text-2xl md:text-xl lg:text-3xl font-[530] text-center md:text-left font-montserrat">
								Keinginan pelajar-pelajar Indonesia di Kota Shenzhen untuk berdiri
								mandiri sebagai sebuah organisasi bermula pada tahun 2018.
							</div>
							<div className="text-lg md:text-base lg:text-xl mt-4 font-montserrat">
								Di tahun yang sama, Perhimpunan Pelajar Indonesia di Tiongkok
								ranting Shenzhen (PPITSZ) resmi berdiri sebagai ranting dari
								cabang Guangzhou. Kepengurusan pertama PPITSZ dipimpin oleh
								Saudara Ivan Prawira Limanauwyang juga merupakan salah satu
								inisiator berdirinya organisasi ini. Setelah melewati satu periode
								kepengerusan, PPITSZ akhirnya disahkan sebagai cabang pada tahun
								2019. Saat ini, PPITSZ menaungi lebih dari 500 pelajar aktif yang
								tersebar di 4 lembaga pendidikan di Kota Shenzhen.
							</div>
							{/* New Statistics Section */}
							<div className="mt-8 flex space-x-16">
								<div className="flex flex-col items-start">
									<div className="lg:text-5xl md:text-4xl text-3xl text-white font-montserrat font-[420]">
										7+
									</div>
									<div className="text-white font-montserrat">
										Tahun Berdiri
									</div>
								</div>
								<div className="flex flex-col items-start">
									<div className="lg:text-5xl md:text-4xl text-3xl text-white font-montserrat font-[420]">
										500+
									</div>
									<div className="text-white font-montserrat">
										Mahasiswa di Shenzhen
									</div>
								</div>
							</div>
						</div>
						<div className="md:col-span-3 lg:col-span-2 md:h-full z-30">
							<Image
								src={AboutImage}
								alt="About Us Image"
								className="rounded-none"
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Vision & Mission */}
			<section className="relative bg-[#7E0C0E] pt-12 pb-20 px-4 md:px-8">
				{/* Right repeating batik */}
				<div
					className="absolute top-0 right-0 h-full w-[120px] sm:w-[230px]
					bg-[url('/Home/motif_batik_hp.webp')] 
					sm:bg-[url('/Home/motif_batik.webp')]
					opacity-10 bg-repeat-y z-0
					bg-[length:120px_auto] sm:bg-[length:230px_auto]"
				/>

				{/* Left repeating batik */}
				<div
					className="absolute top-0 left-0 h-full w-[120px] sm:w-[230px]
					scale-x-[-1]
					bg-[url('/Home/motif_batik_hp.webp')] 
					sm:bg-[url('/Home/motif_batik.webp')]
					opacity-10 bg-repeat-y z-0
					bg-[length:120px_auto] sm:bg-[length:230px_auto]"
				/>
				<div className="max-w-[90rem] mx-auto flex flex-col md:flex-row text-white">
					<div className="ml-4">
						<div className="flex flex-col md:flex-row">
							<div className="flex-1 pr-4 mb-8 md:mb-0">
								<h2 className="text-3xl lg:text-4xl font-bold font-montserrat mb-4 text-center mb-6">
									VISI
								</h2>
								<p className="text-xl lg:text-2xl font-montserrat font-small text-justify">
									Menjadikan PPIT Shenzhen wadah yang 
									hangat, inklusif, dan membangun, dimana setiap
									pelajar Indonesia dapat merasakan kebersamaan 
									dalam kehidupan perkuliahan, serta berkembang 
									secara pribadi dan kolektif. 
									
								</p>
								{/* <div className="flex items-center justify-center">
									<Image
										src={Vision}
										className="mt-6 md:mt-12 w-[25%] h-auto object-cover"
										width={200}
										height={200}
										alt="Vision"
									/>
								</div> */}
							</div>
							<div className="md:border-l-2 border-gray-300 mx-4" />
							<div className="flex-1 md:pl-4 mb-8 md:mb-0">
								<h2 className="text-3xl lg:text-4xl font-bold font-montserrat mb-4 text-center">
									MISI
								</h2>
									<ul className="list-disc list-inside text-xl lg:text-2xl font-montserrat font-small mx-auto max-w-xl text-left sm:text-justify">
										<li className="mb-2">
										<span className="font-bold">Grow:</span> Mendorong Pengembangan diri mahasiswa melalui kegiatan edukatif, kreatif, dan kolaboratif yang membentuk pribadi tangguh dan berdaya saing.
										</li>
										<li className="mb-2">
										<span className="font-bold">Laugh:</span> Menciptakan lingkungan yang menyenangkan melalui berbagai program yang membangun suasan positif, sehat, dan penuh tawa.
										</li>
										<li className="mb-2">
										<span className="font-bold">Open:</span> Menumbuhkan budaya keterbukaan, komunikasi 2 arah, dan kolaborasi antaranggota demi terciptanya organisasi yang responsif dan adaptif.
										</li>
										<li className="mb-2">
										<span className="font-bold">Warm:</span> Memperkuat rasa kekeluargaan antar pelajar Indonesia di Shenzhen agar setiap individu merasa diterima, didengar, dan dihargai.
										</li>
									</ul>
				
								{/* <div className="flex items-center justify-center">
									<Image
										src={Mission}
										className="mt-6 md:mt-12 w-[25%] h-auto object-cover"
										width={200}
										height={200}
										alt="Mission"
									/>
								</div> */}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Guidebook Section */}	
			<section className="bg-[#7E0C0E] py-16 px-8 lg:px-8 w-full mx-auto">
				<div className="relative z-10 max-w-[90rem] mx-auto md:px-12 px-8 lg:px-8 text-white">
					<div className="flex flex-col lg:flex-row gap-4 md:gap-6 xl:gap-8 xl:mx-24 md:mx-16 mx-12 items-center justify-between">
						<div className="flex flex-col">
							<h2 className="text-center lg:text-left sm:text-5xl text-3xl font-bold text-white font-montserrat">
								Guidebook for Freshmen
							</h2>
							<p className="text-xl md:text-2xl text-center lg:text-left font-montserrat relative z-10 text-white mt-2 max-w-2xl">
								Guidebook ini dibuat untuk membantu mahasiswa yang akan atau sedang menjalani minggu awal di Shenzhen.
							</p >
						</div>
						<div className="flex items-center justify-center mt-4 lg:mt-0">
							<Link
								href="https://docs.google.com/document/d/1B8F7FHKaJyNP60lPWjCit8to9lZ5qNiGvsrr4nQGD14/edit?usp=drivesdk"
								className="text-white font-bold xl:text-3xl text-2xl xl:px-6 px-4 py-3 mx-4 bg-red-600 font-montserrat hover:scale-110 transition duration-300 text-center relative z-20 rounded-md"
							>
								View Here
							</Link>
						</div>
					</div>
					<div className="mt-4 px-6 lg:px-16">
						<div className="max-w-7xl mx-auto">
							<Image
								src={GuidebookImage}
								alt="Guidebook for Freshmen"
								className="w-full h-auto object-cover rounded-md"
								width={6000}
								height={4000}
								quality={90}
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Merchandise Section */}
			<section className="bg-[#7E0C0E] py-16 px-8 lg:px-8 w-full mx-auto">
    <div className="relative z-10 max-w-[90rem] mx-auto md:px-12 px-8 lg:px-8 text-white">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 xl:gap-8 xl:mx-24 md:mx-16 mx-12 items-center justify-between">
            <div className="flex flex-col">
                <h2 className="text-center lg:text-left sm:text-5xl text-3xl font-bold text-white font-montserrat">
                    Merchandise
                </h2>
                <p className="text-xl md:text-2xl text-center lg:text-left font-montserrat relative z-10 text-white">
                    get them while they're still in stock!
                </p>
            </div>
            <div className="flex items-center justify-center mt-4 lg:mt-0">
                <Link
                    href="https://docs.google.com/forms/d/e/1FAIpQLScS3Ng-ee7hA_oZKcF_UQT5--Kx10ihxKPObj8pjOorn7atOA/formResponse"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-bold xl:text-3xl text-2xl xl:px-6 px-4 py-3 mx-4 bg-red-600 font-montserrat hover:scale-110 transition duration-300 text-center relative z-20 rounded-md"
                >
                    BUY NOW
                </Link>
            </div>
        </div>
		<div className="mt-4 px-6 lg:px-16">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
					<div className="flex justify-center">
						<Image
							src={sweatercewe}
							alt="Shenzhen EST. 2018 Exclusive Sweater (Cewe)"
							className="w-full h-auto max-w-[400px] object-contain"
							width={400}
							height={400}
							quality={90}
						/>
					</div>

					<div className="flex justify-center">
						<Image
							src={couplesweater}
							alt="Shenzhen EST. 2018 Exclusive Couple Sweater"
							className="w-full h-auto max-w-[400px] object-contain"
							width={400}
							height={400}
							quality={90}
						/>
					</div>

					<div className="flex justify-center">
						<Image
							src={sweatercowo}
							alt="Shenzhen EST. 2018 Exclusive Sweater (Cowo)"
							className="w-full h-auto max-w-[400px] object-contain"
							width={400}
							height={400}
							quality={90}
						/>
							</div>
				</div>
			</div>
		</div>
	</section>

			{/* University List */}
			<section className="bg-[#7E0C0E] py-16 px-4 md:px-8">
				<div className="max-w-7xl mx-auto">
					{/* Centered Heading */}
					<div className="flex justify-center">
						<h2 className="text-lg md:text-3xl sm:text-xl font-bold mb-12 text-red-800 bg-white inline-block py-3 md:py-4 px-6 rounded-lg font-montserrat">
							UNIVERSITIES IN SHENZHEN
						</h2>
					</div>

					{/* Centered List of Universities */}
					<div className="flex justify-center mx-6 mb-6">
						<div className="space-y-12 relative font-title">
							{universities.map((uni, index) => (
								<div key={index} className="flex items-center gap-6 relative">
									{/* Circle */}
									<div className="w-6 h-6 rounded-full border-[3px] border-white relative z-10"
									style={{backgroundColor	: uni.color}}
									></div>

									{index < universities.length - 1 && (
										<div className="absolute left-[0.6rem] top-6 h-[calc(100%+3rem)] w-1 bg-white z-0"></div>
									)}

									{/* University Details */}
									<div>
										<h3 className="md:text-xl sm:text-md text-sm text-white font-semibold font-montserrat">
										{uni.name}
									</h3>
										<p className="md:text-xl sm:text-md text-sm text-white font-montserrat">
											{uni.ranking}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		</div>
		</>
	);
}
