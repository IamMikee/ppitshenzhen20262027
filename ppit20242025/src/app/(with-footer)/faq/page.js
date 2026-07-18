"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Faq() {
	const [openDropdown, setOpenDropdown] = useState(null);
	const [selectedCategory, setSelectedCategory] = useState("General");

	const toggleDropdown = (index) => {
		setOpenDropdown(openDropdown === index ? null : index);
	};

	const faqData = [
		{
			id: 1,
			category: "General",
			question: "When was PPITSZ founded?",
			answer: "PPITSZ was founded in September of 2018.",
			svg: "/General.svg",
		},
		{
			id: 2,
			category: "General",
			question: "Who is the leader of PPITSZ in this period?",
			answer: "Calvin Tiorence, is the leader of PPITSZ in this period (as of 2025/2026).",
			svg: "/General.svg",
		},
		{
			id: 3,
			category: "General",
			question: "What language is primarily spoken at PPITSZ events?",
			answer:
				"We mainly use Indonesian as our means of communication. However, we sometimes do use English to accomodate international guests.",
			svg: "/General.svg",
		},
		{
			id: 4,
			category: "General",
			question: "How many events does PPITSZ have in a year?",
			answer: "On average, we have about 4-8 events in each period.",
			svg: "/General.svg",
		},
		{
			id: 5,
			category: "General",
			question: "Does PPITSZ host events for cultural celebrations?",
			answer:
				"Yes we do! Cultural celebrations events are mainly organized by our Social and Budaya Department.",
			svg: "/General.svg",
		},
		{
			id: 6,
			category: "General",
			question: "How can I stay updated with PPITSZ activities?",
			answer: "We always post our activities and events on our Instagram.",
			svg: "/General.svg",
		},
		{
			id: 7,
			category: "General",
			question: "What social media platforms does PPITSZ use?",
			answer:
				"We mainly use Instagram to communicate event updates, but we also have a TikTok account.",
			svg: "/General.svg",
		},
		{
			id: 8,
			category: "General",
			question:
				"What universities in Shenzhen have the most Indonesian students?",
			answer:
				"CUHK-SZ having over 300 Indonesian students is the university in Shenzhen with the most Indonesian students.",
			svg: "/General.svg",
		},
		{
			id: 9,
			category: "Membership",
			question: "What types of events does PPITSZ organize?",
			answer:
				"We organize various events such as cultural events, social gatherings, and academic seminars.",
			svg: "/Membership.svg",
		},
		{
			id: 10,
			category: "Membership",
			question: "Are PPITSZ events open to non-members?",
			answer:
				"Yes! Non-members are always welcome to participate in our events.",
			svg: "/Membership.svg",
		},
		{
			id: 11,
			category: "Membership",
			question: "How can I join PPITSZ as a member?",
			answer:
				"Every year around August-October we have a membership recruitment period. You can stay tuned on our Instagram for further information.",
			svg: "/Membership.svg",
		},
		{
			id: 12,
			category: "Membership",
			question: "What benefits do PPITSZ members get?",
			answer:
				"PPITSZ members enjoy networking, exclusive events, leadership opportunities, and certificates of recognition.",
			svg: "/Membership.svg",
		},
		{
			id: 13,
			category: "Collaboration",
			question: "How can I volunteer for PPITSZ events?",
			answer: "Unfortunately we are currently not in search of volunteers.",
			svg: "/Collaboration.svg",
		},
		{
			id: 14,
			category: "Collaboration",
			question: "How do I contact PPITSZ for collaboration opportunities?",
			answer: "You can contact us through our email ppitshenzhen@gmail.com.",
			svg: "/Collaboration.svg",
		},
		{
			id: 15,
			category: "Collaboration",
			question: "Can I donate to support PPITSZ activities?",
			answer: "We are currently not accepting donations to support our events.",
			svg: "/Collaboration.svg",
		},
		{
			id: 16,
			category: "Collaboration",
			question: "Does PPITSZ have partnerships with other organizations?",
			answer: "Yes, we have a strong partnership with GreatWall.",
			svg: "/Collaboration.svg",
		},
		{
			id: 17,
			category: "Living",
			question: "What are some popular places to visit in Shenzhen?",
			answer:
				"Popular places to visit in Shenzhen include Window of the World, OCT Loft, and Nanshan Mountain.",
			svg: "/Living.svg",
		},
		{
			id: 18,
			category: "Living",
			question: "What are the average transport prices in Shenzhen?",
			answer:
				"In Shenzhen, MRT fares typically range from 2 to 14 RMB. Bus fares are usually 2 RMB for most routes.",
			svg: "/Living.svg",
		},
		{
			id: 19,
			category: "Living",
			question:
				"What is the average monthly spending for students living in Shenzhen?",
			answer:
				"On average, students in Shenzhen spend around 1,500-3,000 RMB per month.",
			svg: "/Living.svg",
		},
		{
			id: 20,
			category: "Living",
			question: "How much do meals cost on average in Shenzhen?",
			answer:
				"On average, meals in Shenzhen cost around 20 RMB, while dining at restaurants in malls typically ranges from 40 to 70 RMB.",
			svg: "/Living.svg",
		},
		{
			id: 21,
			category: "Living",
			question: "Where are the best places to buy groceries in Shenzhen?",
			answer:
				"The best places to buy groceries in Shenzhen include online platforms like 叮咚 (Dingdong) for fresh produce and essentials.",
			svg: "/Living.svg",
		},
	];

	// Filter FAQs based on the selected category
	const filteredFaqs = faqData.filter(
		(faq) => faq.category === selectedCategory
	);

	return (
		<div className="bg-[#7E0C0E]">
			<div className="w-full lg:pt-24 md:pt-20 pt-16">
				<div className="w-full font-montserrat font-bold xl:text-4xl md:text-3xl sm:text-2xl text-2xl tracking-wide text-center mt-8 py-3 text-slate-100">
					Frequently asked questions
				</div>
				<div className="w-full font-montserrat md:text-lg sm:text-sm text-sm text-slate-100	 text-center px-6">
					These are the most commonly asked questions about PPITSZ. <br />
					Can't find what you're looking for?{" "}
					<u>
						<Link href="https://www.instagram.com/ppitshenzhen/">
							Chat to our friendly team!
						</Link>
					</u>
				</div>
			</div>
			<div className="Options font-montserrat font-semibold sm:flex sm:flex-row grid grid-cols-2 sm:gap-4 gap-y-2 gap-x-2 lg:mt-10 md:mt-8 sm:mt-6 mt-4 md:mb-6 sm:mb-4 mb-3 xl:w-[50%] lg:w-[60%] md:w-[70%] sm:w-[80%] w-[70%] justify-center mx-auto">
				{["General", "Membership", "Collaboration", "Living"].map(
					(category) => (
						<div
							key={category}
							className={`border-2 rounded-full py-1.5 sm:px-4 px-2 cursor-pointer md:text-lg sm:text-md text-sm sm:w-auto mx-auto w-full text-center ${
								selectedCategory === category
									? "bg-white text-[#000]"
									: "border-white text-[#FFF]"
							}`}
							onClick={() => setSelectedCategory(category)}
						>
							{category}
						</div>
					)
				)}
			</div>
			<div className="FAQS flex flex-col justify-center items-center w-full gap-4 lg:pb-16 md:pb-12 pb-8">
				{filteredFaqs.map((faq) => (
					<div
						key={faq.id}
						className="Card items-center justify-center lg:my-3 md:my-2 my-1.5"
					>
						<div
							className="Card flex flex-row justify-center items-center gap-3"
							onClick={() => toggleDropdown(faq.id)}
						>
							<div className="Icon border-2 p-2 rounded-lg bg-white border-white">
								<Image src={faq.svg} alt="Icon" height={25} width={25} />
							</div>
							<div className="Text font-montserrat font-semibold lg:text-xl md:text-lg sm:text-md text-sm h-inherit lg:w-[45vw] md:w-[55vw] sm:w-[65vw] w-[60vw] text-slate-100">
								{faq.question}
							</div>
							<div className="Arrow float-right cursor-pointer p-2">
								<Image
									src="/arrow-down.svg"
									alt="Arrow"
									height={24}
									width={24}
									className={`transition duration-300 ${
										openDropdown === faq.id ? "transform -rotate-180" : ""
									}`}
								/>
							</div>
						</div>
						<div
							className={`DROPDOWN overflow-hidden transition-all duration-500 ease-in-out font-montserrat lg:text-xl md:text-lg sm:text-md text-sm lg:w-[45vw] md:w-[55vw] sm:w-[65vw] w-[60vw] pl-[2px] mx-auto text-slate-100 ${
								openDropdown === faq.id
									? "max-h-20 md:py-1 py-0.5 opacity-100"
									: "max-h-0 py-0 opacity-0"
							}`}
						>
							{faq.answer}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
