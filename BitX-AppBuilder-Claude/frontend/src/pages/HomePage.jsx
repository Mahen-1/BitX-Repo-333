import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-6">🚀 BitX App Builder</h1>
      <p className="mb-6 text-lg text-gray-300">Generate & Deploy full-stack apps in minutes</p>
      <button
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg transition"
        onClick={() => navigate("/generate")}
      >
        Get Started
      </button>
    </div>
  );
}
