import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useNotifications } from '@/hooks/useNotifications';
import type { INotification } from '@/types/academic.types';

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getNotificationMeta(type: string) {
  switch (type) {
    case 'NOTES_PUBLISHED':
      return {
        badgeBg: 'bg-success-soft text-success-text border border-success-border',
        dotBg: 'bg-success',
        label: 'Notes',
        icon: (
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      };
    case 'MATERIAL_PUBLISHED':
      return {
        badgeBg: 'bg-info-soft text-info-text border border-info-border',
        dotBg: 'bg-info',
        label: 'Material',
        icon: (
          <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
      };
    case 'VIDEO_PUBLISHED':
      return {
        badgeBg: 'bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border',
        dotBg: 'bg-primary',
        label: 'Video',
        icon: (
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ),
      };
    case 'QUIZ_PUBLISHED':
    case 'QUIZ_COMPLETED':
      return {
        badgeBg: 'bg-warning-soft text-warning-text border border-warning-border',
        dotBg: 'bg-warning',
        label: 'Quiz',
        icon: (
          <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case 'ASSIGNMENT_PUBLISHED':
    case 'ASSIGNMENT_SUBMITTED':
      return {
        badgeBg: 'bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border',
        dotBg: 'bg-primary',
        label: 'Assignment',
        icon: (
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      };
    case 'DEADLINE_APPROACHING':
      return {
        badgeBg: 'bg-error-soft text-error-text border border-error-border animate-pulse',
        dotBg: 'bg-error',
        label: 'Due Soon',
        icon: (
          <svg className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      };
    case 'RESULT_PUBLISHED':
      return {
        badgeBg: 'bg-warning-soft text-warning-text border border-warning-border',
        dotBg: 'bg-warning',
        label: 'Result',
        icon: (
          <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        ),
      };
    case 'ENROLLMENT_APPROVED':
      return {
        badgeBg: 'bg-success-soft text-success-text border border-success-border',
        dotBg: 'bg-success',
        label: 'Approved',
        icon: (
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case 'ENROLLMENT_REJECTED':
      return {
        badgeBg: 'bg-error-soft text-error-text border border-error-border',
        dotBg: 'bg-error',
        label: 'Rejected',
        icon: (
          <svg className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case 'TEACHER_REGISTRATION_REQUESTED':
    case 'STUDENT_ENROLLMENT_REQUESTED':
    case 'ENROLLMENT_REQUESTED':
      return {
        badgeBg: 'bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border',
        dotBg: 'bg-primary',
        label: 'Request',
        icon: (
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
      };
    case 'ANNOUNCEMENT_POSTED':
    case 'DEPARTMENT_ANNOUNCEMENT':
    case 'DEPARTMENT_EVENT':
    default:
      return {
        badgeBg: 'bg-muted text-foreground border border-border',
        dotBg: 'bg-primary',
        label: 'Notice',
        icon: (
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        ),
      };
  }
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif: INotification) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    const targetUrl = notif.actionUrl || notif.link;
    if (targetUrl) {
      setIsOpen(false);
      navigate(targetUrl);
    }
  };

  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none transition-colors cursor-pointer"
        aria-label="Academic Notifications"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-card-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary-soft text-primary dark:text-accent-foreground px-2 py-0.5 text-[10px] font-bold border border-primary-border">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary dark:text-accent-foreground hover:underline font-medium px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-error-text font-medium px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer"
                  title="Clear all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border bg-muted/40 px-4 py-1.5 gap-2 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-card text-card-foreground shadow-xs font-semibold border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-card text-card-foreground shadow-xs font-semibold border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                <span className="text-xs">Loading updates...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3 border border-border">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-card-foreground">You're all caught up!</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  {activeTab === 'unread'
                    ? 'No unread notifications left.'
                    : 'No real-time academic notifications at this moment.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const meta = getNotificationMeta(notif.type);
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      notif.isRead
                        ? 'bg-card hover:bg-muted/50 opacity-85 hover:opacity-100'
                        : 'bg-primary-soft/30 hover:bg-primary-soft/50'
                    }`}
                  >
                    {/* Icon container */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${meta.badgeBg}`}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-muted border border-border text-muted-foreground">
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <h4
                        className={`text-xs line-clamp-1 ${
                          notif.isRead ? 'font-medium text-card-foreground' : 'font-bold text-foreground'
                        }`}
                      >
                        {notif.title}
                      </h4>

                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread indicator or delete */}
                    <div className="absolute right-3 top-4 flex items-center gap-1">
                      {!notif.isRead && (
                        <span className={`w-2 h-2 rounded-full ${meta.dotBg}`} />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-error-text rounded transition-all cursor-pointer"
                        title="Remove notification"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/30 px-4 py-2.5 text-center">
            <span className="text-[11px] text-muted-foreground">
              Notifications update live as events occur in the academic portal
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
