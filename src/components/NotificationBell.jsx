import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsService } from '../services/notifications.service';

function formatTimeAgo(dateString) {
  const d = new Date(dateString);
  if (isNaN(d)) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export default function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  align = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      onRefresh();
    }
  };

  const handleNotificationClick = async (notification) => {
    setIsOpen(false);
    await onMarkAsRead(notification.id);
    if (notification.envio_id) {
      navigate(`/pedidos/${notification.envio_id}`);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        onClick={handleToggle}
        className="icon-button"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-fg)'
        }}
        title="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: 'var(--color-danger)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 'bold',
            padding: '2px 5px',
            borderRadius: '10px',
            lineHeight: 1
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          ...(align === 'right' ? { right: 0 } : { left: 0 }),
          marginTop: '0.5rem',
          width: '320px',
          background: 'var(--color-canvas)',
          border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '400px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-fg)' }}>Notificaciones</h3>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  onMarkAllAsRead();
                  setIsOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary-text)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle size={14} /> Marcar todas
              </button>
            )}
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-fg-subtle)' }}>
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid color-mix(in srgb, var(--color-fg) 5%, transparent)',
                    cursor: 'pointer',
                    background: notif.leida ? 'transparent' : 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--color-fg) 5%, transparent)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = notif.leida ? 'transparent' : 'color-mix(in srgb, var(--color-primary) 5%, transparent)'}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: notif.leida ? 'normal' : '600', color: 'var(--color-fg)', marginBottom: '4px' }}>
                    {notif.titulo}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-fg-muted)', marginBottom: '6px' }}>
                    {notif.mensaje}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-text)' }}>
                    {formatTimeAgo(notif.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
