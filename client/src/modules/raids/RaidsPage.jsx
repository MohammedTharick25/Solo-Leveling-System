import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Play, CheckCircle2, Trash2, ChevronDown, RefreshCw, Repeat } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api.js';
import { useAudio } from '../../hooks/useAudio.js';
import { pageVariants, staggerContainer, staggerItem } from '../../lib/animations.js';
import { SectionHeader, EmptyState, Button, Badge, Modal, DiffBadge, Input } from '../../components/ui/PageLoader.jsx';

const PRIORITY_COLORS = {
  low:'text-slate-400', medium:'text-blue-400', high:'text-yellow-400', critical:'text-red-400',
};
const STATUS_FILTER = ['all','pending','inProgress','completed'];
const FREQ_OPTIONS  = [
  { value:'daily',    label:'Every Day'    },
  { value:'weekdays', label:'Weekdays Only'},
  { value:'weekly',   label:'Weekly'       },
  { value:'monthly',  label:'Monthly'      },
];

export default function RaidsPage() {
  const [tab, setTab]               = useState('raids');
  const [createModal, setCreateModal]   = useState(false);
  const [recurringModal, setRecurringModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const { playQuestComplete } = useAudio();

  const { register: reg,  handleSubmit: hs,  reset: rs,  formState:{errors:e1} } = useForm();
  const { register: regR, handleSubmit: hsR, reset: rsR, formState:{errors:e2} } = useForm({ defaultValues:{recurringFrequency:'daily'} });

  // One-off raids
  const { data, isLoading } = useQuery({
    queryKey: ['raids', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/raids${params}`);
      return data.data;
    },
  });

  // Recurring templates
  const { data: recurringData } = useQuery({
    queryKey: ['raids-recurring'],
    queryFn: async () => { const { data } = await api.get('/raids/recurring'); return data.data; },
    enabled: tab === 'recurring',
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/raids', body),
    onSuccess: () => { setCreateModal(false); rs(); queryClient.invalidateQueries({ queryKey:['raids'] }); },
  });

  const createRecurringMutation = useMutation({
    mutationFn: (body) => api.post('/raids/recurring', body),
    onSuccess: () => {
      setRecurringModal(false); rsR();
      queryClient.invalidateQueries({ queryKey:['raids-recurring'] });
      queryClient.invalidateQueries({ queryKey:['raids'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id) => api.patch(`/raids/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey:['raids'] }),
  });


  const completeMutation = useMutation({
    mutationFn: (id) => api.patch(`/raids/${id}/complete`),
    onSuccess: () => {
      playQuestComplete();
      // This forces the UI to re-fetch the streak and XP immediately
      queryClient.invalidateQueries({ queryKey: ['hunter'] });
      queryClient.invalidateQueries({ queryKey: ['raids'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/raids/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey:['raids'] }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => api.delete(`/raids/recurring/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey:['raids-recurring'] }),
  });

  const raids     = data?.raids || [];
  const templates = recurringData?.templates || [];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-system mb-1">Mission Control</p>
          <h1 className="font-heading font-bold text-2xl text-slate-100">Task Raids</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setRecurringModal(true)}>
            <Repeat size={13} /> Recurring
          </Button>
          <Button variant="primary" onClick={() => setCreateModal(true)}>
            <Plus size={14} /> Create Raid
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{id:'raids',label:'⚔️ Raids'},{id:'recurring',label:'🔁 Recurring'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2 rounded-lg font-heading text-sm font-semibold border transition-all
                        ${tab===t.id?'bg-cyan-500/10 border-cyan-500/40 text-cyan-400':'border-slate-800 text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'raids' ? (
        <>
          {/* Status filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {STATUS_FILTER.map(s=>(
              <button key={s} onClick={()=>setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg font-heading text-xs font-semibold border transition-all
                            ${statusFilter===s?'bg-cyan-500/15 border-cyan-500/40 text-cyan-400':'border-slate-800 text-slate-500 hover:text-slate-300'}`}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-24 rounded-xl"/>)}</div>
          ) : raids.length === 0 ? (
            <EmptyState icon={Target} title="No raids found"
              description="Create a Task Raid to start earning XP for real work."
              action={<Button variant="primary" onClick={()=>setCreateModal(true)}><Plus size={14}/> Create Raid</Button>}/>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              {raids.map(raid=>(
                <RaidCard key={raid._id} raid={raid}
                  onStart={()=>startMutation.mutate(raid._id)}
                  onComplete={()=>completeMutation.mutate(raid._id)}
                  onDelete={()=>deleteMutation.mutate(raid._id)}/>
              ))}
            </motion.div>
          )}
        </>
      ) : (
        /* Recurring tab */
        <div className="space-y-4">
          {templates.length === 0 ? (
            <EmptyState icon={Repeat} title="No recurring raids"
              description="Create recurring raids for tasks you do every day, weekday, or weekly."
              action={<Button variant="secondary" onClick={()=>setRecurringModal(true)}><Repeat size={14}/> Create Recurring</Button>}/>
          ) : (
            <div className="space-y-3">
              {templates.map(t=>(
                <motion.div key={t._id} variants={staggerItem}
                  className="glass rounded-xl p-4 flex items-center gap-4 border border-purple-500/20">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30
                                  flex items-center justify-center shrink-0">
                    <Repeat size={16} className="text-purple-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-heading font-bold text-sm text-slate-200">{t.title}</p>
                      <DiffBadge diff={t.difficulty}/>
                      <Badge color="purple">{t.recurringFrequency}</Badge>
                    </div>
                    <p className="font-body text-xs text-slate-500">
                      +{t.xpReward} XP · {t.category}
                      {t.lastGeneratedAt && ` · Last generated: ${new Date(t.lastGeneratedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button onClick={()=>deleteTemplateMutation.mutate(t._id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1.5 shrink-0">
                    <Trash2 size={14}/>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={()=>setRecurringModal(true)}>
            <Plus size={14}/> Add Recurring Raid
          </Button>
        </div>
      )}

      {/* Create one-off modal */}
      <Modal open={createModal} onClose={()=>{setCreateModal(false);rs();}} title="Create Task Raid">
        <form onSubmit={hs(d=>createMutation.mutate(d))} className="space-y-4">
          <Input label="Title" placeholder="Finish project proposal"
            error={e1.title?.message} {...reg('title',{required:'Title required'})}/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Difficulty</label>
              <select className="input" {...reg('difficulty')}>
                {['F','E','D','C','B','A','S'].map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Priority</label>
              <select className="input" {...reg('priority')}>
                {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Category</label>
              <select className="input" {...reg('category')}>
                {['work','study','project','reading','fitness','personal','creative','communication','other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Est. Minutes" type="number" placeholder="30" {...reg('estimatedMinutes',{valueAsNumber:true})}/>
          </div>
          <div>
            <label className="input-label">Due Date (optional)</label>
            <input type="datetime-local" className="input" {...reg('dueAt')}/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={()=>{setCreateModal(false);rs();}}>Cancel</Button>
            <Button variant="primary" type="submit" loading={createMutation.isPending}>Create Raid</Button>
          </div>
        </form>
      </Modal>

      {/* Create recurring modal */}
      <Modal open={recurringModal} onClose={()=>{setRecurringModal(false);rsR();}} title="Create Recurring Raid">
        <form onSubmit={hsR(d=>createRecurringMutation.mutate(d))} className="space-y-4">
          <p className="font-body text-xs text-slate-500">
            Recurring raids auto-generate a fresh task instance each time they are due.
          </p>
          <Input label="Title" placeholder="Morning workout, Daily standup…"
            error={e2.title?.message} {...regR('title',{required:'Title required'})}/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Frequency</label>
              <select className="input" {...regR('recurringFrequency')}>
                {FREQ_OPTIONS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Difficulty</label>
              <select className="input" {...regR('difficulty')}>
                {['F','E','D','C','B','A','S'].map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Priority</label>
              <select className="input" {...regR('priority')}>
                {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Category</label>
              <select className="input" {...regR('category')}>
                {['work','study','project','reading','fitness','personal','creative','communication','other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={()=>{setRecurringModal(false);rsR();}}>Cancel</Button>
            <Button variant="secondary" type="submit" loading={createRecurringMutation.isPending}>
              <Repeat size={14}/> Create Recurring
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

function RaidCard({ raid, onStart, onComplete, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const STATUS_BADGE = {
    pending:    { color:'slate',   label:'Pending'     },
    inProgress: { color:'cyan',    label:'In Progress' },
    completed:  { color:'emerald', label:'Completed'   },
    failed:     { color:'red',     label:'Failed'      },
  };
  const badge = STATUS_BADGE[raid.status] || STATUS_BADGE.pending;
  const isRecurringInstance = !!raid.parentRaidId;

  return (
    <motion.div variants={staggerItem} className="glass rounded-xl overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className={`w-1 self-stretch rounded-full shrink-0 ${
          raid.priority==='critical'?'bg-red-500':raid.priority==='high'?'bg-yellow-500':raid.priority==='medium'?'bg-blue-500':'bg-slate-600'
        }`}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-heading font-bold text-sm text-slate-100">{raid.title}</h4>
            <DiffBadge diff={raid.difficulty}/>
            {isRecurringInstance && <Badge color="purple"><Repeat size={9} className="inline mr-0.5"/>Recurring</Badge>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge color={badge.color}>{badge.label}</Badge>
            <span className={`font-heading text-xs font-semibold ${PRIORITY_COLORS[raid.priority]}`}>{raid.priority}</span>
            <span className="font-body text-xs text-slate-500">{raid.category}</span>
            <span className="font-display text-xs text-yellow-400">+{raid.xpReward} XP</span>
          </div>
          {raid.dueAt && (
            <p className="font-body text-xs text-slate-500 mt-1">
              Due: {new Date(raid.dueAt).toLocaleString()}
              {new Date(raid.dueAt) < new Date() && raid.status !== 'completed' && (
                <span className="text-red-400 ml-2">⚠️ Overdue</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {raid.status==='pending' && <Button size="sm" variant="secondary" onClick={onStart}><Play size={12}/> Start</Button>}
          {(raid.status==='pending'||raid.status==='inProgress') && <Button size="sm" variant="primary" onClick={onComplete}><CheckCircle2 size={12}/> Done</Button>}
          {raid.status==='pending' && <button onClick={onDelete} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
          {raid.subtasks?.length > 0 && (
            <button onClick={()=>setExpanded(v=>!v)} className="p-1.5 text-slate-500 hover:text-slate-300">
              <ChevronDown size={14} className={`transition-transform ${expanded?'rotate-180':''}`}/>
            </button>
          )}
        </div>
      </div>
      {expanded && raid.subtasks?.length > 0 && (
        <div className="px-6 pb-4 space-y-2 border-t border-slate-800/60 pt-3">
          {raid.subtasks.map(sub=>(
            <div key={sub._id} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded border ${sub.completed?'bg-emerald-500 border-emerald-500':'border-slate-600'}`}/>
              <span className={`font-body text-xs ${sub.completed?'line-through text-slate-500':'text-slate-300'}`}>{sub.title}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}