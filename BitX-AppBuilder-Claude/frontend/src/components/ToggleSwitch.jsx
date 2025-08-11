import React from "react";

export default function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-10 h-6 rounded-full ${checked ? "bg-blue-500" : "bg-gray-300"}`}></div>
        <div
          className={`dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition ${
            checked ? "transform translate-x-4" : ""
          }`}
        ></div>
      </div>
      <span className="ml-2 text-white">{label}</span>
    </label>
  );
}
