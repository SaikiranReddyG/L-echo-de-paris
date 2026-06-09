import React from "react";

interface ErrorModeToggleProps {
  id?: string;
  errorMode: "strict" | "doux";
  onChange: (mode: "strict" | "doux") => void;
}

export const ErrorModeToggle: React.FC<ErrorModeToggleProps> = ({
  id = "error-mode-toggle",
  errorMode,
  onChange,
}) => {
  return (
    <div
      id={id}
      className="flex items-center border border-[#7B1E2B] rounded-full p-[2px] bg-transparent select-none font-sans"
    >
      <button
        id={`${id}-strict`}
        type="button"
        onClick={() => onChange("strict")}
        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
          errorMode === "strict"
            ? "bg-[#7B1E2B] text-white shadow-sm"
            : "bg-transparent text-[#7B1E2B] hover:bg-[#7b1e2b]/10"
        }`}
      >
        Strict
      </button>
      <button
        id={`${id}-doux`}
        type="button"
        onClick={() => onChange("doux")}
        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
          errorMode === "doux"
            ? "bg-[#7B1E2B] text-white shadow-sm"
            : "bg-transparent text-[#7B1E2B] hover:bg-[#7b1e2b]/10"
        }`}
      >
        Doux
      </button>
    </div>
  );
};
