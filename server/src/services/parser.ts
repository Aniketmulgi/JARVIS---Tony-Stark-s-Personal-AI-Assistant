import { randomUUID } from 'node:crypto';
import type { ParsedCommand, CommandAction } from '../types/index.js';

function action(
  type: any,
  description: string,
  payload: any,
  confirm = false
): CommandAction {
  return {
    id: randomUUID(),
    type,
    description,
    payload,
    requiresConfirmation: confirm
  };
}

function parseRelativeTime(s: string): string {
  const now = new Date();
  const lower = s.toLowerCase();

  const d = new Date(now);

  if (lower.includes('tomorrow')) {
    d.setDate(d.getDate() + 1);
  } else if (lower.includes('tonight')) {
    // Keep today's date
  }

  // Check for specific time like 5 PM, 4:30 AM, 18:00
  const tMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (tMatch) {
    let h = parseInt(tMatch[1], 10);
    const min = parseInt(tMatch[2] || '0', 10);
    const meridiem = (tMatch[3] || '').toUpperCase();

    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    d.setHours(h, min, 0, 0);
  } else if (lower.includes('morning')) {
    d.setHours(9, 0, 0, 0);
  } else if (lower.includes('evening') || lower.includes('night')) {
    d.setHours(20, 0, 0, 0);
  } else if (lower.includes('afternoon')) {
    d.setHours(14, 0, 0, 0);
  } else {
    // Default to 1 hour from now
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }

  return d.toISOString();
}

