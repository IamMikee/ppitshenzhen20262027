"use client";

import { auth, googleProvider } from "../../../lib/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateUser } from "../../../services/forms";
import OnboardingModal from "../../Components/OnboardingModal";

export default function LoginPage() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const redirect = "/";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user exists in Firestore
          const userExists = await checkUserExists(user.uid);
          
          if (userExists) {
            // User exists - update lastLogin and redirect
            await updateUser(user.uid, {
              email: user.email,
            });
            localStorage.setItem("user-id", user.uid);
            router.replace(redirect);
          } else {
            // New user - show onboarding popup
            setPendingUser(user);
            setShowOnboarding(true);
            setLoading(false);
          }
        } catch (error) {
          console.error("Error checking user:", error);
          // Fallback: try to create user
          setPendingUser(user);
          setShowOnboarding(true);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, redirect]);

  // Function to check if user exists in Firestore
  const checkUserExists = async (uid) => {
    try {
      const { db } = await import("../../../lib/firebase");
      const { doc, getDoc } = await import("firebase/firestore");
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      return userSnap.exists();
    } catch (error) {
      console.error("Error checking user existence:", error);
      return false;
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // The useEffect will handle the rest
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async (userData) => {
    try {
      // Create/update user with all data
      await updateUser(pendingUser.uid, {
        email: pendingUser.email,
        name: userData.fullName,
        birthday: userData.birthday,
        cohortYear: parseInt(userData.cohortYear),
      });

      localStorage.setItem("user-id", pendingUser.uid);
      setShowOnboarding(false);
      router.replace(redirect);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Failed to complete registration. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#7E0C0E]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center font-montserrat justify-center bg-[#7E0C0E] px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Log In</h1>

          {/* Description */}
          <p className="text-gray-800 mb-8">
            Please log in to register for PPITSZ's events.
          </p>

          {/* Google Login Button */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-600 py-3 font-semibold text-gray-800 hover:bg-gray-100 transition"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span>Login with Google</span>
          </button>
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onCancel={() => {
            setShowOnboarding(false);
            // Sign out the user if they cancel
            import("firebase/auth").then(({ signOut }) => {
              signOut(auth);
            });
            router.push("/login");
          }}
          userEmail={pendingUser?.email}
        />
      )}
    </>
  );
}