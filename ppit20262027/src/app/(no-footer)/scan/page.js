import BarcodeScanner from '../../Components/BarcodeScanner';
import Link from "next/link";

export default function ScanPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-4 mt-2">
          <Link
            href="/form"
            className="group flex items-center w-14 hover:w-32 transition-all duration-300 ease-in-out bg-gray-800 hover:bg-gray-700 text-white rounded-full overflow-hidden ml-7 px-4 py-3"
          >
            <span className="text-2xl transition-transform duration-300"> ← </span>
            <span className="font-montserrat ml-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium">
              Back
            </span>
          </Link>
      </div>
      <h1 className="text-2xl font-bold text-center mb-8 font-montserrat">Scan QR Code</h1>
      <BarcodeScanner />
    </div>
  );
} 