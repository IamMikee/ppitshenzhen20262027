"use client";

import { auth, googleProvider } from "../../../lib/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { updateUser } from "../../../services/forms";
// import usePreviousRoute from "../../../lib/trackPreviousRoute";

export default function LoginPage() {
  const router = useRouter();
  // const previousRoute = usePreviousRoute(3);
  // const redirect = previousRoute || "/";
  const redirect = "/";

 
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await updateUser(user.uid, {
          email: user.email,
        });

        localStorage.setItem("user-id", user.uid);

        router.replace(redirect);
      }
    });

    return () => unsub();
  }, [router, redirect]);


  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace(redirect);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center font-montserrat justify-center bg-[#7E0C0E] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
            
            {/* Header */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Log In
            </h1>

            {/* Description */}
            <p className="text-gray-800 mb-8">
            Please log in to register for PPITSZ's events.
            </p>

            {/* Google Login Button */}
            <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-600 py-3 font-semibold text-gray-800 hover:bg-gray-100 transition"
            >
            {/* Google Logo */}
            <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
            />

            <span>Login with Google</span>
            </button>

        </div>
        </div>

  );
}
