#!/usr/bin/env node
/**
 * ⟡ MirrorDNA MCP Server
 * Unified state for Claude Desktop, Claude Code, and Antigravity
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HOME = process.env.HOME || '/Users/mirror-admin';
const MIRRORDNA_DIR = process.env.MIRRORDNA_DIR || path.join(HOME, '.mirrordna');
const VAULT_DIR = process.env.VAULT_DIR || path.join(HOME, 'MirrorDNA-Vault');

// Inbox directories
const INBOX_DIR = path.join(MIRRORDNA_DIR, 'inbox');
const INBOX_PENDING = path.join(INBOX_DIR, 'pending');
const INBOX_PROCESSING = path.join(INBOX_DIR, 'processing');
const INBOX_COMPLETED = path.join(INBOX_DIR, 'completed');
const INBOX_FAILED = path.join(INBOX_DIR, 'failed');

// Ensure dirs exist
[MIRRORDNA_DIR, path.join(MIRRORDNA_DIR, 'completions'), path.join(MIRRORDNA_DIR, 'logs'),
 INBOX_PENDING, INBOX_PROCESSING, INBOX_COMPLETED, INBOX_FAILED].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helpers
function readJSON(filepath, defaultValue) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) { }
  return defaultValue;
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function appendLedger(client, action) {
  const ledgerPath = path.join(MIRRORDNA_DIR, 'ledger.md');
  const ts = new Date().toISOString();
  if (!fs.existsSync(ledgerPath)) {
    fs.writeFileSync(ledgerPath, '# ⟡ MirrorDNA Ledger\n\n');
  }
  fs.appendFileSync(ledgerPath, `${ts} | ${client} | ${action}\n`);
}

function timestamp() {
  return new Date().toISOString();
}

function generateTaskId() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TASK-${date}-${rand}`;
}

function getTaskStatus(taskId) {
  const dirs = [
    { dir: INBOX_PENDING, status: 'pending' },
    { dir: INBOX_PROCESSING, status: 'running' },
    { dir: INBOX_COMPLETED, status: 'complete' },
    { dir: INBOX_FAILED, status: 'failed' }
  ];

  for (const { dir, status } of dirs) {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const match = files.find(f => f.startsWith(taskId) || f.includes(taskId));
    if (match) {
      const filepath = path.join(dir, match);
      const content = fs.readFileSync(filepath, 'utf-8');
      return { status, file: match, path: filepath, content };
    }
  }
  return null;
}

// Tools
const tools = [
  {
    name: 'mirrordna_sync',
    description: 'Get full state: handoff, ledger, completions. Call at session start.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'mirrordna_pickup',
    description: 'Pick up pending work from last handoff.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'mirrordna_complete',
    description: 'Mark task complete. Writes completion and updates handoff.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'What was done' },
        files_modified: { type: 'array', items: { type: 'string' } },
        verification: { type: 'string' },
        next_client: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['summary']
    }
  },
  {
    name: 'mirrordna_handoff',
    description: 'Write handoff to another client.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'What you did' },
        pending: { type: 'string', description: 'What needs doing' },
        files_modified: { type: 'array', items: { type: 'string' } },
        next_client: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['action']
    }
  },
  {
    name: 'mirrordna_health',
    description: 'Check service health.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'mirrordna_log',
    description: 'Add entry to ledger.',
    inputSchema: {
      type: 'object',
      properties: { action: { type: 'string' } },
      required: ['action']
    }
  },
  {
    name: 'queue_task',
    description: 'Submit task to inbox queue.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description/content in markdown' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority' },
        timeout: { type: 'number', description: 'Timeout in minutes (optional)' },
        title: { type: 'string', description: 'Short task title' }
      },
      required: ['task', 'priority']
    }
  },
  {
    name: 'get_task_status',
    description: 'Check status of a queued task by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID to check' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'list_completions',
    description: 'List completed tasks with timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'ISO timestamp to filter completions after (optional)' },
        limit: { type: 'number', description: 'Max number of completions to return (default 20)' }
      },
      required: []
    }
  },
  {
    name: 'get_daemon_health',
    description: 'Get health status of all daemons in one call. Use at bootup.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  }
];

// Handlers
async function handleTool(name, args) {
  const handoffPath = path.join(MIRRORDNA_DIR, 'handoff.json');
  const statePath = path.join(MIRRORDNA_DIR, 'state.json');
  const ledgerPath = path.join(MIRRORDNA_DIR, 'ledger.md');

  switch (name) {
    case 'mirrordna_sync': {
      const state = readJSON(statePath, null);
      const handoff = readJSON(handoffPath, null);
      
      let ledger = [];
      if (fs.existsSync(ledgerPath)) {
        ledger = fs.readFileSync(ledgerPath, 'utf-8').split('\n').filter(l => l.includes('|')).slice(-10);
      }
      
      const today = timestamp().split('T')[0];
      const compDir = path.join(MIRRORDNA_DIR, 'completions', today);
      let completions = [];
      if (fs.existsSync(compDir)) {
        completions = fs.readdirSync(compDir).filter(f => f.endsWith('.json'));
      }
      
      return {
        timestamp: timestamp(),
        state,
        handoff,
        pending: handoff?.pending !== 'none' ? handoff?.pending : null,
        last_client: handoff?.client,
        last_action: handoff?.action,
        recent_ledger: ledger,
        today_completions: completions
      };
    }

    case 'mirrordna_pickup': {
      const handoff = readJSON(handoffPath, null);
      
      if (!handoff) return { status: 'no_handoff', message: 'No handoff. Ready for new work.' };
      if (!handoff.pending || handoff.pending === 'none') {
        return { status: 'nothing_pending', last_action: handoff.action, last_client: handoff.client };
      }
      
      handoff.notes = `Picked up by claude_code at ${timestamp()}. ${handoff.notes || ''}`;
      writeJSON(handoffPath, handoff);
      appendLedger('claude_code', `PICKUP: ${handoff.pending}`);
      
      return {
        status: 'picked_up',
        from_client: handoff.client,
        pending: handoff.pending,
        files_context: handoff.files_modified || [],
        notes: handoff.notes
      };
    }

    case 'mirrordna_complete': {
      const { summary, files_modified, verification, next_client, notes } = args;
      const ts = timestamp();
      const date = ts.split('T')[0];
      const id = `cc-${Date.now()}`;
      
      const compDir = path.join(MIRRORDNA_DIR, 'completions', date);
      if (!fs.existsSync(compDir)) fs.mkdirSync(compDir, { recursive: true });
      
      writeJSON(path.join(compDir, `${id}.json`), {
        id, timestamp: ts, client: 'claude_code', summary,
        files_modified: files_modified || [], verification, notes
      });
      
      writeJSON(handoffPath, {
        client: 'claude_code', timestamp: ts, action: summary,
        pending: 'none', files_modified: files_modified || [],
        verification, next_client: next_client || 'human', notes
      });
      
      appendLedger('claude_code', `COMPLETE: ${summary}`);
      return { status: 'completed', id };
    }

    case 'mirrordna_handoff': {
      const { action, pending, files_modified, next_client, notes } = args;
      const ts = timestamp();
      
      writeJSON(handoffPath, {
        client: 'claude_code', timestamp: ts, action,
        pending: pending || 'none', files_modified,
        next_client: next_client || 'claude_desktop', notes
      });
      
      appendLedger('claude_code', `HANDOFF → ${next_client || 'claude_desktop'}: ${action}`);
      
      if (next_client === 'ag' && pending) {
        const agDir = path.join(VAULT_DIR, 'Superagent', 'handoffs');
        if (!fs.existsSync(agDir)) fs.mkdirSync(agDir, { recursive: true });
        const hoId = `HO-${ts.split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-3)}`;
        fs.writeFileSync(path.join(agDir, `${hoId}.md`), 
          `# ⟡ HANDOFF: Claude Code → AG\n\n**ID:** ${hoId}\n**Task:** ${pending}\n**Context:** ${action}\n`);
        return { status: 'handoff_written', next_client, ag_handoff_id: hoId };
      }
      
      return { status: 'handoff_written', next_client: next_client || 'claude_desktop' };
    }

    case 'mirrordna_health': {
      const check = async (url) => {
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 2000);
          const r = await fetch(url, { signal: ctrl.signal });
          return r.ok ? 'up' : 'down';
        } catch { return 'down'; }
      };
      
      const [mb, inf, ui] = await Promise.all([
        check('http://localhost:8081/api/system/state'),
        check('http://localhost:8086/health'),
        check('http://localhost:8087')
      ]);
      
      const state = { timestamp: timestamp(), services: { mirrorbrain: mb, inference: inf, ui }, overall: mb === 'up' ? 'healthy' : 'degraded' };
      writeJSON(statePath, state);
      return state;
    }

    case 'mirrordna_log': {
      appendLedger('claude_code', args.action);
      return { status: 'logged' };
    }

    case 'queue_task': {
      const { task, priority, timeout, title } = args;
      const ts = timestamp();
      const taskId = generateTaskId();
      const taskTitle = title || task.split('\n')[0].replace(/^#\s*/, '').substring(0, 50);

      const taskContent = `---
type: autonomous-task
id: ${taskId}
priority: ${priority}
created: ${ts}
${timeout ? `timeout: ${timeout}m` : ''}
---

# ${taskTitle}

${task}
`;

      const filename = `${taskId}.md`;
      fs.writeFileSync(path.join(INBOX_PENDING, filename), taskContent);
      appendLedger('mcp', `QUEUE_TASK: ${taskId} [${priority}] ${taskTitle}`);

      return {
        status: 'queued',
        task_id: taskId,
        priority,
        location: path.join(INBOX_PENDING, filename),
        created: ts
      };
    }

    case 'get_task_status': {
      const { task_id } = args;
      const result = getTaskStatus(task_id);

      if (!result) {
        return { status: 'not_found', task_id };
      }

      return {
        task_id,
        status: result.status,
        file: result.file,
        path: result.path
      };
    }

    case 'list_completions': {
      const { since, limit = 20 } = args;
      const sinceDate = since ? new Date(since) : null;
      const completions = [];

      // Scan completed inbox
      if (fs.existsSync(INBOX_COMPLETED)) {
        const files = fs.readdirSync(INBOX_COMPLETED).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const filepath = path.join(INBOX_COMPLETED, file);
          const stat = fs.statSync(filepath);
          if (sinceDate && stat.mtime < sinceDate) continue;

          const content = fs.readFileSync(filepath, 'utf-8');
          const idMatch = content.match(/^id:\s*(.+)$/m);
          const titleMatch = content.match(/^#\s+(.+)$/m);

          completions.push({
            file,
            task_id: idMatch ? idMatch[1] : file.replace('.md', ''),
            title: titleMatch ? titleMatch[1] : file,
            completed_at: stat.mtime.toISOString()
          });
        }
      }

      // Also scan completions dir for JSON completions
      const compBase = path.join(MIRRORDNA_DIR, 'completions');
      if (fs.existsSync(compBase)) {
        const dateDirs = fs.readdirSync(compBase).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
        for (const dateDir of dateDirs.slice(-7)) {
          const dirPath = path.join(compBase, dateDir);
          const jsonFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
          for (const jf of jsonFiles) {
            const data = readJSON(path.join(dirPath, jf), null);
            if (!data) continue;
            if (sinceDate && new Date(data.timestamp) < sinceDate) continue;

            completions.push({
              file: jf,
              task_id: data.id,
              title: data.summary,
              completed_at: data.timestamp,
              client: data.client
            });
          }
        }
      }

      completions.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
      return {
        completions: completions.slice(0, limit),
        total: completions.length
      };
    }

    case 'get_daemon_health': {
      const daemonDir = path.join(MIRRORDNA_DIR, 'daemon');
      const daemons = {};

      // Check daemon status files
      if (fs.existsSync(daemonDir)) {
        const statusFiles = fs.readdirSync(daemonDir).filter(f => f.endsWith('.status'));
        for (const sf of statusFiles) {
          const daemonName = sf.replace('.status', '');
          try {
            const status = JSON.parse(fs.readFileSync(path.join(daemonDir, sf), 'utf-8'));
            daemons[daemonName] = {
              status: status.status || 'unknown',
              last_heartbeat: status.last_heartbeat,
              uptime_seconds: status.uptime_seconds || 0,
              restarts: status.restarts || 0
            };
          } catch (e) {
            daemons[daemonName] = { status: 'error', error: 'failed to read status' };
          }
        }

        // Check PID files
        const pidFiles = fs.readdirSync(daemonDir).filter(f => f.endsWith('.pid'));
        for (const pf of pidFiles) {
          const daemonName = pf.replace('.pid', '');
          try {
            const pid = parseInt(fs.readFileSync(path.join(daemonDir, pf), 'utf-8').trim());
            // Check if process is running
            try {
              process.kill(pid, 0);
              if (!daemons[daemonName]) {
                daemons[daemonName] = { status: 'running', pid };
              } else {
                daemons[daemonName].pid = pid;
              }
            } catch (e) {
              if (!daemons[daemonName]) {
                daemons[daemonName] = { status: 'dead', stale_pid_file: true };
              } else {
                daemons[daemonName].status = 'dead';
                daemons[daemonName].stale_pid_file = true;
              }
            }
          } catch (e) { }
        }
      }

      // Also check service health
      const serviceChecks = [
        { name: 'mirrorbrain', url: 'http://localhost:8081/api/system/state' },
        { name: 'inference', url: 'http://localhost:8086/health' },
        { name: 'ollama', url: 'http://localhost:11434/api/tags' },
        { name: 'ui', url: 'http://localhost:8087' }
      ];

      const checkHealth = async (url) => {
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 2000);
          const r = await fetch(url, { signal: ctrl.signal });
          return r.ok ? 'up' : 'down';
        } catch { return 'down'; }
      };

      const serviceResults = await Promise.all(
        serviceChecks.map(async (s) => ({ name: s.name, status: await checkHealth(s.url) }))
      );

      const services = {};
      for (const r of serviceResults) {
        services[r.name] = { status: r.status };
      }

      return {
        timestamp: timestamp(),
        daemons,
        services,
        overall: Object.values(services).every(s => s.status === 'up') ? 'healthy' : 'degraded'
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Server
const server = new Server(
  { name: 'mirrordna', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await handleTool(request.params.name, request.params.arguments || {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

// Run
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('⟡ MirrorDNA MCP Server running');
