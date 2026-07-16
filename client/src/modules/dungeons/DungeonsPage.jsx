import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Castle, CheckCircle2, Play, X } from 'lucide-react';
import api from '../../lib/api.js';
import { useAudio } from '../../hooks/useAudio.js';
import { pageVariants, staggerContainer, staggerItem } from '../../lib/animations.js';
import { SectionHeader, EmptyState, Button, Badge, Modal } from '../../components/ui/PageLoader.jsx';
import { useState } from 'react';

const DUNGEON_TYPES = [
  { type: 'study',         name: 'Library of Forgotten Knowledge', emoji: '📚', diff: 'C', color: 'border-indigo-500/40' },
  { type: 'reading',       name: 'The Infinite Archive',           emoji: '📖', diff: 'D', color: 'border-blue-500/40' },
  { type: 'coding',        name: 'Algorithm Labyrinth',            emoji: '💻', diff: 'B', color: 'border-cyan-500/40' },
  { type: 'fitness',       name: 'The Iron Fortress',              emoji: '💪', diff: 'C', color: 'border-emerald-500/40' },
  { type: 'deepWork',      name: 'Sanctum of Silence',             emoji: '🧠', diff: 'A', color: 'border-purple-500/40' },
  { type: 'discipline',    name: 'Trial of Will',                  emoji: '🛡️', diff: 'B', color: 'border-violet-500/40' },
  { type: 'leadership',    name: "Commander's Keep",               emoji: '👑', diff: 'A', color: 'border-red-500/40' },
  { type: 'communication', name: 'Arena of Words',                 emoji: '💬', diff: 'C', color: 'border-pink-500/40' },
];

export default function DungeonsPage() {
  const [enterModal, setEnterModal] = useState(false);
  const queryClient = useQueryClient();
  const { playQuestComplete } = useAudio();

  const { data, isLoading } = useQuery({
    queryKey: ['dungeons'],
    queryFn: async () => { const { data } = await api.get('/dungeons'); return data.data; },
  });

  const enterMutation = useMutation({
    mutationFn: (type) => api.post('/dungeons/enter', { type }),
    onSuccess: () => {
      setEnterModal(false);
      queryClient.invalidateQueries({ queryKey: ['dungeons'] });
    },
  });

  const challengeMutation = useMutation({
    mutationFn: ({ dungeonId, challengeId }) =>
      api.patch(`/dungeons/${dungeonId}/challenges/${challengeId}/complete`),
    onSuccess: (res) => {
      if (res.data.data.dungeon?.status === 'completed') playQuestComplete();
      queryClient.invalidateQueries({ queryKey: ['dungeons'] });
      queryClient.invalidateQueries({ queryKey: ['hunter'] });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: (id) => api.patch(`/dungeons/${id}/abandon`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dungeons'] }),
  });

  const activeDungeons = data?.active || [];
  const history = data?.history || [];
  const hasActive = activeDungeons.length > 0;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-system mb-1">Challenge Mode</p>
          <h1 className="font-heading font-bold text-2xl text-slate-100">Dungeons</h1>
          <p className="font-body text-sm text-slate-500 mt-1">
            Enter a dungeon and complete its full challenge chain for maximum rewards.
          </p>
        </div>
        {!hasActive && (
          <Button variant="primary" onClick={() => setEnterModal(true)}>
            <Castle size={14} /> Enter Dungeon
          </Button>
        )}
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-8">

        {/* Active dungeon */}
        <motion.div variants={staggerItem}>
          <SectionHeader label="Active Raid" title="Current Dungeon" />
          {isLoading ? (
            <div className="skeleton h-64 rounded-2xl" />
          ) : activeDungeons.length === 0 ? (
            <EmptyState
              icon={Castle}
              title="No active dungeon"
              description="Enter a dungeon to begin a challenge chain."
              action={<Button variant="primary" onClick={() => setEnterModal(true)}>Enter Dungeon</Button>}
            />
          ) : (
            activeDungeons.map((dungeon) => (
              <ActiveDungeonCard
                key={dungeon._id}
                dungeon={dungeon}
                onChallengeComplete={(cId) => challengeMutation.mutate({ dungeonId: dungeon._id, challengeId: cId })}
                onAbandon={() => abandonMutation.mutate(dungeon._id)}
                completing={challengeMutation.isPending}
              />
            ))
          )}
        </motion.div>

        {/* History */}
        {history.length > 0 && (
          <motion.div variants={staggerItem}>
            <SectionHeader label="Past Raids" title="Dungeon History" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((d) => (
                <div key={d._id} className="glass rounded-xl p-4 flex items-center gap-3">
                  <span className="text-2xl">{DUNGEON_TYPES.find((t) => t.type === d.type)?.emoji || '🏰'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-semibold text-slate-200 truncate">{d.name}</p>
                    <p className="font-body text-xs text-slate-500">
                      {d.status === 'completed' ? '✅ Cleared' : '❌ Abandoned'} ·{' '}
                      {d.earnedXP} XP earned
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Enter modal */}
      <Modal open={enterModal} onClose={() => setEnterModal(false)} title="Select Dungeon" maxWidth="max-w-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DUNGEON_TYPES.map((dt) => (
            <button
              key={dt.type}
              onClick={() => enterMutation.mutate(dt.type)}
              disabled={enterMutation.isPending}
              className={`glass rounded-xl p-4 flex flex-col items-center gap-2 text-center
                          border ${dt.color} hover:bg-slate-800/40 transition-all duration-200
                          active:scale-95 disabled:opacity-50`}
            >
              <span className="text-3xl">{dt.emoji}</span>
              <p className="font-heading text-xs font-semibold text-slate-300 leading-tight">{dt.name}</p>
              <span className={`font-display text-[10px] tracking-widest diff-${dt.diff}`}>[{dt.diff}]</span>
            </button>
          ))}
        </div>
      </Modal>
    </motion.div>
  );
}

function ActiveDungeonCard({ dungeon, onChallengeComplete, onAbandon, completing }) {
  const completedCount = dungeon.challenges.filter((c) => c.completed).length;
  const totalCount = dungeon.challenges.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="glass rounded-2xl border border-purple-500/30 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-purple-950/40 to-slate-900/40 border-b border-purple-500/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge color="purple" className="mb-2">{dungeon.difficulty} RANK DUNGEON</Badge>
            <h3 className="font-heading font-bold text-lg text-slate-100 mb-1">{dungeon.name}</h3>
            <p className="font-body text-sm text-slate-400">{dungeon.description}</p>
          </div>
          <button onClick={onAbandon} className="text-slate-600 hover:text-red-400 transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-hud">Progress {completedCount}/{totalCount}</span>
            <span className="font-display text-xs text-purple-400">{dungeon.earnedXP}/{dungeon.totalXP} XP</span>
          </div>
          <div className="h-2 bg-slate-900/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {dungeon.challenges.map((c, i) => (
          <div
            key={c._id}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all
                        ${c.completed
                          ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                          : 'bg-slate-800/30 border-slate-700/40'}`}
          >
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0
                              ${c.completed ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-600'}`}>
              {c.completed
                ? <CheckCircle2 size={13} className="text-emerald-400" />
                : <span className="font-display text-[10px] text-slate-500">{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-heading text-sm font-semibold ${c.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {c.title}
              </p>
              <p className="font-display text-[10px] text-yellow-400 mt-0.5">+{c.xpReward} XP</p>
            </div>
            {!c.completed && (
              <Button size="sm" variant="secondary" loading={completing} onClick={() => onChallengeComplete(c._id)}>
                <Play size={12} /> Done
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}