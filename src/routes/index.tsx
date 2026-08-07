import { createBrowserRouter, Navigate } from 'react-router-dom';
import { WorkspaceRoute } from '@/routes/WorkspaceRoute';

/**
 * Application routes. The engine is a single-page workspace; additional views
 * (docs, standalone experiment replays) can be added as sibling routes in
 * later phases without touching the workspace itself.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <WorkspaceRoute />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
