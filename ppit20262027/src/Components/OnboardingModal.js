"use client";

import { useState } from "react";

export default function OnboardingModal({ onComplete, onCancel, userEmail }) {
  const [formData, setFormData] = useState({
    fullName: "",
    birthday: "",
    cohortYear: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    if (!formData.birthday) {
      newErrors.birthday = "Birthday is required";
    } else {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 10 || age > 100) {
        newErrors.birthday = "Please enter a valid birthday (age 10-100)";
      }
    }
    
    if (!formData.cohortYear) {
      newErrors.cohortYear = "Intake year is required";
    } else {
      const year = parseInt(formData.cohortYear);
      const currentYear = new Date().getFullYear();
      if (year < 2000 || year > currentYear + 1) {
        newErrors.cohortYear = `Please enter a valid year (2000-${currentYear + 1})`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      onComplete(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Generate year options (2000 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYear; year >= 2023; year--) {
    yearOptions.push(year);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
          <p className="text-gray-600 text-sm mt-1">
            Welcome! Please provide your details to get started.
          </p>
          {userEmail && (
            <p className="text-xs text-gray-500 mt-2">
              Signed in as: <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.fullName ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
            />
            {errors.fullName && (
              <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birthday <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.birthday ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.birthday && (
              <p className="text-red-500 text-xs mt-1">{errors.birthday}</p>
            )}
          </div>

          {/* Cohort Year / Intake Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intake / Cohort Year <span className="text-red-500">*</span>
            </label>
            <select
              name="cohortYear"
              value={formData.cohortYear}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cohortYear ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="">Select your intake year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {errors.cohortYear && (
              <p className="text-red-500 text-xs mt-1">{errors.cohortYear}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">The year you joined the program.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Complete Registration"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}