import React, { useState } from "react";

export default function ChatPromptBox({ onGenerate }) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="p-4 bg-gray-200 border-t border-gray-300 flex items-center">
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && prompt.trim() && onGenerate(prompt)}
        placeholder="Describe the app you want to build..."
        className="flex-1 p-2 border border-gray-400 rounded-lg"
      />
      <button
        onClick={() => prompt.trim() && onGenerate(prompt)}
        className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Generate
      </button>
    </div>
  );
}
