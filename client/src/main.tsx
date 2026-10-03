import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Command,
  FileText,
  FolderOpen,
  History,
  Loader2,
  MessageSquare,
  Paperclip,
  Power,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Terminal,
  Upload,
  UserRound,
  Wifi,
  WifiOff,
  FolderPlus,
  Trash2,
  Search,
  Check,
  Zap,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  StopCircle
} from 'lucide-react';
import { api } from './lib/api';
import './styles.css';

type Chat = {
  id: string;
  role: 'jarvis' | 'tony';
  text: string;
  timestamp: string;
  actions?: any[];
};

export function App() {
  const [online, setOnline] = useState(true);
  const [authStatus, setAuthStatus] = useState<any>({ connected: false, offlineMode: true });
  const [tab, setTab] = useState<'calendar' | 'drive' | 'reminders' | 'comms'>('calendar');
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 'init-1',
      role: 'jarvis',
      text: 'Good evening, Mr. Stark. Stark Command Systems are at 100% nominal output. How may I assist you today?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const [data, setData] = useState<{
    events: any[];
    files: any[];
    reminders: any[];
  }>({
    events: [],
    files: [],
    reminders: []
  });
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [queueMode, setQueueMode] = useState<'queue' | 'interrupt'>('queue');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  // Load state and refresh integrations
  const refresh = async () => {
    try {
      const [h, a, his, r, c, cal] = await Promise.all([
        api.health(),
        api.authStatus(),
        api.history(),
        api.reminders(),
        api.comms(),
        api.calendar()
      ]);
      setOnline(h.online);
      setAuthStatus(a);
      setHistory(his.history || []);
      setComms(c.comms || []);
      setData(prev => ({
        ...prev,
        reminders: r.reminders || [],
        events: cal.events || []
      }));
    } catch (e) {
      setOnline(false);
    }
  };

  const refreshDrive = async (q = searchQuery) => {
    try {
      const d = await api.drive(q);
      setData(prev => ({ ...prev, files: d.files || [] }));
    } catch (e: any) {
      pushJarvisChat(`⚠ Stark Archive Sync Error: ${e.message}`);
    }
  };

  useEffect(() => {
    refresh();
    refreshDrive();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const pushJarvisChat = (text: string) => {
    setChats(c => [
      ...c,
      {
        id: Math.random().toString(),
        role: 'jarvis',
        text,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const executeAction = async (action: any, confirmed = false): Promise<boolean> => {
    try {
      const r = await api.execute(action, confirmed);
      if (r.needsConfirmation) {
        setConfirmModal(action);
        return false;
      }

      setHistory(h => [r.history, ...h]);

      if (action.type === 'calendar') {
        const cal = await api.calendar();
        setData(d => ({ ...d, events: cal.events || [] }));
        setTab('calendar');
      } else if (action.type === 'drive') {
        setTab('drive');
        if (action.payload?.uploadPrompt) {
          fileRef.current?.click();
        } else {
          refreshDrive(action.payload?.query || '');
        }
      } else if (action.type === 'reminder') {
        const rr = await api.reminders();
        setData(d => ({ ...d, reminders: rr.reminders || [] }));
        setTab('reminders');
      } else if (action.type === 'telegram') {
        const cm = await api.comms();
        setComms(cm.comms || []);
        setTab('comms');
      }

      pushJarvisChat(`✓ PROTOCOL EXECUTED: ${action.description}`);
      return true;
    } catch (e: any) {
      pushJarvisChat(`⚠ EXECUTION FAILED: ${e.message}`);
      return false;
    }
  };

  const handleCommandSubmit = async (customText?: string) => {
    const raw = (customText !== undefined ? customText : input).trim();
    if (!raw) return;

    if (queueMode === 'interrupt' && busy) {
      abortControllerRef.current = true;
      pushJarvisChat(`🛑 Interrupted previous task queue. Processing new command.`);
    }

    if (customText === undefined) setInput('');
    setChats(c => [
      ...c,
      {
        id: Math.random().toString(),
        role: 'tony',
        text: raw,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    setBusy(true);
    abortControllerRef.current = false;

    try {
      const parsed = await api.parse(raw);
      pushJarvisChat(parsed.reply);

      const actions = parsed.actions || [];
      if (actions.length > 0) {
        setQueue(actions);
        for (const act of actions) {
          if (abortControllerRef.current) {
            pushJarvisChat(`[JARVIS] Remaining action queue aborted.`);
            break;
          }
          const ok = await executeAction(act, false);
          if (!ok) break; // Halts if awaiting user confirmation modal
        }
        setQueue([]);
      }
    } catch (e: any) {
      pushJarvisChat(`⚠ Parsing Failure: ${e.message}`);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const handleFileUpload = async (file?: File) => {
    if (!file) return;
    try {
      pushJarvisChat(`Archiving file: ${file.name} into Stark Drive Vault...`);
      await api.upload(file);
      pushJarvisChat(`✓ File ${file.name} successfully encrypted & archived.`);
      await refreshDrive();
      setTab('drive');
    } catch (e: any) {
      pushJarvisChat(`⚠ Archive Upload failed: ${e.message}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(newFolderName.trim());
      pushJarvisChat(`✓ Directory "${newFolderName.trim()}" created.`);
      setNewFolderName('');
      setShowFolderInput(false);
      refreshDrive();
    } catch (e: any) {
      pushJarvisChat(`⚠ Folder creation failed: ${e.message}`);
    }
  };

  const handleToggleReminder = async (id: string, currentDone: boolean) => {
    try {
      await api.toggleReminder(id, !currentDone);
      const rr = await api.reminders();
      setData(d => ({ ...d, reminders: rr.reminders || [] }));
    } catch (e: any) {
      pushJarvisChat(`⚠ Reminder update failed: ${e.message}`);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await api.deleteReminder(id);
      const rr = await api.reminders();
      setData(d => ({ ...d, reminders: rr.reminders || [] }));
    } catch (e: any) {
      pushJarvisChat(`⚠ Reminder deletion failed: ${e.message}`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.deleteCalendarEvent(id);
      const cal = await api.calendar();
      setData(d => ({ ...d, events: cal.events || [] }));
    } catch (e: any) {
      pushJarvisChat(`⚠ Event deletion failed: ${e.message}`);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await api.deleteDriveFile(id);
      refreshDrive();
    } catch (e: any) {
      pushJarvisChat(`⚠ File deletion failed: ${e.message}`);
    }
  };

  return (
    <div className="shell">
      <div className="scan" />
      <div className="hud-grid-overlay" />

      {/* Header */}
      <header>
        <div className="brand">
          <div className="arc">
            <Zap size={20} />
          </div>
          <div>
            <b>JARVIS</b>
            <span>STARK COMMAND CENTRE · DOOMSDAY PROTOCOL V4.2</span>
          </div>
        </div>

        <div className="top-status">
          <div className="status-badge">
            <span className={online ? 'dot online' : 'dot'} />
            <span>{online ? 'CORE ONLINE' : 'DISCONNECTED'}</span>
          </div>

          <span className="sep" />

          <div className="status-badge mode-badge">
            <span className="dot mode-dot" />
            <span>VAULT: {authStatus.offlineMode ? 'STARK PROTOCOL (OFFLINE VAULT)' : 'GOOGLE CLOUD'}</span>
          </div>

          <span className="sep" />

          <button
            className="queue-toggle-btn"
            title={`Current Queue Mode: ${queueMode.toUpperCase()}`}
            onClick={() => setQueueMode(m => (m === 'queue' ? 'interrupt' : 'queue'))}
          >
            <Sliders size={13} />
            <span>MODE: {queueMode.toUpperCase()}</span>
          </button>

          <button className="icon-btn" onClick={refresh} title="Force Resync">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <main>
        {/* Left Pane: Chat, Intelligence & Command Dispatcher */}
        <section className="left">
          <div className="panel-title">
            <div>
              <span className="eyebrow">STARK VOICELESS COMMAND CONSOLE</span>
              <h1>How can I assist you, Tony?</h1>
            </div>
            <div className="queue-state">
              {busy ? (
                <>
                  <Loader2 size={14} className="spin" /> EXECUTING PROTOCOL
                </>
              ) : (
                <>
                  <Radio size={14} /> STANDBY
                </>
              )}
            </div>
          </div>

          <div className="chat">
            {chats.map(m => (
              <div key={m.id} className={'msg ' + m.role}>
                <div className="avatar">
                  {m.role === 'jarvis' ? <Command size={16} /> : <UserRound size={16} />}
                </div>
                <div className="msg-content">
                  <div className="msg-meta">
                    <small>{m.role === 'jarvis' ? 'J.A.R.V.I.S.' : 'TONY STARK'}</small>
                    <time>{m.timestamp}</time>
                  </div>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="composer">
            <div className="suggestions">
              <button onClick={() => handleCommandSubmit('Schedule a meeting with Bruce tomorrow at 5 PM')}>
                📅 Schedule meeting with Bruce
              </button>
              <button onClick={() => handleCommandSubmit('Remind me to check the reactor at 8 PM')}>
                ⏰ Remind reactor check
              </button>
              <button onClick={() => handleCommandSubmit('Find the reactor design report in Drive')}>
                📁 Find reactor report
              </button>
              <button onClick={() => handleCommandSubmit('Send Bruce a Telegram message saying the experiment is postponed')}>
                💬 Telegram Bruce
              </button>
              <button
                className="multi-btn"
                onClick={() =>
                  handleCommandSubmit(
                    'Schedule the Stark team meeting for tomorrow at 6 PM, remind me 30 minutes before it, and send Bruce a Telegram message about it'
                  )
                }
              >
                ⚡ Multi-Step Doomsday Sequence
              </button>
            </div>

            <div className="input-row">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommandSubmit();
                  }
                }}
                placeholder="Enter command (e.g. Schedule meeting with Bruce tomorrow, Remind me to check Mark 85 at 7 PM...)"
              />
              <button
                className="send"
                onClick={() => handleCommandSubmit()}
                disabled={busy && queueMode === 'queue'}
              >
                {busy ? <Loader2 className="spin" /> : <Send size={18} />}
              </button>
            </div>

            <div className="composer-foot">
              <span>
                <ShieldAlert size={13} /> Consequential actions prompt holographic confirmation
              </span>
              <span>ENTER EXECUTES · SHIFT+ENTER MULTILINE</span>
            </div>
          </div>
        </section>

        {/* Right Pane: Live Integration Preview Pane */}
        <aside className="right">
          <div className="preview-head">
            <div>
              <span className="eyebrow">LIVE INTEGRATION PREVIEW PANE</span>
              <h2>
                {tab === 'calendar'
                  ? 'Stark Calendar Grid'
                  : tab === 'drive'
                  ? 'Stark Archive & Document Vault'
                  : tab === 'reminders'
                  ? 'Active Personal Reminders'
                  : 'Stark Secure Satellite Comms'}
              </h2>
            </div>
            <div className="connected">
              <span className="dot online" />
              <span>LIVE FEED</span>
            </div>
          </div>

          <div className="tabs">
            <button
              className={tab === 'calendar' ? 'active' : ''}
              onClick={() => {
                setTab('calendar');
                refresh();
              }}
            >
              <CalendarDays />
              <span>Calendar ({data.events.length})</span>
            </button>
            <button
              className={tab === 'drive' ? 'active' : ''}
              onClick={() => {
                setTab('drive');
                refreshDrive();
              }}
            >
              <FolderOpen />
              <span>Drive Vault ({data.files.length})</span>
            </button>
            <button
              className={tab === 'reminders' ? 'active' : ''}
              onClick={() => setTab('reminders')}
            >
              <Clock3 />
              <span>Reminders ({data.reminders.length})</span>
            </button>
            <button
              className={tab === 'comms' ? 'active' : ''}
              onClick={() => setTab('comms')}
            >
              <MessageSquare />
              <span>Comms ({comms.length})</span>
            </button>
          </div>

          {/* Tab Toolbar Actions */}
          <div className="preview-actions">
            {tab === 'drive' && (
              <>
                <div className="search-bar">
                  <Search size={13} />
                  <input
                    type="text"
                    placeholder="Search Archive..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      refreshDrive(e.target.value);
                    }}
                  />
                </div>
                <button onClick={() => fileRef.current?.click()} className="action-btn">
                  <Upload size={14} /> Upload File
                </button>
                <button
                  onClick={() => setShowFolderInput(!showFolderInput)}
                  className="action-btn"
                >
                  <FolderPlus size={14} /> New Folder
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  onChange={e => {
                    handleFileUpload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </>
            )}

            {tab === 'calendar' && (
              <button
                onClick={() =>
                  handleCommandSubmit('Schedule strategic session tomorrow at 4 PM')
                }
                className="action-btn"
              >
                <CalendarDays size={14} /> Quick Event
              </button>
            )}

            {tab === 'reminders' && (
              <button
                onClick={() =>
                  handleCommandSubmit('Remind me to inspect Mark 85 nanotech in 2 hours')
                }
                className="action-btn"
              >
                <Clock3 size={14} /> Quick Reminder
              </button>
            )}
          </div>

          {showFolderInput && tab === 'drive' && (
            <div className="folder-create-bar">
              <input
                type="text"
                placeholder="Folder name (e.g. Arc Reactor Schematics)..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              />
              <button onClick={handleCreateFolder}>Create</button>
              <button onClick={() => setShowFolderInput(false)}>Cancel</button>
            </div>
          )}

          {/* Preview Contents Display */}
          <div className="preview-list">
            {tab === 'calendar' && (
              data.events.length === 0 ? (
                <div className="empty">
                  <Activity size={32} />
                  <b>No Scheduled Events</b>
                  <span>Ask JARVIS to schedule meetings or synchronise agenda.</span>
                </div>
              ) : (
                data.events.map(ev => (
                  <div className="item" key={ev.id}>
                    <div className="item-icon cal-icon">
                      <CalendarDays size={16} />
                    </div>
                    <div className="item-main">
                      <b>{ev.summary || 'Stark Strategy Meeting'}</b>
                      <span className="item-meta">
                        {ev.start?.dateTime
                          ? new Date(ev.start.dateTime).toLocaleString()
                          : ev.start?.date || 'Upcoming'}
                      </span>
                      {ev.description && (
                        <p className="item-desc">{ev.description}</p>
                      )}
                    </div>
                    <button
                      className="delete-item-btn"
                      onClick={() => handleDeleteEvent(ev.id)}
                      title="Delete Event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )
            )}

            {tab === 'drive' && (
              data.files.length === 0 ? (
                <div className="empty">
                  <FolderOpen size={32} />
                  <b>Stark Archive Empty</b>
                  <span>Upload a file or ask JARVIS to retrieve schematics.</span>
                </div>
              ) : (
                data.files.map(f => {
                  const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
                  return (
                    <div className="item" key={f.id}>
                      <div className={`item-icon ${isFolder ? 'folder-icon' : 'file-icon'}`}>
                        {isFolder ? <FolderOpen size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="item-main">
                        <b>{f.name}</b>
                        <span className="item-meta">
                          {isFolder
                            ? 'Directory'
                            : `${f.mimeType || 'Document'} · ${
                                f.size ? (f.size / 1024 / 1024).toFixed(2) + ' MB' : 'Archive'
                              }`}
                        </span>
                      </div>
                      <button
                        className="delete-item-btn"
                        onClick={() => handleDeleteFile(f.id)}
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )
            )}

            {tab === 'reminders' && (
              data.reminders.length === 0 ? (
                <div className="empty">
                  <Clock3 size={32} />
                  <b>No Pending Reminders</b>
                  <span>Tell JARVIS: "Remind me to check the reactor at 8 PM"</span>
                </div>
              ) : (
                data.reminders.map(rem => (
                  <div className={`item ${rem.done ? 'item-done' : ''}`} key={rem.id}>
                    <button
                      className={`check-btn ${rem.done ? 'checked' : ''}`}
                      onClick={() => handleToggleReminder(rem.id, rem.done)}
                    >
                      {rem.done ? <Check size={14} /> : null}
                    </button>
                    <div className="item-main">
                      <b style={{ textDecoration: rem.done ? 'line-through' : 'none' }}>
                        {rem.title}
                      </b>
                      <span className="item-meta">
                        Due: {new Date(rem.due).toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="delete-item-btn"
                      onClick={() => handleDeleteReminder(rem.id)}
                      title="Delete Reminder"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )
            )}

            {tab === 'comms' && (
              comms.length === 0 ? (
                <div className="empty">
                  <MessageSquare size={32} />
                  <b>No Communications Logged</b>
                  <span>Dispatch Telegram messages via JARVIS commands.</span>
                </div>
              ) : (
                comms.map(cm => (
                  <div className="item comm-item" key={cm.id}>
                    <div className="item-icon comm-icon">
                      <MessageSquare size={16} />
                    </div>
                    <div className="item-main">
                      <div className="comm-head">
                        <b>{cm.recipient}</b>
                        <span className="comm-badge">{cm.status.toUpperCase()}</span>
                      </div>
                      <p className="comm-body">"{cm.message}"</p>
                      <span className="item-meta">
                        {new Date(cm.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          <div className="preview-footer">
            <Wifi size={14} /> Live synchronisation active with Stark Core Hub
          </div>
        </aside>
      </main>

      {/* Bottom Diagnostics Grid: Action History & Execution Queue */}
      <section className="bottom-grid">
        <div className="mini">
          <div className="mini-head">
            <div className="flex-center">
              <History size={14} /> ACTION EXECUTION HISTORY
            </div>
            {history.length > 0 && (
              <button className="clear-btn" onClick={() => api.clearHistory().then(refresh)}>
                Clear Logs
              </button>
            )}
          </div>
          <div className="mini-body">
            {history.length === 0 ? (
              <div className="quiet">No actions executed in this session.</div>
            ) : (
              history.slice(0, 5).map(h => (
                <div className="history-row" key={h.id}>
                  <span className={'status-dot ' + h.status} />
                  <span className="history-desc">{h.description}</span>
                  <time>{new Date(h.timestamp).toLocaleTimeString()}</time>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mini">
          <div className="mini-head">
            <div className="flex-center">
              <Terminal size={14} /> ACTIVE COMMAND PIPELINE
            </div>
            <span className="queue-counter">
              {queue.length} PENDING
            </span>
          </div>
          <div className="mini-body">
            {queue.length > 0 ? (
              queue.map(q => (
                <div className="history-row queued" key={q.id}>
                  <Loader2 className="spin" size={13} />
                  <span className="history-desc">{q.description}</span>
                  <span className="queue-tag">IN PIPELINE</span>
                </div>
              ))
            ) : (
              <div className="quiet">Pipeline clear. Ready for rapid sequential commands.</div>
            )}
          </div>
        </div>
      </section>

      {/* Consequential Action Confirmation Hologram Modal */}
      {confirmModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <ShieldAlert size={36} className="modal-alert-icon" />
            <span className="eyebrow">CONSEQUENTIAL ACTION CONFIRMATION</span>
            <h3>Authorize J.A.R.V.I.S. Protocol?</h3>
            <p>{confirmModal.description}</p>
            <div className="modal-meta-box">
              <span>TYPE: {confirmModal.type?.toUpperCase()}</span>
              <span>SECURITY PROTOCOL: LEVEL 4</span>
            </div>
            <div className="modal-actions">
              <button onClick={() => setConfirmModal(null)}>Abort</button>
              <button
                className="danger"
                onClick={() => {
                  const a = confirmModal;
                  setConfirmModal(null);
                  executeAction(a, true);
                }}
              >
                Confirm & Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
