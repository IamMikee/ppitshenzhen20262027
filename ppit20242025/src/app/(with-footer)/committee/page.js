import fs from "fs";
import CommitteeCarousel from "./committeecarousel.js";

export default function Page() {
	const files = fs.readdirSync("./public/CMT_Assets/");

	var contentPassed = [
		[], // Nama singkat DIVISI
		[], // Nama panjang DIVISI
		[], // List nama-nama member sesuai urutan divisi di contentPassed[0]
	];

	for(let folderName of files) {
		const i = folderName.split(" "); // format nama folder = "BPH Badan Pengurus Harian"
		contentPassed[0].push(i[0]); // singkatan
		contentPassed[1].push(i.slice(1).join(" ")); // kpanjangan

		const temp = fs.readdirSync(`./public/CMT_Assets/${folderName}`) // format nama member = "n.png"; n --> urutan [startswith 1]
		contentPassed[2].push(temp)
	}
	// console.log(contentPassed);

	return <CommitteeCarousel input={contentPassed} />;
}


