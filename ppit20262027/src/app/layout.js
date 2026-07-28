import { Geist, Geist_Mono, Cinzel, Cinzel_Decorative, Montserrat } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import Header from "./Components/Header";
import { Analytics } from "@vercel/analytics/next";

const montserrat = Montserrat({
	variable: "--font-montserrat",
	subsets: ["latin"],
})

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const cinzel = Cinzel({
	variable: "--font-cinzel",
	subsets: ['latin'],
})

const cinzel_decorative = Cinzel_Decorative({
	variable: "--font-cinzel-decorative",
	subsets: ['latin'],
	weight: ["700"],
})

export const metadata = {
	title: "PPIT Shenzhen",
	description: "© 2026 PPIT Shenzhen. All rights reserved.",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en" className="h-full !scroll-smooth">
			<body
				className={`${montserrat.variable} ${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${"cinzel-decorative".variable} antialiased`}
			>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
