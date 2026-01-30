import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBNPLStore } from '../../store';
import { useOverduePayments } from '../../store/selectors';

interface NavItem {
  to?: string;
  label: string;
  icon: React.ReactNode;
  badge?: 'overdue';
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'Budgeting',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    badge: 'overdue',
    children: [
      {
        to: '/budgeting',
        label: 'Dashboard',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
        ),
      },
      {
        to: '/budgeting/analytics',
        label: 'Analytics',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        to: '/budgeting/history',
        label: 'History',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const location = useLocation();
  const openQuickAddModal = useBNPLStore((state) => state.openQuickAddModal);
  const collapsed = useBNPLStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useBNPLStore((state) => state.toggleSidebar);
  const overduePayments = useOverduePayments();
  const overdueCount = overduePayments.length;

  // Auto-expand sections based on current route
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    if (location.pathname.startsWith('/budgeting')) {
      return ['Budgeting'];
    }
    return [];
  });

  // Check if current path is within a section
  const isInSection = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(
      (child) => child.to && location.pathname === child.to
    );
  };

  // Toggle section expansion
  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label)
        ? prev.filter((s) => s !== label)
        : [...prev, label]
    );
  };

  // Check if section is expanded
  const isSectionExpanded = (label: string): boolean => {
    return expandedSections.includes(label) ||
      navItems.find(item => item.label === label && isInSection(item)) !== undefined;
  };

  return (
    <aside
      className={`
        min-h-screen bg-dark-card border-r border-dark-border flex flex-col transition-all duration-200
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo & Collapse Toggle */}
      <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <h1 className="text-xl font-bold text-white">Journal</h1>}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-dark-hover hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Quick Add Button */}
      <div className={`px-2 mb-4 ${collapsed ? 'px-2' : 'px-4'}`}>
        <button
          onClick={openQuickAddModal}
          className={`
            flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 transition-colors font-medium
            ${collapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full px-4 py-2.5'}
          `}
          title={collapsed ? 'Quick Add (⌘N)' : undefined}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {!collapsed && 'Quick Add'}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1 ${collapsed ? 'px-2' : 'px-4'}`}>
        {navItems.map((item) => {
          const showBadge = item.badge === 'overdue' && overdueCount > 0;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = hasChildren && isSectionExpanded(item.label);
          const isActive = item.to ? location.pathname === item.to : isInSection(item);

          // Render section with children
          if (hasChildren) {
            return (
              <div key={item.label}>
                {/* Section Header */}
                <button
                  onClick={() => !collapsed && toggleSection(item.label)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg transition-colors ${
                    collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-dark-hover text-white'
                      : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                  }`}
                >
                  <span className="relative">
                    {item.icon}
                    {showBadge && collapsed && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {showBadge && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-red-500 text-white rounded-full">
                          {overdueCount}
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Children */}
                {!collapsed && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-dark-border pl-3">
                    {item.children!.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to!}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-dark-hover text-white'
                              : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                          }`
                        }
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Render regular nav item
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg transition-colors ${
                  collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-dark-hover text-white'
                    : 'text-gray-400 hover:bg-dark-hover hover:text-white'
                }`
              }
            >
              <span className="relative">
                {item.icon}
                {showBadge && collapsed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-red-500 text-white rounded-full">
                      {overdueCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-dark-border">
          <p className="text-xs text-gray-500 text-center">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-dark-hover rounded text-gray-400">
              ⌘N
            </kbd>{' '}
            to add order
          </p>
        </div>
      )}
    </aside>
  );
}
