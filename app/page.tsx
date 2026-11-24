'use client';

import React, { useEffect } from 'react';
import { Header } from '@/components/game/Header';
import { Toolbox } from '@/components/architecture/Toolbox';
import { ArchitectureCanvas } from '@/components/architecture/ArchitectureCanvas';
import { NodeConfigDrawer } from '@/components/architecture/NodeConfigDrawer';
import { TelemetrySidebar } from '@/components/monitoring/TelemetrySidebar';
import { BottomPanel } from '@/components/monitoring/BottomPanel';
import { GameModal } from '@/components/game/GameModal';
import { ServerIncidentBanner } from '@/components/game/ServerIncidentBanner';
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