export async function parseCommand(input: string): Promise<ParsedCommand> {
  const raw = input.trim();
  const s = raw.replace(/^JARVIS[,:]?\s*/i, '').trim();
  const actions: CommandAction[] = [];

  // 1. Optional LLM API parser
  if (process.env.AI_API_KEY) {
    try {
      const r = await fetch(
        `${process.env.AI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${process.env.AI_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || 'gpt-4o-mini',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You are JARVIS, Tony Stark\'s AI Assistant. Parse user requests into structured actions. Return JSON only: {"reply": string, "actions": [{"type": "calendar"|"reminder"|"drive"|"telegram", "description": string, "payload": object, "requiresConfirmation": boolean}]}. Consequential actions like creating calendar events or sending messages should have requiresConfirmation: true.'
              },
              { role: 'user', content: s }
            ]
          })
        }
      );
      if (r.ok) {
        const j: any = await r.json();
        const parsed = JSON.parse(j.choices?.[0]?.message?.content || '{}');
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          return {
            reply: parsed.reply || `Executing protocol: ${parsed.actions.length} action(s) prepared.`,
            actions: parsed.actions.map((a: any) => ({
              ...a,
              id: a.id || randomUUID()
            }))
          };
        }
      }
    } catch (e) {
      console.warn('AI Parser endpoint unavailable, using deterministic Stark intelligence engine.');
    }
  }

  // 2. Multi-Action Stark Intelligent Rule Engine
  // Check for multi-clause commands split by "and", "then", or comma
  // e.g., "schedule the Stark team meeting for tomorrow at 6 PM, remind me 30 minutes before it, and send Bruce a Telegram message about it"

  // Check Calendar actions
  if (/schedule|meeting|calendar event|book an appointment/i.test(s)) {
    let title = 'Stark Strategic Meeting';
    const meetWith = s.match(/(?:meeting|event)\s+(?:with\s+([^,]+?))(?:\s+tomorrow|\s+today|\s+at|\s+on|,|\.|$)/i);
    const scheduleMatch = s.match(/schedule\s+(?:the\s+)?([^,]+?)(?:\s+for|\s+tomorrow|\s+today|\s+at|,|\.|$)/i);

    if (meetWith && meetWith[1]) {
      title = `Meeting with ${meetWith[1].trim()}`;
    } else if (scheduleMatch && scheduleMatch[1]) {
      title = scheduleMatch[1].trim();
      if (!title.toLowerCase().startsWith('meeting') && !title.toLowerCase().startsWith('the')) {
        title = `Meeting: ${title}`;
      }
    }

    const start = parseRelativeTime(s);
    actions.push(
      action(
        'calendar',
        `Schedule Calendar Event: “${title}”`,
        { title, start, description: `Scheduled by JARVIS from command: "${raw}"` },
        true // Confirmation requested for calendar creation
      )
    );
  }

  // Check Reminder actions
  if (/remind me|set a reminder|reminder/i.test(s) && !/what reminders/i.test(s)) {
    const remMatch = s.match(/remind me\s+(?:to\s+|about\s+|that\s+)?(.+?)(?:\s+(?:at|on|tomorrow|in|before)\s+(.+))?$/i);
    let remTitle = 'Reactor calibration check';
    let due = new Date(Date.now() + 3600000).toISOString();

    if (remMatch && remMatch[1]) {
      remTitle = remMatch[1].replace(/,.*$/, '').trim();
      // If it contains time part in the remainder
      const timePart = (remMatch[2] || '') + ' ' + s;
      due = parseRelativeTime(timePart);
    }

    actions.push(
      action('reminder', `Set Reminder: “${remTitle}”`, {
        title: remTitle,
        due
      })
    );
  }

  // Check Telegram / Message actions
  if (/send|message|telegram|text/i.test(s) && /bruce|team|pepper|rhodey|natasha|steve|thor|peter|jarvis|banner|all/i.test(s)) {
    let recipient = 'Bruce Banner (@bruce_banner)';
    if (/pepper/i.test(s)) recipient = 'Pepper Potts (@pepper_potts)';
    if (/rhodey|war machine/i.test(s)) recipient = 'James Rhodes (@warmachine)';
    if (/team|avengers/i.test(s)) recipient = 'Avengers Core Team (@avengers_hq)';
    if (/peter|spiderman|parker/i.test(s)) recipient = 'Peter Parker (@spidey)';

    let messageText = 'The scheduled experiment and mission updates are prepared.';
    const msgExtract = s.match(/(?:saying|that says|message|text)\s*[:]?\s*["']?([^"']+)["']?$/i);
    if (msgExtract && msgExtract[1]) {
      messageText = msgExtract[1].trim();
    } else if (/postponed/i.test(s)) {
      messageText = 'The experiment has been postponed to tomorrow.';
    }

    actions.push(
      action(
        'telegram',
        `Send Telegram message to ${recipient}`,
        { recipient, message: messageText },
        true // Confirmation requested for messaging
      )
    );
  }

  // Check Drive / Document search
  if (/find|search|locate|look for/i.test(s) && /report|file|doc|schematic|paper|archive|drive|reactor/i.test(s)) {
    const findMatch = s.match(/(?:find|search for|locate|look for)\s+(?:the\s+)?([^,]+)/i);
    const query = findMatch ? findMatch[1].replace(/in drive|in the archive|please|jarvis/gi, '').trim() : 'reactor';
    actions.push(
      action('drive', `Search Stark Archive for “${query}”`, { query, search: true })
    );
  }

  // Check Drive upload request
  if (/upload|store file|save file|archive this/i.test(s)) {
    actions.push(
      action('drive', 'Open Stark Archive File Uploader', { uploadPrompt: true })
    );
  }

  // Check schedule/calendar inspection queries
  if (/what do i have scheduled|upcoming events|check calendar|my schedule/i.test(s) && !actions.some(a => a.type === 'calendar')) {
    actions.push(
      action('calendar', 'Display Stark Calendar Agenda', { view: true })
    );
  }

  // Check reminder inspection queries
  if (/what reminders|active reminders|check reminders|list reminders/i.test(s) && !actions.some(a => a.type === 'reminder')) {
    actions.push(
      action('reminder', 'Display Active Stark Reminders', { view: true })
    );
  }

  // Check drive inspection query
  if (/show drive|view archive|list files|open vault/i.test(s) && !actions.some(a => a.type === 'drive')) {
    actions.push(
      action('drive', 'Display Stark Archive File Vault', { view: true })
    );
  }

  // Fallback / Clarification if nothing matched
  if (actions.length === 0) {
    return {
      reply:
        "I'm at your service, Tony. I couldn't identify specific parameters. You can ask me to schedule a meeting, set reminders, search or upload files to the Archive, or dispatch Telegram messages.",
      actions: []
    };
  }

  const multiStep = actions.length > 1;
  const reply = multiStep
    ? `Understood, Tony. Deconstructed command into ${actions.length} sequential operations.`
    : `Right away, sir. Prepared ${actions[0].description}.`;

  return { reply, actions };
}
