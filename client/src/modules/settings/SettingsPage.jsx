import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Settings, Lock, FileText, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api.js';
import { pageVariants, staggerContainer, staggerItem } from '../../lib/animations.js';
import { SectionHeader, Button, Card, Input, Badge } from '../../components/ui/PageLoader.jsx';
import { useHunterStore } from '../../stores/hunterStore.js';

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const { user, setUser } = useHunterStore();
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { country: user?.country, timezone: user?.timezone } });
  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { errors: pwErrors } } = useForm();

  const profileMutation = useMutation({
    mutationFn: (body) => api.patch('/users/me', body),
    onSuccess: ({ data }) => { setUser(data.data.user); queryClient.invalidateQueries({ queryKey: ['hunter'] }); },
  });

  const passwordMutation = useMutation({
    mutationFn: (body) => api.patch('/users/me/password', body),
    onSuccess: () => resetPw(),
  });

  const recomputeMutation = useMutation({
    mutationFn: () => api.post('/stats/recompute'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hunter'] }),
  });

  const generateReportMutation = useMutation({
    mutationFn: () => api.post('/reports/generate'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly-report'] }),
  });

  const { data: reportData } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: async () => {
      try { const { data } = await api.get('/reports/weekly'); return data.data; } catch { return null; }
    },
    enabled: tab === 'report',
  });

  const TABS = [
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'report', label: 'Weekly Report', icon: FileText },
    { id: 'system', label: 'System', icon: TrendingUp },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="mb-8">
        <p className="text-system mb-1">Configuration</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">Settings</h1>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading text-sm font-semibold border transition-all
                        ${tab === id ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate">

        {tab === 'profile' && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader label="Account" title="Profile Settings" />
              <form onSubmit={handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4 max-w-md">
                <div>
                  <label className="input-label">Email</label>
                  <input className="input opacity-50 cursor-not-allowed" value={user?.email || ''} disabled />
                </div>
                <div>
                  <label className="input-label">Hunter Name</label>
                  <input className="input opacity-50 cursor-not-allowed" value={user?.hunterName || ''} disabled />
                </div>
                <Input label="Country" placeholder="US" {...register('country')} />
                <div>
                  <label className="input-label">Timezone</label>
                  <input className="input" placeholder="UTC" {...register('timezone')} />
                </div>
                <Button type="submit" variant="primary" loading={profileMutation.isPending}>
                  Save Changes
                </Button>
                {profileMutation.isSuccess && (
                  <p className="font-heading text-sm text-emerald-400">✓ Profile updated</p>
                )}
              </form>
            </Card>
          </motion.div>
        )}

        {tab === 'security' && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader label="Security" title="Change Password" />
              <form onSubmit={handlePw((d) => passwordMutation.mutate(d))} className="space-y-4 max-w-md">
                <div>
                  <label className="input-label">Current Password</label>
                  <input type="password" className="input"
                    {...regPw('currentPassword', { required: 'Required' })} />
                  {pwErrors.currentPassword && <p className="mt-1 text-xs text-red-400">{pwErrors.currentPassword.message}</p>}
                </div>
                <div>
                  <label className="input-label">New Password</label>
                  <input type="password" className="input"
                    {...regPw('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
                  {pwErrors.newPassword && <p className="mt-1 text-xs text-red-400">{pwErrors.newPassword.message}</p>}
                </div>
                <Button type="submit" variant="primary" loading={passwordMutation.isPending}>
                  Update Password
                </Button>
                {passwordMutation.isSuccess && (
                  <p className="font-heading text-sm text-emerald-400">✓ Password updated</p>
                )}
                {passwordMutation.isError && (
                  <p className="font-heading text-sm text-red-400">
                    {passwordMutation.error?.response?.data?.message || 'Failed'}
                  </p>
                )}
              </form>
            </Card>
          </motion.div>
        )}

        {tab === 'report' && (
          <motion.div variants={staggerItem} className="space-y-4">
            <div className="flex justify-end">
              <Button variant="secondary" loading={generateReportMutation.isPending}
                onClick={() => generateReportMutation.mutate()}>
                <FileText size={14} /> Generate This Week's Report
              </Button>
            </div>
            {reportData?.report ? (
              <WeeklyReportCard report={reportData.report} />
            ) : (
              <Card>
                <p className="font-body text-sm text-slate-500 text-center py-8">
                  No report generated yet. Reports are auto-generated every Sunday, or you can generate one now.
                </p>
              </Card>
            )}
          </motion.div>
        )}

        {tab === 'system' && (
          <motion.div variants={staggerItem} className="space-y-4">
            <Card>
              <SectionHeader label="Data Engine" title="System Controls" />
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div>
                    <p className="font-heading font-semibold text-sm text-slate-200 mb-0.5">Recompute Stats</p>
                    <p className="font-body text-xs text-slate-500">
                      Force-recalculate all productivity scores based on recent activity.
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" loading={recomputeMutation.isPending}
                    onClick={() => recomputeMutation.mutate()}>
                    Run
                  </Button>
                </div>
                {recomputeMutation.isSuccess && (
                  <p className="font-heading text-sm text-emerald-400">✓ Stats recomputed successfully</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function WeeklyReportCard({ report }) {
  const trendColor = report.productivityTrend === 'rising' ? 'text-emerald-400'
    : report.productivityTrend === 'declining' ? 'text-red-400' : 'text-yellow-400';

  const handleDownload = () => {
    window.print(); // Browser print generates high-quality PDF if CSS is set
  };

  return (
    <Card>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="font-display text-2xl font-black text-gradient-hero print:text-black">
            HUNTER PROGRESS REPORT
          </h2>
          <p className="font-heading text-slate-500 uppercase tracking-widest text-xs">
            Sector: Performance Intelligence
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          className="print:hidden"
        >
          Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Quest Completion",
            value: `${Math.round((report.questCompletionRate || 0) * 100)}%`,
          },
          {
            label: "Total XP",
            value: (report.totalXPEarned || 0).toLocaleString(),
          },
          {
            label: "Focus Minutes",
            value: `${report.totalFocusMinutes || 0}m`,
          },
          { label: "Streak", value: `${report.streakPerformance || 0}d` },
        ].map(({ label, value }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <p className="text-hud mb-1">{label}</p>
            <p className="font-display text-lg text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="glass rounded-xl p-4">
          <p className="text-hud mb-2">Most Improved</p>
          <p className="font-heading font-semibold text-sm text-emerald-400">
            {report.mostImprovedStat}{" "}
            {report.mostImprovedStatDelta > 0
              ? `+${report.mostImprovedStatDelta}`
              : ""}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-hud mb-2">Suggested Focus</p>
          <p className="font-heading font-semibold text-sm text-yellow-400">
            {report.suggestedFocusArea}
          </p>
        </div>
      </div>

      {report.personalizedRecommendations?.length > 0 && (
        <div>
          <p className="text-hud mb-3">System Recommendations</p>
          <ul className="space-y-2">
            {report.personalizedRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5 shrink-0">→</span>
                <p className="font-body text-sm text-slate-300">{rec}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-6">
        <div className="border-l-2 border-cyan-500 pl-4">
          <h4 className="font-heading font-bold text-slate-200 print:text-black">
            Executive Summary
          </h4>
          <p className="font-body text-sm text-slate-400 mt-2 leading-relaxed">
            Your productivity trend is{" "}
            <span className="text-emerald-400 font-bold uppercase">
              {report.productivityTrend}
            </span>
            . The System has detected major growth in{" "}
            <span className="text-slate-100">{report.mostImprovedStat}</span>.
          </p>
        </div>
      </div>
    </Card>
  );
}