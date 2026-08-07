import { ReactNode, Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { WorkspaceRoute } from '@/routes/WorkspaceRoute';
import { AppShell } from '@/layout/AppShell';
import { BootScreen } from '@/components/BootScreen';

const UniverseInspectorPage = lazy(() =>
  import('@/routes/UniverseInspectorPage').then((m) => ({ default: m.UniverseInspectorPage }))
);
const GodHubPage = lazy(() =>
  import('@/routes/GodHubPage').then((m) => ({ default: m.GodHubPage }))
);
const TimelineViewPage = lazy(() =>
  import('@/routes/TimelineViewPage').then((m) => ({ default: m.TimelineViewPage }))
);
const QuantumViewPage = lazy(() =>
  import('@/routes/QuantumViewPage').then((m) => ({ default: m.QuantumViewPage }))
);
const MultiverseViewPage = lazy(() =>
  import('@/routes/MultiverseViewPage').then((m) => ({ default: m.MultiverseViewPage }))
);

const withSuspense = (component: ReactNode) => (
  <Suspense fallback={<BootScreen />}>{component}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WorkspaceRoute />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        path: 'universe',
        element: withSuspense(<UniverseInspectorPage />),
      },
      {
        path: 'god',
        element: withSuspense(<GodHubPage />),
      },
      {
        path: 'god/timeline',
        element: withSuspense(<TimelineViewPage />),
      },
      {
        path: 'god/quantum',
        element: withSuspense(<QuantumViewPage />),
      },
      {
        path: 'god/multiverse',
        element: withSuspense(<MultiverseViewPage />),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
