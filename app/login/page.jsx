'use client'

import Header from "../components/Header_first";
import { useState } from "react";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login submitted:', formData);
  };

  return (
    <div className="min-h-screen bg-gray-500 flex flex-col">
      
      {/* Header Navigation */}
      <Header />

      {/* Login Form Container */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-sm">
          <h1 className="text-white text-2xl font-light text-center mb-8">
            Log in
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email Input */}
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600 transition"
            />

            {/* Password Input */}
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-gray-800 text-gray-400 placeholder-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-600 transition"
            />

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-100 transition"
            >
              Log In
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
