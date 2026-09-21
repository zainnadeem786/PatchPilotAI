import React from "react";
import { HealthStatus } from "@/components/HealthStatus";

export default function Home() {
  const checklist = [
    { name: "Frontend", detail: "Next.js App Router, TypeScript, Tailwind CSS", status: "ready" },
    { name: "FastAPI", detail: "Modular API -> Service -> Data architecture", status: "ready" },
    { name: "Database Layer", detail: "SQLAlchemy Base, Session, Alembic migrations", status: "ready" },
    { name: "Environment Configuration", detail: "Multi-tier .env.example templates", status: "ready" },
    { name: "API Connectivity", detail: "Dedicated /api/health client abstraction", status: "ready" },
  ];

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-4xl mx-auto w-full">
      <div className="w-full space-y-8">
        {/* Minimal Branded Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/50 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            Phase 1 • Foundation
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            PATCHPILOT AI
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 font-medium">
            Agentic Software Engineering
          </p>
        </div>

        {/* Backend Connection Check Interaction */}
        <HealthStatus />

        {/* Phase 1 Architecture Readiness Checklist */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-sm font-semibold tracking-wider text-slate-300 uppercase mb-4">
            Phase 1 Readiness Checklist
          </h2>
          <ul className="space-y-3">
            {checklist.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/60"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-slate-200">{item.name}</span>
                </div>
                <span className="text-xs text-slate-500 hidden sm:inline-block">
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-slate-500">
          PatchPilot AI — Autonomous Patching & Verification Platform (Phase 1 Baseline)
        </div>
      </div>
    </main>
  );
}
