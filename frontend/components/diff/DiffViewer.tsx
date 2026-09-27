"use client";

import React, { useState } from "react";
import { PatchFile } from "@/types/domain";
import { CopyIcon, CheckIcon } from "@/components/icons";

export interface DiffViewerProps {
  files: PatchFile[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ files }) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = files[activeFileIndex] || files[0];

  const handleCopy = () => {
    if (activeFile?.unifiedDiff) {
      navigator.clipboard.writeText(activeFile.unifiedDiff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!files || files.length === 0) {
    return (
      <div className="p-6 text-center text-charcoal-400 dark:text-slate-500 font-mono text-xs border border-cream-300 dark:border-slate-800 rounded-lg">
        No modified files found in patch diff.
      </div>
    );
  }

  const lines = activeFile.unifiedDiff.split("\n");

  return (
    <div className="rounded-lg border border-cream-300 dark:border-slate-800 bg-cream-50 dark:bg-slate-900 overflow-hidden shadow-xs">
      {/* File Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cream-300 dark:border-slate-800/80 bg-cream-100 dark:bg-slate-950/80 px-3.5 py-2 gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {files.map((file, idx) => (
            <button
              key={file.filename}
              onClick={() => setActiveFileIndex(idx)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors duration-150 whitespace-nowrap ${
                activeFileIndex === idx
                  ? "bg-cream-50 dark:bg-slate-800 text-charcoal-900 dark:text-slate-100 border border-cream-300 dark:border-slate-700 font-semibold"
                  : "text-charcoal-500 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200 dark:hover:bg-slate-900"
              }`}
            >
              <span>{file.filename}</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">+{file.additions}</span>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">-{file.deletions}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-charcoal-600 dark:text-slate-400 hover:text-charcoal-900 dark:hover:text-slate-200 hover:bg-cream-200 dark:hover:bg-slate-800 rounded transition-colors duration-150 self-end sm:self-auto border border-cream-300 dark:border-slate-800"
          title="Copy raw unified diff"
        >
          {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy Diff"}</span>
        </button>
      </div>

      {/* Diff Code Container with horizontal scrolling */}
      <div className="overflow-x-auto max-h-[560px] font-mono text-xs leading-relaxed p-2 bg-[#0d1117] text-slate-200">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isAddition = line.startsWith("+") && !line.startsWith("+++");
              const isDeletion = line.startsWith("-") && !line.startsWith("---");
              const isHeader = line.startsWith("@@");

              let rowClass = "text-slate-300 hover:bg-slate-800/30";
              let prefixClass = "text-slate-600 select-none";

              if (isAddition) {
                rowClass = "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60";
                prefixClass = "text-emerald-500 font-bold select-none";
              } else if (isDeletion) {
                rowClass = "bg-rose-950/40 text-rose-300 hover:bg-rose-950/60";
                prefixClass = "text-rose-500 font-bold select-none";
              } else if (isHeader) {
                rowClass = "bg-indigo-950/30 text-indigo-300/80 italic";
                prefixClass = "text-indigo-400 select-none";
              }

              return (
                <tr key={idx} className={`${rowClass} transition-colors duration-75`}>
                  <td className="w-10 px-2 py-0.5 text-right text-[11px] text-slate-600 select-none border-r border-slate-800/60 font-mono">
                    {idx + 1}
                  </td>
                  <td className="w-5 px-1 py-0.5 text-center font-mono">
                    <span className={prefixClass}>{isAddition ? "+" : isDeletion ? "-" : " "}</span>
                  </td>
                  <td className="px-2.5 py-0.5 whitespace-pre font-mono">
                    {line.slice(isAddition || isDeletion ? 1 : 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
