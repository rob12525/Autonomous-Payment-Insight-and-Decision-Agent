import { Link, useLocation } from 'react-router';
import { Activity, FileText, Shield, Settings, Search } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';
import { MetricCard } from './MetricCard';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { metrics, loading } = useMetrics(true, 5000);

  const navItems = [
    { path: '/', label: 'Home', icon: Activity },
    { path: '/decisions', label: 'Decisions', icon: FileText },
    { path: '/audit', label: 'Audit', icon: Shield },
    { path: '/compliance', label: 'Reports', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">AI Payment Intelligence</h1>
              <div className="flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search decisions..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* KPI Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          {loading ? (
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-6 gap-4">
              <MetricCard
                label="Total Decisions"
                value={metrics.totalDecisions}
                color="blue"
              />
              <MetricCard
                label="Executed"
                value={metrics.executedDecisions || 0}
                color="green"
              />
              <MetricCard
                label="Rejected"
                value={metrics.rejectedDecisions || 0}
                color="red"
              />
              <MetricCard
                label="Avg Confidence"
                value={`${Math.round((metrics.averageConfidence ?? 0) * 100)}%`}
                color="purple"
              />
              <MetricCard
                label="Avg Accuracy"
                value={`${Math.round((metrics.averageAccuracy ?? 0) * 100)}%`}
                color="blue"
              />
              <MetricCard
                label="Success Rate"
                value={`${Math.round((metrics.successRate ?? 0) * 100)}%`}
                color="green"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
