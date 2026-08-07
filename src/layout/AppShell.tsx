import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  GalaxyIcon,
  SlidersIcon,
  GitBranchIcon,
  AtomIcon,
  InfinityIcon,
  ArrowLeftIcon,
} from '@/components/icons';

export function AppShell() {
  const location = useLocation();

  const navItems = [
    { to: '/universe', label: 'Universe Inspector', icon: <GalaxyIcon width={18} height={18} /> },
    { to: '/god', label: 'God Mode Hub', icon: <SlidersIcon width={18} height={18} /> },
    { to: '/god/timeline', label: 'Timeline View', icon: <GitBranchIcon width={18} height={18} /> },
    { to: '/god/quantum', label: 'Quantum Realm', icon: <AtomIcon width={18} height={18} /> },
    { to: '/god/multiverse', label: 'Multiverse Map', icon: <InfinityIcon width={18} height={18} /> },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-space-950 text-space-100">
      {/* Sidebar Navigation */}
      <aside className="flex w-64 flex-col border-r border-space-800 bg-space-900/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between border-b border-space-800 px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent/20 text-accent">
              <GalaxyIcon width={18} height={18} />
            </div>
            <span className="font-semibold tracking-tight text-white">Universe Engine</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-space-400 transition-colors hover:bg-space-800 hover:text-white"
          >
            <ArrowLeftIcon width={18} height={18} />
            Back to Workspace
          </NavLink>

          <div className="my-2 border-t border-space-800/60" />

          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent/15 text-accent shadow-sm border border-accent/30'
                    : 'text-space-300 hover:bg-space-800/80 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-space-800 p-4 text-xs text-space-500">
          <div>Deterministic Cosmos Engine</div>
          <div className="font-mono text-[10px] text-space-600">v0.1.0 · God Mode</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-space-950">
        <Outlet />
      </main>
    </div>
  );
}
