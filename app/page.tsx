'use client';

import React, { useEffect } from 'react';
import { Header, GameModal, ServerIncidentBanner } from '@/components/game';
import { Toolbox, ArchitectureCanvas, NodeConfigDrawer } from '@/components/architecture';
import { TelemetrySidebar, BottomPanel } from '@/components/monitoring';
import { useGameStore } from '@/stores/gameStore';

export default function Home() {
  const initGame = useGameStore((s) => s.initGame);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <Header />

      {/* Main Interactive Stage */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Component Toolbox */}
        <Toolbox />

        {/* Center: Interactive Canvas */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          <ServerIncidentBanner />
          <ArchitectureCanvas />
          <NodeConfigDrawer />
        </div>

        {/* Right: Live Telemetry Sidebar */}
        <TelemetrySidebar />
      </div>

      {/* Bottom: Charts & Event Logs */}
      <BottomPanel />

      {/* Postmortem & Milestones Modal Overlay */}
      <GameModal />
    </div>
  );
}
