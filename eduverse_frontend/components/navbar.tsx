import { ConnectButton } from "thirdweb/react";
import { client } from "@/app/client";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900 text-white p-4 flex justify-between items-center z-50">
      {/* Left part of the navbar - Logo and Title */}
      <div className="flex items-center">
        <Image src="/Nyolong1.png" alt="Logo" width={50} height={50} />
        <span className="ml-3 text-2xl font-bold">EduVerse</span>
      </div>

      {/* Right part - Wallet Connect Button */}
      <div className="flex items-center">
        <ConnectButton client={client}/>
      </div>
    </nav>
  );
}
2
