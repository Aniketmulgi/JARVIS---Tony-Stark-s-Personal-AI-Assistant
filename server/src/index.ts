import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

import {
  authUrl,
  exchange,
  calendarList,
  calendarCreate,
  driveList,
  driveCreateFolder,
  driveUpload
} from './services/google.js';
import { sendTelegram } from './services/telegram.js';
import { parseCommand } from './services/parser.js';
import { store } from './utils/store.js';

const app = express();
const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET || 'dev-secret'));

// Session store for optional Google OAuth
const sessions = new Map<string, any>();

function getSessionId(req: any, res: any) {
  let id = req.signedCookies?.jarvis_sid;
  if (!id) {
    id = randomUUID();
    res.cookie('jarvis_sid', id, {
      httpOnly: true,
      sameSite: 'lax',
      signed: true
    });
  }
  return id;
}

function getGoogleTokens(req: any, res: any) {
  return sessions.get(getSessionId(req, res));
}

// Health check
app.get('/api/health', (_, res) =>
  res.json({
    online: true,
    protocol: 'STARK DOOMSDAY V4.2',
    timestamp: new Date().toISOString()
  })
);

// Settings / System Mode (Offline Stark Vault vs Google Cloud)
app.get('/api/settings', (_, res) => {
  res.json(store.settings());
});

app.post('/api/settings', (req, res) => {
  const updated = store.updateSettings(req.body);
  res.json(updated);
});

// Google OAuth Auth routes (Supported if user adds credentials)
app.get('/api/auth/google', (_, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '?auth_warning=no_google_creds');
    }
    res.redirect(authUrl());
  } catch (e: any) {
    res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '?auth_error=' + encodeURIComponent(e.message));
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const t = await exchange(String(req.query.code));
    const id = randomUUID();
    sessions.set(id, t);
    res.cookie('jarvis_sid', id, { httpOnly: true, sameSite: 'lax', signed: true });
    // Switch offlineMode to false upon successful Google connection
    store.updateSettings({ offlineMode: false });
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch (e) {
    res.status(500).send('Google authentication failed. You can continue in Stark Local Vault mode.');
  }
});

app.get('/api/auth/status', (req, res) => {
  const settings = store.settings();
  const googleConnected = !!getGoogleTokens(req, res);
  res.json({
    connected: googleConnected,
    offlineMode: settings.offlineMode,
    mode: settings.offlineMode ? 'STARK_LOCAL_VAULT' : 'GOOGLE_CLOUD_SYNC'
  });
});

app.post('/api/auth/logout', (req, res) => {
  const id = req.signedCookies?.jarvis_sid;
  if (id) sessions.delete(id);
  res.clearCookie('jarvis_sid');
  res.json({ ok: true });
});

// Calendar API - Dual Mode (Google Cloud if active, else Stark Local Store)
app.get('/api/calendar', async (req, res) => {
  try {
    const settings = store.settings();
    const t = getGoogleTokens(req, res);

    if (!settings.offlineMode && t) {
      const googleEvents = await calendarList(t);
      return res.json({ events: googleEvents, source: 'google_cloud' });
    }

    // Return Stark Local Vault calendar events
    res.json({ events: store.calendar(), source: 'stark_vault' });
  } catch (e: any) {
    // Graceful fallback to local vault on any Google error
    res.json({ events: store.calendar(), source: 'stark_vault_fallback', error: e.message });
  }
});

