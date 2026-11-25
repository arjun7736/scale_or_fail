'use client';

import React, { useState } from 'react';
import { useArchitectureStore } from '@/stores/architectureStore';
import { useGameStore } from '@/stores/gameStore';
import { checkComponentLimit } from '@/packages/simulation/models/limits';
import { TOOLBOX_ITEMS, ToolboxItem } from './toolbox/toolbox-catalog';
import { ToolboxRail } from './toolbox/ToolboxRail';
import { ToolboxCard } from './toolbox/ToolboxCard';
import { ToolboxHeader } from './toolbox/ToolboxHeader';

export { TOOLBOX_ITEMS };
export type { ToolboxItem };

export function Toolbox() {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastAddedTitle, setLastAddedTitle] = useState<string | null>(null);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const isToolboxOpen = useGameStore((s) => s.isToolboxOpen);
  const isToolboxRail = useGameStore((s) => s.isToolboxRail);
  const toggleToolbox = useGameStore((s) => s.toggleToolbox);
  const toggleToolboxRail = useGameStore((s) => s.toggleToolboxRail);

  const nodes = useArchitectureStore((s) => s.nodes);
  const addNode = useArchitectureStore((s) => s.addNode);
  const syncGraph = useGameStore((s) => s.syncGraph);
  const currentStage = useGameStore((s) => s.systemMetrics.stage || 1);
  const currentStageName = useGameStore((s) => s.systemMetrics.stageName || 'Startup');

  if (!isToolboxOpen) return null;

  const handleDragStart = (e: React.DragEvent, item: ToolboxItem) => {
    if (currentStage < item.unlockStage) {
      e.preventDefault();
      return;
    }
    let transferId = item.id;
    if (item.id === 'database') {
      const primaryLimit = checkComponentLimit(nodes, 'database', 'database');
      if (!primaryLimit.allowed) {
        // Primary already deployed; automatically route drag to deploy Read Replica
        transferId = 'db_replica';
      }
    } else {
      const limitCheck = checkComponentLimit(nodes, item.id, item.type);
      if (!limitCheck.allowed) {
        e.preventDefault();
        setLimitWarning(limitCheck.reason || `Only 1 ${item.title} allowed in topology.`);
        setTimeout(() => setLimitWarning(null), 3500);
        return;
      }
    }
    e.dataTransfer.setData('application/scale-or-fail-type', item.type);
    e.dataTransfer.setData('application/scale-or-fail-id', transferId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (item: ToolboxItem) => {
    if (currentStage < item.unlockStage) return;

    let targetItemId = item.id;
    let targetTitle = item.title;

    if (item.id === 'database') {
      const primaryLimit = checkComponentLimit(nodes, 'database', 'database');
      if (!primaryLimit.allowed) {
        // Route to Read Replica
        targetItemId = 'db_replica';
        targetTitle = 'Read Replica DB';
      }
    } else {
      const limitCheck = checkComponentLimit(nodes, item.id, item.type);
      if (!limitCheck.allowed) {
        setLimitWarning(limitCheck.reason || `Only 1 ${item.title} allowed in topology.`);
        setTimeout(() => setLimitWarning(null), 3500);
        return;
      }
    }

    // Calculate a slightly randomized center offset for mobile / click deploy
    const offset = (Math.random() - 0.5) * 60;
    const added = addNode(item.type, { x: 260 + offset, y: 160 + offset }, targetItemId);
    if (added) {
      setTimeout(() => syncGraph(), 50);
      setLastAddedTitle(targetTitle);
      setTimeout(() => setLastAddedTitle(null), 2000);
    }
  };

  const unlockedCount = TOOLBOX_ITEMS.filter((i) => currentStage >= i.unlockStage).length;
  const lockedCount = TOOLBOX_ITEMS.length - unlockedCount;

  const filteredItems = TOOLBOX_ITEMS.filter((item) => {
    if (filter === 'unlocked' && currentStage < item.unlockStage) return false;
    if (filter === 'locked' && currentStage >= item.unlockStage) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop Overlay - closes on tap outside */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        onClick={toggleToolbox}
      />

      {/* COMPACT ICON RAIL MODE */}
      {isToolboxRail ? (
        <ToolboxRail
          currentStage={currentStage}
          nodes={nodes}
          onToggleRail={toggleToolboxRail}
          onDragStart={handleDragStart}
          onQuickAdd={handleQuickAdd}
        />
      ) : (
        /* FULL COMPACT DRAWER MODE */
        <div className="fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col h-full bg-slate-900/98 md:bg-slate-900/95 border-r border-slate-800/80 w-72 max-w-[85vw] select-none shrink-0 shadow-2xl md:shadow-none animate-in slide-in-from-left duration-200">
          {/* Header */}
          <ToolboxHeader
            currentStage={currentStage}
            filter={filter}
            searchQuery={searchQuery}
            limitWarning={limitWarning}
            lastAddedTitle={lastAddedTitle}
            unlockedCount={unlockedCount}
            lockedCount={lockedCount}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
            onToggleRail={toggleToolboxRail}
            onClose={toggleToolbox}
          />

          {/* Component Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredItems.map((item) => (
              <ToolboxCard
                key={item.id}
                item={item}
                currentStage={currentStage}
                nodes={nodes}
                onDragStart={handleDragStart}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span className="text-slate-500 truncate">Stage {currentStage}: {currentStageName}</span>
            <button
              onClick={toggleToolbox}
              className="text-teal-400 hover:underline text-[10px] md:hidden cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
