import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useHunterStore } from '../stores/hunterStore.js';
import AppShell from '../components/layout/AppShell.jsx';
import { PageLoader } from '../components/ui/PageLoader.jsx';
import ErrorBoundary from '../components/ui/ErrorBoundary.jsx';
import LoginPage     from '../modules/auth/LoginPage.jsx';
import RegisterPage  from '../modules/auth/RegisterPage.jsx';
import AwakeningPage from '../modules/auth/AwakeningPage.jsx';

const DashboardPage       = lazy(() => import('../modules/dashboard/DashboardPage.jsx'));
const HunterPage          = lazy(() => import('../modules/hunter/HunterPage.jsx'));
const PublicHunterProfile = lazy(() => import('../modules/hunter/PublicHunterProfile.jsx'));
const QuestsPage          = lazy(() => import('../modules/quests/QuestsPage.jsx'));
const ShadowsPage         = lazy(() => import('../modules/shadows/ShadowsPage.jsx'));
const BossesPage          = lazy(() => import('../modules/bosses/BossesPage.jsx'));
const DungeonsPage        = lazy(() => import('../modules/dungeons/DungeonsPage.jsx'));
const PomodoroPage        = lazy(() => import('../modules/pomodoro/PomodoroPage.jsx'));
const RaidsPage           = lazy(() => import('../modules/raids/RaidsPage.jsx'));
const HabitsPage          = lazy(() => import('../modules/habits/HabitsPage.jsx'));
const JournalPage         = lazy(() => import('../modules/journal/JournalPage.jsx'));
const BrainPage           = lazy(() => import('../modules/brain/BrainPage.jsx'));
const AnalyticsPage       = lazy(() => import('../modules/analytics/AnalyticsPage.jsx'));
const AchievementsPage    = lazy(() => import('../modules/achievements/AchievementsPage.jsx'));
const SocialPage          = lazy(() => import('../modules/social/SocialPage.jsx'));
const CalendarPage        = lazy(() => import('../modules/calendar/CalendarPage.jsx'));
const SettingsPage        = lazy(() => import('../modules/settings/SettingsPage.jsx'));

const ProtectedRoute = ({ children }) => {
  const { token, user } = useHunterStore();
  if (!token) return <Navigate to="/login" replace />;
  if (token && user && !user.isAwakened) return <Navigate to="/awakening" replace />;
  return children;
};
const AuthRoute = ({ children }) => {
  const { token } = useHunterStore();
  return token ? <Navigate to="/dashboard" replace /> : children;
};
const Wrap = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
);

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login"      element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register"   element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/awakening"  element={<AwakeningPage />} />
      <Route path="/h/:hunterId" element={<Wrap><PublicHunterProfile /></Wrap>} />

      <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Wrap><DashboardPage /></Wrap>} />
        <Route path="hunter"       element={<Wrap><HunterPage /></Wrap>} />
        <Route path="quests"       element={<Wrap><QuestsPage /></Wrap>} />
        <Route path="shadows"      element={<Wrap><ShadowsPage /></Wrap>} />
        <Route path="bosses"       element={<Wrap><BossesPage /></Wrap>} />
        <Route path="dungeons"     element={<Wrap><DungeonsPage /></Wrap>} />
        <Route path="focus"        element={<Wrap><PomodoroPage /></Wrap>} />
        <Route path="raids"        element={<Wrap><RaidsPage /></Wrap>} />
        <Route path="habits"       element={<Wrap><HabitsPage /></Wrap>} />
        <Route path="journal"      element={<Wrap><JournalPage /></Wrap>} />
        <Route path="brain"        element={<Wrap><BrainPage /></Wrap>} />
        <Route path="analytics"    element={<Wrap><AnalyticsPage /></Wrap>} />
        <Route path="achievements" element={<Wrap><AchievementsPage /></Wrap>} />
        <Route path="social"       element={<Wrap><SocialPage /></Wrap>} />
        <Route path="calendar"     element={<Wrap><CalendarPage /></Wrap>} />
        <Route path="settings"     element={<Wrap><SettingsPage /></Wrap>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}