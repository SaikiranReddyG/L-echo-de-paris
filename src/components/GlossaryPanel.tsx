/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BookOpen } from "lucide-react";
import { GlossaryEntry } from "../types";

export const parseGlossaryStr = (glossaryStr: string): GlossaryEntry[] => {
  const glossaryLines = glossaryStr
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return glossaryLines.map(line => {
    const match = line.match(/^([^(]+)\s*\(([^)]+)\)\s*(?:[-—–]\s*(.*))?$/);
    if (match) {
      return {
        french: match[1].trim(),
        english: match[2].trim(),
        example: match[3] ? match[3].trim() : undefined
      };
    } else {
      return {
        french: "",
        english: "",
        raw: line
      };
    }
  });
};

interface GlossaryPanelProps {
  entries: GlossaryEntry[];
  visible: boolean;
  onToggle: () => void;
  currentTargetWord: string;
}

export const GlossaryPanel: React.FC<GlossaryPanelProps> = ({
  entries,
  visible,
  onToggle,
  currentTargetWord
}) => {
  if (!visible || !entries || entries.length === 0) return null;

  const isMany = entries.length > 16;
  const frenchSize = isMany ? "text-xs" : "text-base";
  const englishSize = isMany ? "text-[11px]" : "text-sm";
  const exampleSize = isMany ? "text-[11px]" : "text-sm";
  const pyClass = isMany ? "py-1.5" : "py-3";

  return (
    <div id="lesson-glossary-panel" className="w-full lg:w-[420px] lg:max-w-[35%] flex-shrink-0 bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col gap-4 h-fit select-none text-zinc-300 font-sans shadow-lg relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/40 animate-pulse" />
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400 font-bold" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Glossaire</span>
        </div>
        <button 
          onClick={onToggle}
          className="text-zinc-500 hover:text-white transition-colors text-xs font-bold bg-white/5 hover:bg-white/10 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
          title="Fermer"
        >
          ✕
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-x-5 gap-y-0">
        {entries.map((item, idx) => {
          const isHighlighted = item.french && currentTargetWord.toLowerCase().includes(item.french.toLowerCase());

          if (item.raw) {
            return (
              <div 
                key={idx}
                className={`${pyClass} px-1.5 border-b border-white/5 text-xs leading-relaxed transition-all duration-300 col-span-2 sm:col-span-1 overflow-hidden ${
                  isHighlighted 
                    ? "bg-blue-500/10 text-white font-medium rounded-xl px-2.5" 
                    : "text-zinc-400"
                }`}
              >
                <span className="truncate block" title={item.raw}>{item.raw}</span>
              </div>
            );
          }

          return (
            <div 
              key={idx}
              className={`${pyClass} px-1.5 border-b border-white/5 flex flex-col gap-0.5 transition-all duration-300 col-span-2 sm:col-span-1 overflow-hidden ${
                isHighlighted 
                  ? "bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)] rounded-xl px-2.5 scale-[1.01]" 
                  : "hover:bg-white/[0.01]"
              }`}
            >
              <div className="flex items-baseline gap-1 flex-row overflow-hidden w-full">
                <span className={`${frenchSize} font-bold select-text shrink-0 ${isHighlighted ? "text-blue-300" : "text-white"}`}>
                  {item.french}
                </span>
                <span className="text-zinc-600 font-medium text-[10px] shrink-0">·</span>
                <span className={`${englishSize} text-zinc-400 font-normal truncate select-text`} title={item.english}>
                  {item.english}
                </span>
              </div>
              {item.example && (
                <span className={`${exampleSize} text-zinc-500 italic leading-snug truncate block select-text`} title={item.example}>
                  {item.example}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
