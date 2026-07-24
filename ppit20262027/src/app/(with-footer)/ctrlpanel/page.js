"use client";

export default function ControlPanelIndex() {
    return (
        <div className="w-full max-w-4xl bg-[#1f1f1f] rounded-xl shadow-2xl p-12 text-white text-center">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <h1 className="text-4xl font-bold mb-4">🎛️ Welcome to the Admin Control Panel</h1>
                <p className="text-gray-400 text-lg mb-8">
                    Select a tool from the sidebar to get started
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition">
                        <div className="text-3xl mb-2">👑</div>
                        <h3 className="text-white font-semibold">Admin Status</h3>
                        <p className="text-gray-400 text-sm">Manage user admin privileges</p>
                    </div>
                    <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition">
                        <div className="text-3xl mb-2">📧</div>
                        <h3 className="text-white font-semibold">Email Broadcast</h3>
                        <p className="text-gray-400 text-sm">Send emails to participants</p>
                    </div>
                </div>
            </div>
        </div>
    );
}