import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { createServer } from 'node:http';

export const name = 'dsh-choice';
export const inject = ['tools'];

const dataRoot = () => {
  const base = process.env.LOCALAPPDATA
    || (process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support') : join(homedir(), '.local', 'share'));
  return join(base, 'dsh-choice');
};

const TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
};

/**
 * A choice board printed as the final message of a turn.
 *
 * The tool renders the card and returns immediately; the user's click posts a
 * normal chat message, which starts the next turn. The card itself never blocks
 * the agent and becomes inert after a pick.
 */
export function apply(ctx, config = {}) {
  const root = dataRoot();
  const mediaDir = join(root, 'media');
  mkdirSync(mediaDir, { recursive: true });
  const port = Number.isFinite(config.bridgePort) ? Number(config.bridgePort) : 49236;
  const base = `http://127.0.0.1:${port}`;
  const media = new Map();

  const attach = (source) => {
    if (typeof source !== 'string' || !source) return null;
    if (/^https?:\/\//i.test(source)) return source;
    if (!isAbsolute(source) || !existsSync(source)) return null;
    const ext = extname(source).toLowerCase();
    if (!TYPES[ext]) return null;
    if (statSync(source).size > 25 * 1024 * 1024) return null;
    const name = `${createHash('sha1').update(source).digest('hex').slice(0, 12)}${ext}`;
    const target = join(mediaDir, name);
    if (!existsSync(target)) writeFileSync(target, readFileSync(source));
    media.set(name, TYPES[ext]);
    return `${base}/media/${name}`;
  };

  const tool = {
    name: 'ask_user_choice',
    description:
      'Ask the user to pick exactly one option when the options are images, sounds, or mixed media, '
      + 'or when the turn should end and the user can answer whenever they want. '
      + 'For plain-text choices prefer the standard ask_user_question. '
      + 'Options are text, image or audio. The user presses the pick button on one row; a normal chat message '
      + 'with that choice is posted and starts the next turn. After that the card stops accepting picks, '
      + 'but its sounds and image previews stay playable. A trailing "none of these" row is always added - '
      + 'pass its label as noneLabel. This tool returns immediately and never blocks the turn, unlike '
      + 'ask_user_question which waits for the answer. Write every visible text (title, subtitle, option titles '
      + 'and descriptions, noneLabel) in the language you are speaking with the user.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', description: 'Board heading' },
        subtitle: { type: 'string', description: 'Optional one-line hint under the heading' },
        options: {
          type: 'array',
          description: 'Two to eight options',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              kind: { type: 'string', enum: ['text', 'image', 'audio'] },
              title: { type: 'string' },
              description: { type: 'string' },
              value: { type: 'string', description: 'Text sent to the chat for kind=text' },
              src: { type: 'string', description: 'Image or audio: http(s) URL or absolute local path' },
            },
            required: ['kind'],
          },
        },
        noneLabel: { type: 'string', description: 'Label of the trailing "none of these" row' },
      },
      required: ['options'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          boardId: { type: 'string' },
          shown: { type: 'boolean' },
          media: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { index: { type: 'number' }, url: { type: 'string' } },
            },
          },
        },
        required: ['shown'],
      },
      render: (_args, value) => [{ type: 'text', text: `[media:${JSON.stringify(value.media ?? [])}]` }],
    },
    async execute(args, exec) {
      const depth = exec?.agent?.options?.subagentDepth;
      const isSubagent = exec?.parent !== undefined
        || exec?.agent?.address !== undefined
        || (typeof depth === 'number' && depth > 0);
      if (isSubagent) {
        throw new Error('human interaction is unavailable while the calling agent is owned by another live agent; include the unresolved question or decision in the child agent\'s final result');
      }
      const options = Array.isArray(args?.options) ? args.options : [];
      if (options.length < 2) throw new Error('options must contain at least two items');
      if (options.length > 8) throw new Error('at most 8 options per board');
      const media = [];
      options.forEach((option, index) => {
        if (!['text', 'image', 'audio'].includes(option?.kind)) {
          throw new Error(`option ${index + 1}: kind must be text, image or audio`);
        }
        if (option.kind === 'text') return;
        const url = attach(option.src);
        if (!url) throw new Error(`option ${index + 1}: src must be an http(s) URL or an existing image/audio file`);
        media.push({ index, url });
      });
      return { boardId: randomUUID().slice(0, 8), shown: true, media };
    },
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', base);
    const json = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && url.pathname === '/status') {
      json(200, { ok: true, port, media: media.size });
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
      const fileName = url.pathname.slice('/media/'.length);
      const type = media.get(fileName) ?? TYPES[extname(fileName).toLowerCase()];
      const file = join(mediaDir, fileName);
      if (!type || !existsSync(file)) {
        json(404, { ok: false, error: 'unknown media' });
        return;
      }
      res.writeHead(200, { 'content-type': type, 'content-length': statSync(file).size, 'cache-control': 'no-store' });
      createReadStream(file).pipe(res);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/attach') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; if (body.length > 4096) req.destroy(); });
      req.on('end', () => {
        try {
          const { path } = body ? JSON.parse(body) : {};
          const attached = attach(path);
          if (!attached) {
            json(400, { ok: false, error: 'cannot attach this file' });
            return;
          }
          json(200, { ok: true, url: attached });
        } catch (error) {
          json(400, { ok: false, error: String(error?.message ?? error) });
        }
      });
      return;
    }
    json(404, { ok: false, error: 'not found' });
  });

  ctx.effect(() => {
    const dispose = ctx.tools.register(tool);
    return () => {
      server.close?.();
      dispose?.();
    };
  });
  server.once('error', () => {});
  server.listen(port, '127.0.0.1');
}
