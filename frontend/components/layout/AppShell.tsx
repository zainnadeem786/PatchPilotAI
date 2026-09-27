"use client";

import React, { useState } from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PlatformStatsProvider } from "@/context/PlatformStatsContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ConnectRepoModal } from "@/components/repository/ConnectRepoModal";

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  return (
    <ThemeProvider>
      <PlatformStatsProvider>
        <div className="flex min-h-screen bg-cream-50 text-charcoal-900 dark:bg-[#090d16] dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-150">
          {/* Sidebar Navigation */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main Workspace Area */}
          <div className="flex flex-1 flex-col min-w-0">
            <Header
              onOpenSidebar={() => setSidebarOpen(true)}
              onOpenConnectModal={() => setConnectModalOpen(true)}
            />

            <main className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>

          {/* Global Connect Repository Modal */}
          <ConnectRepoModal
            isOpen={connectModalOpen}
            onClose={() => setConnectModalOpen(false)}
          />
        </div>
      </PlatformStatsProvider>
    </ThemeProvider>
  );
};
