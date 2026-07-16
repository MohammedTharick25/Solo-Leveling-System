import { useEffect } from 'react';
import AppRouter from './router/AppRouter.jsx';
import { useHunterStore } from './stores/hunterStore.js';
import { useSocket } from './hooks/useSocket.js';
import SystemNotificationOverlay from './components/layout/SystemNotificationOverlay.jsx';
import LevelUpCinematic from './components/animations/LevelUpCinematic.jsx';
import RankUpCinematic from './components/animations/RankUpCinematic.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';

export default function App() {
  const { token } = useHunterStore();
  useSocket();
  return (
    <ErrorBoundary>
      <AppRouter />
      {token && (
        <>
          <SystemNotificationOverlay />
          <LevelUpCinematic />
          <RankUpCinematic />
        </>
      )}
    </ErrorBoundary>
  );
}