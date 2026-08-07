import React from 'react';
import { useUiStore } from '@/state/useUiStore';
import { DockWindow } from '@/components/DockWindow';
import { useUniverseStore } from '@/state/useUniverseStore';
import { observeConversation } from '@/core/conversation';
import { generatePersonality } from '@/core/personality';

export function ConversationMonitorPanel() {
  const activeWindows = useUiStore((s) => s.activeWindows);
  const setWindowOpen = useUiStore((s) => s.setWindowOpen);
  const selection = useUniverseStore((s) => s.selection);
  const simTime = useUniverseStore((s) => s.active()?.simTime ?? 0);

  // Mock participants for current selection or general observation
  const personA = { id: 'p_1', name: selection?.label || 'Astraea', occupation: 'Council Elder', age: 42, health: 98, status: 'Alive' as const };
  const personB = { id: 'p_2', name: 'Kaelen', occupation: 'Master Trader', age: 38, health: 95, status: 'Alive' as const };

  const convo = observeConversation(
    personA,
    generatePersonality(personA),
    personB,
    generatePersonality(personB),
    simTime
  );

  return (
    <DockWindow
      id="win_conversation_monitor"
      title="Live Conversation & Mind Monitor"
      isOpen={activeWindows.conversationMonitor}
      onClose={() => setWindowOpen('conversationMonitor', false)}
      defaultPos={{ x: 300, y: 150, w: 420, h: 480 }}
    >
      <div className="flex flex-col gap-3 font-mono text-xs text-space-200">
        <div className="rounded border border-space-700 bg-space-850 p-2">
          <div className="text-[10px] text-space-400 uppercase tracking-wider">Active Topic</div>
          <div className="text-accent-cyan font-bold text-sm mt-0.5">{convo.topic}</div>
          <div className="text-[10px] text-space-400 mt-1">Participants: {personA.name} & {personB.name}</div>
        </div>

        <div className="text-[11px] font-semibold text-space-300 uppercase tracking-wider">Live Observed Dialogue</div>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-64 pr-1">
          {convo.lines.map((line, idx) => (
            <div key={idx} className="rounded border border-space-750 bg-space-900 p-2 flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] text-space-400">
                <span className="font-bold text-space-100">{line.speakerName}</span>
                <span>{line.timestamp}</span>
              </div>
              <div className="text-space-200 italic">"{line.text}"</div>
              <div className="mt-1 text-[10px] text-amber-300/90 bg-amber-950/30 p-1 rounded">
                🧠 Thought: {line.internalThought}
              </div>
              <div className="text-[10px] text-nebula-cyan/90 bg-nebula-cyan/10 p-1 rounded flex justify-between">
                <span>PAD Emotion: {line.emotionalState.descriptor}</span>
                <span>P:{line.emotionalState.pleasure} A:{line.emotionalState.arousal} D:{line.emotionalState.dominance}</span>
              </div>
              <div className="text-[10px] text-space-400 italic">
                Reasoning: {line.decisionReasoning}
              </div>
            </div>
          ))}
        </div>

        {convo.lastingOutcome && (
          <div className="rounded bg-emerald-950/40 border border-emerald-700/50 p-2 text-emerald-300 text-[11px]">
            ⚡ Permanent Outcome: {convo.lastingOutcome}
          </div>
        )}
      </div>
    </DockWindow>
  );
}
