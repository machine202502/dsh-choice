window.__ModuleLoader__.load({
  id: 'dsh-choice',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const LOCALE = (() => {
      const candidates = [
        document.documentElement.lang,
        ...(Array.isArray(navigator.languages) ? navigator.languages : []),
        navigator.language,
      ].filter((value) => typeof value === 'string' && value.length > 0).map((value) => value.toLowerCase());
      return candidates.some((value) => value.startsWith('ru')) ? 'ru' : 'en';
    })();

    const STRINGS = {
      en: { select: 'Select', play: 'Play', open: 'Open' },
      ru: { select: 'Выбрать', play: 'Воспроизвести', open: 'Открыть' },
    };
    const t = STRINGS[LOCALE];

    const ensureStyles = () => {
      if (document.querySelector('style[data-plugin="choice-board"]')) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'choice-board';
      tag.textContent = `
.cb-card { pointer-events: auto; display: flex; flex-direction: column; gap: 2px; padding: 6px 0; margin: 6px 0; width: 100%; box-sizing: border-box;
  border: .5px solid var(--dsw-alias-border-l1, rgba(0,0,0,.10)); border-radius: 16px;
  background: var(--dsw-alias-bg-l1, rgba(0,0,0,.015)); max-width: 640px; overflow: hidden; }
.cb-head { display: flex; flex-direction: column; gap: 2px; padding: 10px 14px 8px; }
.cb-title { font-size: 14px; font-weight: 600; }
.cb-sub { font-size: 12px; opacity: .6; }
.cb-row { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 10px 14px;
  border-top: .5px solid var(--dsw-alias-border-l1, rgba(0,0,0,.07)); }
.cb-row--selected { background: rgba(91,140,255,.08); }
.cb-media { flex: none; width: 52px; height: 52px; border-radius: 10px; overflow: hidden; padding: 0;
  border: none; background: var(--dsw-alias-bg-l2, rgba(0,0,0,.05)); cursor: pointer;
  display: flex; align-items: center; justify-content: center; }
.cb-media--static { cursor: default; }
.cb-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.cb-play { width: 34px; height: 34px; border-radius: 999px; border: none; background: #0F1720; color: #5B8CFF;
  font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.cb-play:disabled { opacity: .5; cursor: default; }
.cb-row--selected .cb-play { color: #5B8CFF; }
.cb-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.cb-label { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-desc { font-size: 12px; line-height: 16px; opacity: .6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cb-select { flex: none; width: 28px; height: 28px; padding: 0; border-radius: 999px; border: .5px solid var(--dsw-alias-border-l2, rgba(0,0,0,.18));
  background: transparent; color: inherit; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; }
.cb-select:hover { background: var(--dsw-alias-bg-l2, rgba(0,0,0,.05)); }
.cb-select[disabled] { cursor: default; opacity: .5; }
.cb-select--picked { border-color: #5B8CFF; color: #3b6fd8; background: rgba(91,140,255,.10); opacity: 1; }
.cb-lightbox { position: fixed; inset: 0; z-index: 4000; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.55); backdrop-filter: blur(2px); }
.cb-lightbox-card { max-width: min(90vw, 1100px); max-height: 88vh; display: flex; flex-direction: column; gap: 8px;
  background: var(--dsw-alias-bg-l1, #fff); border-radius: 16px; padding: 10px; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
.cb-lightbox-img { max-width: 100%; max-height: 76vh; object-fit: contain; border-radius: 10px; display: block; }
.cb-lightbox-cap { font-size: 12px; opacity: .7; padding: 0 4px 2px; }
`;
      document.head.appendChild(tag);
    };

    const isUrl = (value) => /^https?:\/\//i.test(value ?? '');
    const ourCalls = new Set();

    const cardDefinition = {
      kind: 'choice-board',
      target: 'chat',
      match: (event) => {
        if (event?.type === 'tool/call') {
          if (event.data?.name !== 'ask_user_choice') return null;
          const id = String(event.data.callId);
          ourCalls.add(id);
          return { id, role: 'start' };
        }
        if (event?.type === 'tool/result') {
          const callId = event.data?.message?.source?.callId;
          if (typeof callId !== 'string' || !ourCalls.has(String(callId))) return null;
          return { id: String(callId), role: 'update' };
        }
        return null;
      },
      start: (_context, match) => {
        let args = {};
        try {
          args = JSON.parse(match.event.data?.arguments ?? '{}');
        } catch {
          args = {};
        }
        return { id: match.id, seq: match.event.seq, args, result: null, media: {} };
      },
      update: (context, match) => {
        const text = (match.event.data?.message?.content ?? [])
          .filter((item) => item && item.type === 'text')
          .map((item) => item.text ?? '')
          .join('\n');
        const media = { ...(context.state.media ?? {}) };
        const matchMedia = /\[media:(\[[\s\S]*\])\]/.exec(text);
        if (matchMedia) {
          try {
            for (const item of JSON.parse(matchMedia[1])) {
              if (typeof item?.index === 'number' && typeof item?.url === 'string') media[item.index] = item.url;
            }
          } catch {
            // Malformed media map: the rows simply show placeholders.
          }
        }
        return { ...context.state, result: text || null, media };
      },
      buildViewNode: (context) => {
        const state = context.state;
        if (!state) return null;
        return {
          key: context.key,
          kind: 'choice-board',
          id: context.id,
          target: 'chat',
          anchorSeq: state.seq,
          location: context.location ?? { kind: 'chat' },
          visibility: 'visible',
          data: { ...state, nodeKey: context.key },
        };
      },
    };

    const findComposer = () => document.querySelector('[contenteditable="true"][role="textbox"]')
      ?? document.querySelector('[contenteditable="true"]')
      ?? document.querySelector('textarea');

    const composerText = (area) => (area instanceof HTMLTextAreaElement ? area.value : (area.innerText ?? area.textContent ?? '')).trim();

    const setComposerText = (area, text) => {
      area.focus();
      if (area instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(area, text);
        area.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      document.execCommand('selectAll');
      if (text.length === 0) document.execCommand('delete');
      else document.execCommand('insertText', false, text);
    };

    const findSendButton = () => [...document.querySelectorAll('button')]
      .find((button) => /send|submit|отправ/i.test(button.getAttribute('aria-label') ?? button.title ?? ''));

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendMessage = async (text) => {
      const area = findComposer();
      if (!area) return false;
      const draft = composerText(area);
      setComposerText(area, text);
      await sleep(120);
      const send = findSendButton();
      if (send) {
        send.click();
      } else {
        area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      }
      await sleep(200);
      if (draft && composerText(area) === '') setComposerText(area, draft);
      return true;
    };


    function ChoiceCard(props) {
      ensureStyles();
      const data = props?.node?.data ?? {};
      const args = data.args ?? {};
      const callId = data.seq !== undefined && data.seq !== null ? String(data.seq) : (data.nodeKey ?? data.id ?? 'board');
      const options = Array.isArray(args.options) ? args.options : [];
      const [loaded, setLoaded] = React.useState({});
      const [picked, setPicked] = React.useState(null);
      const [playing, setPlaying] = React.useState(null);
      const [zoom, setZoom] = React.useState(null);
      const audioRef = React.useRef(null);


      React.useEffect(() => () => { audioRef.current?.pause?.(); }, []);
      React.useEffect(() => {
        if (!zoom) return undefined;
        const onKey = (event) => { if (event.key === 'Escape') setZoom(null); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
      }, [zoom]);

      const sourceOf = (option, index) => (isUrl(option?.src) ? option.src : (data.media?.[index] ?? loaded[index] ?? null));
      const labelOf = (option, index) => option?.title ?? option?.id ?? `option-${index + 1}`;
      const valueOf = (option, index) => (typeof option?.value === 'string' ? option.value : labelOf(option, index));

      const choose = async (option, index, none) => {
        if (picked) return;
        const text = none ? (args.noneLabel || '—') : valueOf(option, index);
        const id = none ? '__none__' : String(option?.id ?? `option-${index + 1}`);
        setPicked(id);
        await sendMessage(text);
      };

      const togglePlay = (index, source) => {
        if (!source) return;
        if (audioRef.current && playing === index) {
          audioRef.current.pause();
          setPlaying(null);
          return;
        }
        audioRef.current?.pause?.();
        const audio = new Audio(source);
        audioRef.current = audio;
        audio.onended = () => setPlaying(null);
        void audio.play();
        setPlaying(index);
      };

      const selectButton = (selected, disabled, onClick) => h('button', {
        type: 'button',
        className: `cb-select${selected ? ' cb-select--picked' : ''}`,
        disabled,
        title: t.select,
        'aria-label': t.select,
        onClick: (event) => { event.stopPropagation(); onClick(); },
      }, '✓');

      const rows = options.map((option, index) => {
        const id = String(option?.id ?? `option-${index + 1}`);
        const selected = picked === id;
        const kind = option?.kind ?? 'text';
        const source = sourceOf(option, index);
        let mediaBlock = null;
        if (kind === 'image') {
          mediaBlock = h('button', {
            className: 'cb-media',
            title: t.open,
            onClick: (event) => { event.stopPropagation(); if (source) setZoom({ src: source, title: labelOf(option, index), desc: option?.description }); },
          }, source ? h('img', { className: 'cb-thumb', src: source, alt: '' }) : null);
        } else if (kind === 'audio') {
          mediaBlock = h('button', {
            className: 'cb-media',
            title: t.play,
            disabled: !source,
            onClick: (event) => { event.stopPropagation(); togglePlay(index, source); },
          }, h('span', { className: 'cb-play' }, playing === index ? '❚❚' : '▶'));
        }

        return h('div', { key: id, className: `cb-row${selected ? ' cb-row--selected' : ''}` },
          mediaBlock,
          h('span', { className: 'cb-text' },
            h('span', { className: 'cb-label' }, labelOf(option, index)),
            option?.description ? h('span', { className: 'cb-desc' }, option.description) : null,
          ),
          selectButton(selected, Boolean(picked), () => void choose(option, index, false)),
        );
      });

      const noneSelected = picked === '__none__';
      const noneRow = h('div', { className: `cb-row${noneSelected ? ' cb-row--selected' : ''}` },
        h('span', { className: 'cb-text' }, h('span', { className: 'cb-label' }, args.noneLabel || '—')),
        selectButton(noneSelected, Boolean(picked), () => void choose(null, -1, true)),
      );

      const lightbox = zoom
        ? h('div', {
            className: 'cb-lightbox',
            onClick: () => setZoom(null),
          },
            h('div', { className: 'cb-lightbox-card', onClick: (event) => event.stopPropagation() },
              h('img', { className: 'cb-lightbox-img', src: zoom.src, alt: zoom.title }),
              (zoom.title || zoom.desc)
                ? h('span', { className: 'cb-lightbox-cap' }, [zoom.title, zoom.desc].filter(Boolean).join(' — '))
                : null,
            ),
          )
        : null;

      return h('div', { className: 'cb-card' },
        h('div', { className: 'cb-head' },
          args.title ? h('span', { className: 'cb-title' }, args.title) : null,
          args.subtitle ? h('span', { className: 'cb-sub' }, args.subtitle) : null,
        ),
        ...rows,
        noneRow,
        lightbox,
      );
    }

    return {
      inject: ['slots', 'uiConversation'],
      apply(ctx) {
        try {
          ctx.uiConversation.events.register(cardDefinition);
        } catch (error) {
          console.warn('dsh-choice: chat node definition failed', error);
        }
        try {
          ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
            name: 'conversation.chat.node',
            key: 'choice-board',
          }, ChoiceCard));
        } catch (error) {
          console.warn('dsh-choice: chat node view failed', error);
        }
      },
    };
  },
});
