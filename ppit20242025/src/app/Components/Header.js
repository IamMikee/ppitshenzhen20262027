"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

const Header = () => {
	const [menuOpen, setMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const toggleMenu = () => setMenuOpen((prev) => !prev);
	const [eventsOpen, setEventsOpen] = useState(false);
	const [user, setUser] = useState(null);
	const [sessionOpen, setSessionOpen] = useState(false);
	const [showLogoutPopup, setShowLogoutPopup] = useState(false); //FOR MOBILE
	const [loggingOut, setLoggingOut] = useState(false);
	const dropdownRef = useRef	(null);
	const router = useRouter();

	async function handleMobileLogout() {
  		await signOut(auth);
  		setShowLogoutPopup(false);
  		router.push("/login");
	}

	const EVENTS = [
		{ name: "PPITSZ 2025-2026", slug: "2526" },
	];
	
	useEffect(() => {
		function handleClickOutside(event) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setSessionOpen(false);
			}
		}

		const handleScroll = () => {
			setIsScrolled(window.scrollY > 0);
		};

		const unsub = onAuthStateChanged(auth, (currentUser) => {
    		setUser(currentUser);
  		});

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener("scroll", handleScroll);
		return () => {
			unsub();
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	return (
		<header
			className={`fixed top-0 w-full h-[78px] flex justify-between items-center p-5 text-xl z-[49] ${
				isScrolled
					? "bg-[#FFFFFF]"
					: "bg-gradient-to-b from-black to-transparent"
			}`}
		>
			{/* Logo */}
			<Link href="/" className="flex items-center">
				{isScrolled ? (
					<>
					<img
						src="/PPITLOGO.webp"
						alt="Logo"
						className="w-[55px] h-[80px] object-contain"
					/>

					<img
						src="/ppitsz2526_redlogo.webp"
						alt="Logo"
						className="w-[57px] h-[64px] object-contain"
					/>

					<span className="text-[#8C0000] font-cinzel text-[26px] font-bold ml-1">PPIT SHENZHEN</span>
					</>
				) : (
					<>
					<img
						src="/ppitsz_whitelogo.webp"
						alt="Logo"
						className="-ml-3 w-[75px] h-[106px] object-contain"
					/>

					<img
						src="/ppitsz2526_whitelogo.webp"
						alt="Logo"
						className="w-[38px] h-[54px] object-contain"
					/>

					<span className="text-white font-cinzel text-[26px] font-bold ml-4">PPIT SHENZHEN</span>
					</>
				)}
			</Link>

			{/* Overlay for mobile menu */}
			<div
				className={`fixed top-0 right-0 w-[45%] h-full bg-white z-10 ${
					menuOpen ? "block" : "hidden"
				}`}
				onClick={toggleMenu}
			></div>

			{/* Hamburger button */}
			<button
				className={`flex flex-col justify-between w-8 h-6 border-none cursor-pointer z-[999] md:hidden ${
					menuOpen ? "active" : ""
				}`}
				aria-label="Toggle navigation"
				onClick={toggleMenu}
			>
				{isScrolled ? (
          		<>
					<span
						className={`block w-full h-[3px] bg-[#8C0000] rounded transition-transform origin-center ${
							menuOpen ? "transform translate-y-[11px] rotate-45" : ""
						} `}
					></span>
					<span
						className={`block w-full h-[3px] bg-[#8C0000] rounded transition-opacity ${
							menuOpen ? "opacity-0" : ""
						} `}
					></span>
					<span
						className={`block w-full h-[3px] rounded bg-[#8C0000] transition-transform origin-center ${
							menuOpen ? "transform translate-y-[-11px] -rotate-45" : ""
						} `}
					></span>
				</>
				) : (
				<>
					<span
						className={`block w-full h-[3px] rounded transition-transform origin-center ${
							menuOpen ? "transform translate-y-[11px] rotate-45 bg-[#8C0000]" : "!bg-white"
						} `}
					></span>
					<span
						className={`block w-full h-[3px] bg-white rounded transition-opacity ${
							menuOpen ? "opacity-0" : ""
						} `}
					></span>
					<span
						className={`block w-full h-[3px] rounded transition-transform origin-center ${
							menuOpen ? "transform translate-y-[-11px] -rotate-45 bg-[#8C0000]" : "!bg-white"
						} `}
					></span>
				</>
				)}
			</button>

			{/* Navigation menu */}
			<nav
				className={`md:flex gap-10 ${
					menuOpen
						? "flex flex-col absolute top-[70px] right-0 w-[43%] p-5 text-[#8C0000] z-[999]"
						: "hidden"
				}`}
			>
				<Link
					href="/"
					className={`md:text-2xl text-xl hover:text-[#8C0000] font-montserrat font-semibold ${
						isScrolled && !menuOpen
							? "text-[#8C0000]"
							: menuOpen
							? "text-[#8C0000]"
							: "text-white"
					}`}
					onClick={() => {
						setMenuOpen(false);
						}}
				>
					Home
				</Link>
				<Link
					href="/committee"
					className={`md:text-2xl text-xl hover:text-[#8C0000] font-montserrat font-semibold ${
						isScrolled && !menuOpen
							? "text-[#8C0000]"
							: menuOpen
							? "text-[#8C0000]"
							: "text-white"
					}`}
					onClick={() => {
						setMenuOpen(false);
						}}
				>
					Committee
				</Link>

				{/* EVENTS – DESKTOP (hover) */}
				<div className="hidden md:block group">
				{/* Trigger */}
				<span
					className={`inline-block md:text-2xl text-xl font-montserrat font-semibold cursor-pointer hover:text-[#8C0000] ${
					isScrolled && !menuOpen
						? "text-[#8C0000]"
						: menuOpen
						? "text-[#8C0000]"
						: "text-white"
					}`}
				>
					Events
				</span>

				{/* Hover buffer (ACTIVE but invisible) */}
				<div
					className="
					absolute top-15
					h-10 w-20
					opacity-0
					pointer-events-auto
					"
				/>

				{/* Dropdown */}
				<div
					className="
					absolute top-full
					z-[999]
					bg-white
					shadow-lg
					overflow-hidden
					opacity-0 pointer-events-none
					transition-opacity duration-150 ease-out
					group-hover:opacity-100
					group-hover:pointer-events-auto
					"
				>
					{EVENTS.map((event) => (
					<Link
						key={event.slug}
						href={`/events/${event.slug}/Welcoming-Party`}
						className="block px-4 py-3 text-[#8C0000] text-lg font-montserrat font-semibold hover:bg-gray-200 whitespace-nowrap"
					>
						{event.name}
					</Link>
					))}
				</div>
				</div>

				{/* EVENTS – MOBILE (click) */}
				<div className="md:hidden">
				<button
					onClick={() => setEventsOpen((v) => !v)}
					className="flex items-center justify-between w-full md:text-2xl text-xl font-montserrat font-semibold text-[#8C0000]"
				>
					Events
					<span
					className={`transition-transform ${
						eventsOpen ? "rotate-180" : ""
					}`}
					>
					▼
					</span>
				</button>

				{/* Mobile submenu */}
				<div
					className={`mt-3 pl-4 space-y-2 overflow-hidden transition-all duration-200 ${
					eventsOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
					}`}
				>
					{EVENTS.map((event) => (
					<Link
						key={event.slug}
						href={`/events/${event.slug}/Welcoming-Party`}
						className="block text-lg font-montserrat text-[#8C0000]"
						onClick={() => {
						setMenuOpen(false);
						setEventsOpen(false);
						}}
					>
						{event.name}
					</Link>
					))}
				</div>
				</div>


				<Link
					href="/faq"
					className={`md:text-2xl text-xl hover:text-[#8C0000] font-montserrat font-semibold ${
						isScrolled && !menuOpen
							? "text-[#8C0000]"
							: menuOpen
							? "text-[#8C0000]"
							: "text-white"
					}`}
					onClick={() => {
						setMenuOpen(false);
					}}
				>
					FAQ
				</Link>

				<Link
					href="/form"
					className={`md:text-2xl text-xl hover:text-[#8C0000] font-montserrat font-semibold ${
						isScrolled && !menuOpen
							? "text-[#8C0000]"
							: menuOpen
							? "text-[#8C0000]"
							: "text-white"
					}`}
					onClick={() => {
						setMenuOpen(false);
					}}
				>
					Forms
				</Link>

				{/* LOGIN FOR MOBILE USERS */}
				{!user ? (
					<Link
						href="/login"
						className={`md:hidden text-xl hover:text-[#8C0000] font-montserrat font-semibold ${
						isScrolled && !menuOpen
							? "text-[#8C0000]"
							: menuOpen
							? "text-[#8C0000]"
							: "text-white"
						}`}
						onClick={() => setMenuOpen(false)}
					>
						Login
					</Link>
					) : (
					<>
						<span
						onClick={() => setShowLogoutPopup(true)}
						className="md:hidden text-xl font-montserrat font-semibold text-[#ffcc00] cursor-pointer hover:text-[#8C0000] transition-colors break-words"
						>
						Hi, {user.email}
						</span>
					</>
				)}


				{/* LOGIN INFO – DESKTOP (click) */}
				<div className="hidden relative flex items-center justify-between px-6 md:block group" ref={dropdownRef}>
				<span
					className={`
						    absolute right-2 top-1/2 -translate-y-1/2 inline-block w-10 h-10 rounded-full bg-center bg-cover cursor-pointer border-2 border-white/70 hover:border-[#8C0000] transition
						${isScrolled ? "border-[#8C0000]" : "bg-white"}
						${menuOpen ? "border-[#8C0000]" : ""}
					`}
					style={{
						backgroundImage: `url(${user?.photoURL || "/user-pfp.webp"})`,
					}}
					onClick={() => setSessionOpen(!sessionOpen)}
				></span>

				{/* Dropdown */}
				{sessionOpen && (
					<div className="absolute right-0 mt-14 max-w-64 bg-white shadow-lg rounded-lg border border-gray-200 p-4 z-50 overflow-auto">
					<p className="text-sm text-gray-400">{user ? "Logged in as" : ""}</p>
					<p className="text-sm text-gray-700 mb-2 break-words" style={{fontWeight: "bold"}}>{user ? `${user?.email}` : ""}</p>
					<button
						disabled={loggingOut}
						onClick={async () => {
							if (user) {
								setLoggingOut(true);
								setSessionOpen(false);
								await signOut(auth);
								router.replace("/");
								setLoggingOut(false);
							} else {
								setLoggingOut(false);
								setSessionOpen(false);
								router.replace('/login');
							}
 						}}
						className={`w-full bg-red-600 text-white text-sm py-2 rounded hover:bg-red-700 transition ${ loggingOut ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700" }`}
					> <span className="whitespace-nowrap px-4">
						{user ? "Log Out" : "Log In"}
					</span>
					</button>
					</div>
				)}


				</div>
			</nav>
			{/* LOGOUT POPUP MOBILE */}
			{showLogoutPopup && (
				<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[1000]">
					<div className="bg-white rounded-xl p-6 w-[80%] max-w-sm text-center shadow-lg">
					<p className="font-montserrat text-lg text-black mb-4">
						Are you sure you want to log out?
					</p>
					<div className="flex justify-between gap-4">
						<button
						onClick={() => setShowLogoutPopup(false)}
						className="flex-1 py-2 rounded-lg text-black bg-gray-300 hover:bg-gray-400 transition"
						>
						No
						</button>
						<button
						onClick={handleMobileLogout}
						className="flex-1 py-2 rounded-lg bg-[#8C0000] text-white hover:opacity-90 transition"
						>
						Yes
						</button>
					</div>
					</div>
				</div>
			)}
		</header>
	);
};

export default Header;
