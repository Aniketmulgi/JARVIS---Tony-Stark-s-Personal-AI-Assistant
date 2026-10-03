import fs from 'node:fs';
import path from 'node:path';
import type { ActionLog } from '../types/index.js';

const dataDir = path.resolve('data');
const storeFile = path.join(dataDir, 'store.json');

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  parents?: string[];
  modifiedTime: string;
  webViewLink?: string;
  downloadUrl?: string;
  localPath?: string;
}

export interface CalendarItem {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status?: string;
  created?: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  due: string;
  done: boolean;
  createdAt: string;
}

export interface CommItem {
  id: string;
  recipient: string;
  message: string;
  status: 'delivered' | 'sent' | 'failed';
  timestamp: string;
}

export interface Settings {
  offlineMode: boolean; // true = Stark Protocol Local Vault (no cloud needed), false = Google Cloud OAuth
}

interface StoreSchema {
  reminders: ReminderItem[];
  history: ActionLog[];
  calendar: CalendarItem[];
  drive: DriveItem[];
  comms: CommItem[];
  settings: Settings;
}

function initialData(): StoreSchema {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(17, 0, 0, 0);

  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  dayAfter.setHours(14, 0, 0, 0);

  return {
    reminders: [
      {
        id: 'rem-1',
        title: 'Check Arc Reactor palladium core degradation',
        due: new Date(now.getTime() + 3 * 3600000).toISOString(),
        done: false,
        createdAt: now.toISOString()
      },
      {
        id: 'rem-2',
        title: 'Calibrate Mark 85 repulsor nanotech arrays',
        due: new Date(now.getTime() + 8 * 3600000).toISOString(),
        done: false,
        createdAt: now.toISOString()
      }
    ],
    history: [],
    calendar: [
      {
        id: 'cal-init-1',
        summary: 'Avengers Protocol Strategic Briefing with Bruce Banner',
        description: 'Review vibranium synthesis and gamma containment specs.',
        start: { dateTime: tomorrow.toISOString() },
        end: { dateTime: new Date(tomorrow.getTime() + 3600000).toISOString() },
        created: now.toISOString()
      },
      {
        id: 'cal-init-2',
        summary: 'Stark Industries Board Review',
        description: 'Quarterly clean energy grid rollout briefing with Pepper.',
        start: { dateTime: dayAfter.toISOString() },
        end: { dateTime: new Date(dayAfter.getTime() + 7200000).toISOString() },
        created: now.toISOString()
      }
    ],
    drive: [
      {
        id: 'folder-stark-core',
        name: 'Stark Archive Root',
        mimeType: 'application/vnd.google-apps.folder',
        modifiedTime: now.toISOString()
      },
      {
        id: 'doc-reactor-design',
        name: 'Arc Reactor Mark VII Schematics & Thermal Output.pdf',
        mimeType: 'application/pdf',
        size: 14502800,
        parents: ['folder-stark-core'],
        modifiedTime: new Date(now.getTime() - 86400000).toISOString(),
        webViewLink: '#preview-reactor-design'
      },
      {
        id: 'doc-nanotech-suit',
        name: 'Nanotech Mark 85 Deployment Diagnostics.json',
        mimeType: 'application/json',
        size: 420500,
        parents: ['folder-stark-core'],
        modifiedTime: new Date(now.getTime() - 172800000).toISOString(),
        webViewLink: '#preview-nanotech-suit'
      },
      {
        id: 'doc-doomsday-contingency',
        name: 'Doomsday Defense Grid Protocol - Classified.stark',
        mimeType: 'application/octet-stream',
        size: 89000000,
        parents: ['folder-stark-core'],
        modifiedTime: now.toISOString(),
        webViewLink: '#preview-doomsday-contingency'
      }
    ],
    comms: [
      {
        id: 'comm-1',
        recipient: 'Bruce Banner (@bruce_banner)',
        message: 'Gamma containment unit is calibrated. Meeting confirmed for tomorrow.',
        status: 'delivered',
        timestamp: new Date(now.getTime() - 3600000).toISOString()
      }
    ],
    settings: {
      offlineMode: true
    }
  };
}

function load(): StoreSchema {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(storeFile)) {
    const init = initialData();
    fs.writeFileSync(storeFile, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
    const def = initialData();
    return {
      reminders: raw.reminders || def.reminders,
      history: raw.history || def.history,
      calendar: raw.calendar || def.calendar,
      drive: raw.drive || def.drive,
      comms: raw.comms || def.comms,
      settings: { ...def.settings, ...(raw.settings || {}) }
    };
  } catch {
    const init = initialData();
    fs.writeFileSync(storeFile, JSON.stringify(init, null, 2));
    return init;
  }
}

function save(d: StoreSchema) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(storeFile, JSON.stringify(d, null, 2));
}

export const store = {
  // Reminders
  reminders: () => load().reminders,
  addReminder: (r: ReminderItem) => {
    const d = load();
    d.reminders.unshift(r);
    save(d);
    return r;
  },
  updateReminder: (id: string, patch: Partial<ReminderItem>) => {
    const d = load();
    const i = d.reminders.findIndex((r) => r.id === id);
    if (i < 0) return null;
    d.reminders[i] = { ...d.reminders[i], ...patch };
    save(d);
    return d.reminders[i];
  },
  deleteReminder: (id: string) => {
    const d = load();
    d.reminders = d.reminders.filter((r) => r.id !== id);
    save(d);
  },

  // Calendar
  calendar: () => load().calendar,
  addCalendarEvent: (e: CalendarItem) => {
    const d = load();
    d.calendar.unshift(e);
    save(d);
    return e;
  },
  deleteCalendarEvent: (id: string) => {
    const d = load();
    d.calendar = d.calendar.filter((c) => c.id !== id);
    save(d);
  },

  // Drive Vault
  driveFiles: (query?: string) => {
    const d = load();
    if (!query) return d.drive;
    const q = query.toLowerCase();
    return d.drive.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.mimeType && f.mimeType.toLowerCase().includes(q))
    );
  },
  addDriveFile: (f: DriveItem) => {
    const d = load();
    d.drive.unshift(f);
    save(d);
    return f;
  },
  addDriveFolder: (folder: DriveItem) => {
    const d = load();
    d.drive.unshift(folder);
    save(d);
    return folder;
  },
  deleteDriveFile: (id: string) => {
    const d = load();
    d.drive = d.drive.filter((f) => f.id !== id);
    save(d);
  },

  // Telegram / Comms
  comms: () => load().comms,
  addComm: (c: CommItem) => {
    const d = load();
    d.comms.unshift(c);
    d.comms = d.comms.slice(0, 50);
    save(d);
    return c;
  },

  // Action History
  history: () => load().history,
  addHistory: (h: ActionLog) => {
    const d = load();
    d.history.unshift(h);
    d.history = d.history.slice(0, 100);
    save(d);
    return h;
  },
  clearHistory: () => {
    const d = load();
    d.history = [];
    save(d);
  },

  // Settings
  settings: () => load().settings,
  updateSettings: (patch: Partial<Settings>) => {
    const d = load();
    d.settings = { ...d.settings, ...patch };
    save(d);
    return d.settings;
  }
};