app.post('/api/calendar', async (req, res) => {
  try {
    const settings = store.settings();
    const t = getGoogleTokens(req, res);
    const { title, start, end, description } = req.body;

    if (!settings.offlineMode && t) {
      const googleEvent = await calendarCreate(t, req.body);
      return res.json(googleEvent);
    }

    // Save in Stark Local Vault
    const newEvent = {
      id: 'cal-' + randomUUID(),
      summary: title || 'Stark Strategy Session',
      description: description || 'Created by JARVIS Command',
      start: { dateTime: start ? new Date(start).toISOString() : new Date().toISOString() },
      end: {
        dateTime: end
          ? new Date(end).toISOString()
          : new Date(new Date(start || Date.now()).getTime() + 3600000).toISOString()
      },
      created: new Date().toISOString()
    };

    const saved = store.addCalendarEvent(newEvent);
    res.json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/calendar/:id', (req, res) => {
  store.deleteCalendarEvent(req.params.id);
  res.json({ ok: true });
});

// Drive / Stark Archive API - Dual Mode
app.get('/api/drive', async (req, res) => {
  try {
    const settings = store.settings();
    const t = getGoogleTokens(req, res);
    const query = req.query.q as string | undefined;

    if (!settings.offlineMode && t) {
      const googleFiles = await driveList(t, query);
      return res.json({ files: googleFiles, source: 'google_cloud' });
    }

    // Stark Local Vault Drive files
    const localFiles = store.driveFiles(query);
    res.json({ files: localFiles, source: 'stark_vault' });
  } catch (e: any) {
    res.json({ files: store.driveFiles(req.query.q as string), source: 'stark_vault_fallback' });
  }
});

app.post('/api/drive/folders', async (req, res) => {
  try {
    const settings = store.settings();
    const t = getGoogleTokens(req, res);
    const { name, parentId } = req.body;

    if (!settings.offlineMode && t) {
      const gFolder = await driveCreateFolder(t, name, parentId);
      return res.json(gFolder);
    }

    const folder = {
      id: 'folder-' + randomUUID(),
      name: name || 'New Stark Archive Directory',
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : ['folder-stark-core'],
      modifiedTime: new Date().toISOString()
    };
    store.addDriveFolder(folder);
    res.json(folder);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/drive/upload', upload.single('file'), async (req: any, res) => {
  try {
    const settings = store.settings();
    const t = getGoogleTokens(req, res);

    if (!req.file) return res.status(400).json({ error: 'No file selected for upload' });

    if (!settings.offlineMode && t) {
      const gResult = await driveUpload(t, req.file, req.body.parentId);
      return res.json(gResult);
    }

    // Store in Stark Local Vault Archive
    const localFile = {
      id: 'file-' + randomUUID(),
      name: req.file.originalname,
      mimeType: req.file.mimetype || 'application/octet-stream',
      size: req.file.size,
      parents: req.body.parentId ? [req.body.parentId] : ['folder-stark-core'],
      modifiedTime: new Date().toISOString(),
      localPath: req.file.path,
      webViewLink: '#local-view-' + req.file.filename
    };

    store.addDriveFile(localFile);
    res.json(localFile);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/drive/:id', (req, res) => {
  store.deleteDriveFile(req.params.id);
  res.json({ ok: true });
});

// Reminders API
app.get('/api/reminders', (_, res) => res.json({ reminders: store.reminders() }));
app.post('/api/reminders', (req, res) => {
  const reminder = store.addReminder({
    id: 'rem-' + randomUUID(),
    title: req.body.title || 'Untitled Reminder',
    due: req.body.due || new Date(Date.now() + 3600000).toISOString(),
    done: false,
    createdAt: new Date().toISOString()
  });
  res.json(reminder);
});
app.patch('/api/reminders/:id', (req, res) => {
  const r = store.updateReminder(req.params.id, req.body);
  if (!r) return res.status(404).json({ error: 'Reminder not found' });
  res.json(r);
});
app.delete('/api/reminders/:id', (req, res) => {
  store.deleteReminder(req.params.id);
  res.json({ ok: true });
});

// Comms & History API
app.get('/api/comms', (_, res) => res.json({ comms: store.comms() }));
app.get('/api/history', (_, res) => res.json({ history: store.history() }));
app.post('/api/history/clear', (_, res) => {
  store.clearHistory();
  res.json({ ok: true });
});

// Natural Language Command Parsing
app.post('/api/commands/parse', async (req, res) => {
  try {
    const parsed = await parseCommand(req.body.input || '');
    res.json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Action Execution Pipeline with Confirmation and Consequential Handling
app.post('/api/actions/execute', async (req, res) => {
  const { action, confirmed } = req.body;
  if (!action) return res.status(400).json({ error: 'No action specified' });

  const base: any = {
    id: action.id || randomUUID(),
    type: action.type,
    description: action.description,
    status: 'running',
    timestamp: new Date().toISOString()
  };

  try {
    // Intercept consequential action requiring explicit user confirmation
    if (action.requiresConfirmation && !confirmed) {
      const h = store.addHistory({
        ...base,
        status: 'awaiting_confirmation'
      });
      return res.json({ needsConfirmation: true, history: h, action });
    }

    let result: any = {};
    const settings = store.settings();
    const t = getGoogleTokens(req, res);

    if (action.type === 'calendar') {
      if (action.payload?.view) {
        result = { viewed: true, message: 'Calendar agenda brought to focus.' };
      } else {
        if (!settings.offlineMode && t) {
          result = await calendarCreate(t, action.payload);
        } else {
          result = store.addCalendarEvent({
            id: 'cal-' + randomUUID(),
            summary: action.payload.title || 'Stark Strategic Event',
            description: action.payload.description || 'Automated by JARVIS',
            start: {
              dateTime: action.payload.start
                ? new Date(action.payload.start).toISOString()
                : new Date().toISOString()
            },
            end: {
              dateTime: action.payload.end
                ? new Date(action.payload.end).toISOString()
                : new Date(new Date(action.payload.start || Date.now()).getTime() + 3600000).toISOString()
            },
            created: new Date().toISOString()
          });
        }
      }
    } else if (action.type === 'reminder') {
      if (action.payload?.view) {
        result = { viewed: true, message: 'Reminders list displayed.' };
      } else {
        result = store.addReminder({
          id: 'rem-' + randomUUID(),
          title: action.payload.title || 'Reactor check',
          due: action.payload.due || new Date(Date.now() + 3600000).toISOString(),
          done: false,
          createdAt: new Date().toISOString()
        });
      }
    } else if (action.type === 'drive') {
      if (action.payload?.query) {
        if (!settings.offlineMode && t) {
          result = await driveList(t, action.payload.query);
        } else {
          result = store.driveFiles(action.payload.query);
        }
      } else if (action.payload?.uploadPrompt) {
        result = { promptUpload: true, message: 'Drive upload terminal activated.' };
      } else {
        result = { message: 'Displaying Stark Archive.' };
      }
    } else if (action.type === 'telegram') {
      const msg = action.payload.message || 'Mission status update.';
      const recipient = action.payload.recipient || '@bruce_banner';
      result = await sendTelegram(msg, recipient);

      // Record in communications hub
      store.addComm({
        id: 'comm-' + randomUUID(),
        recipient,
        message: msg,
        status: 'delivered',
        timestamp: new Date().toISOString()
      });
    }

    const h = store.addHistory({
      ...base,
      status: 'success',
      result
    });

    res.json({ history: h, result, success: true });
  } catch (e: any) {
    const h = store.addHistory({
      ...base,
      status: 'error',
      error: e.message
    });
    res.status(500).json({ error: e.message, history: h });
  }
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`[JARVIS] Command Centre Core Online on http://localhost:${PORT}`);
  console.log(`[JARVIS] Mode: Stark Vault Active (Zero-Cloud Configuration)`);
});
