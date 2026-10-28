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

    const visible = (node) => node instanceof HTMLElement && node.offsetParent !== null;

    const findSendButton = () => [...document.querySelectorAll('button')]
      .find((button) => /send|submit|отправ/i.test(button.getAttribute('aria-label') ?? button.title ?? ''));

    const findComposer = () => {
      const areas = [...document.querySelectorAll('[contenteditable="true"], textarea')].filter(visible);
      if (areas.length === 0) return null;
      const placeholder = areas.find((area) => /message|сообщени/i.test(
        area.getAttribute('aria-placeholder') ?? area.getAttribute('data-placeholder') ?? area.getAttribute('placeholder') ?? ''));
      if (placeholder) return placeholder;
      const send = findSendButton();
      if (send) {
        const rect = send.getBoundingClientRect();
        let best = null;
        let bestDistance = Infinity;
        for (const area of areas) {
          const box = area.getBoundingClientRect();
          const distance = Math.abs(box.bottom - rect.bottom) + Math.abs(box.right - rect.right) * 0.1;
          if (distance < bestDistance) { bestDistance = distance; best = area; }
        }
        if (best) return best;
      }
      return areas[areas.length - 1] ?? null;
    };

    const composerText = (area) => (area instanceof HTMLTextAreaElement ? area.value : (area.innerText ?? area.textContent ?? '')).trim();

    const setComposerText = (area, text) => {
      area.focus();
      if (area instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(area, text);
        area.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(area);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand('delete');
      if (text.length > 0) document.execCommand('insertText', false, text);
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendMessage = async (text) => {
      const send = findSendButton();
      const area = findComposer();
      if (!area) return { ok: false, debug: 'no composer' };
      const draft = composerText(area);
      let inserted = false;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        setComposerText(area, text);
        await sleep(150);
        if (composerText(area) === text.trim()) { inserted = true; break; }
        if (attempt === 1) {
          area.textContent = text;
          area.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(120);
          if (composerText(area) === text.trim()) { inserted = true; break; }
        }
      }

      if (!inserted) {
        return {
          ok: false,
          debug: `insert failed: <${area.tagName.toLowerCase()} class="${(area.className || '').toString().slice(0, 40)}"> draft="${draft.slice(0, 20)}" now="${composerText(area).slice(0, 20)}"`,
        };
      }

      if (send) send.click();
      else area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));

      await sleep(180);
      if (draft && composerText(area) === '') {
        setComposerText(area, draft);
      }
      return { ok: true, debug: `sent; button=${send ? 'yes' : 'no'}` };
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

      const [debug, setDebug] = React.useState('');
      const choose = async (option, index, none) => {
        if (picked) return;
        const text = none ? (args.noneLabel || '—') : valueOf(option, index);
        const id = none ? '__none__' : String(option?.id ?? `option-${index + 1}`);
        setPicked(id);
        const outcome = await sendMessage(text);
        setDebug(outcome?.debug ?? '');
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

      const selectButton = (selected, disabled, onClick, meta) => h('button', {
        type: 'button',
        className: `cb-select${selected ? ' cb-select--picked' : ''}`,
        disabled,
        title: t.select,
        'aria-label': t.select,
        'data-cb': 'pick',
        'data-cb-value': meta?.value ?? '',
        'data-cb-id': meta?.id ?? '',
        'data-cb-none': meta?.none ? '1' : '0',
        onPointerDown: (event) => { event.stopPropagation(); event.preventDefault(); onClick(); },
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
            type: 'button',
            'data-cb': 'image',
            'data-cb-src': source ?? '',
            'data-cb-title': labelOf(option, index),
            title: t.open,
            onClick: (event) => { event.stopPropagation(); if (source) setZoom({ src: source, title: labelOf(option, index), desc: option?.description }); },
          }, source ? h('img', { className: 'cb-thumb', src: source, alt: '' }) : null);
        } else if (kind === 'audio') {
          mediaBlock = h('button', {
            className: 'cb-media',
            type: 'button',
            'data-cb': 'play',
            'data-cb-src': source ?? '',
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
          selectButton(selected, Boolean(picked), () => void choose(option, index, false), { value: valueOf(option, index), id }),
        );
      });

      const noneSelected = picked === '__none__';
      const noneRow = h('div', { className: `cb-row${noneSelected ? ' cb-row--selected' : ''}` },
        h('span', { className: 'cb-text' }, h('span', { className: 'cb-label' }, args.noneLabel || '—')),
        selectButton(noneSelected, Boolean(picked), () => void choose(null, -1, true), { value: args.noneLabel || '', id: '__none__', none: true }),
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
        debug ? h('span', { className: 'cb-foot' }, debug) : null,
        lightbox,
      );
    }

    const installFallback = () => {
      if (window.__dshChoiceFallback) return;
      window.__dshChoiceFallback = true;
      const handle = (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-cb]') : null;
        if (!target) return;
        const kind = target.getAttribute('data-cb');
        if (kind === 'play') {
          const src = target.getAttribute('data-cb-src');
          if (src) { const audio = new Audio(src); void audio.play(); }
          return;
        }
        if (kind === 'image') {
          const src = target.getAttribute('data-cb-src');
          if (!src) return;
          openLightbox(src, target.getAttribute('data-cb-title') ?? '');
          return;
        }
        if (kind === 'pick') {
          if (target.disabled) return;
          const value = target.getAttribute('data-cb-value') ?? '';
          const card = target.closest('.cb-card');
          if (card) {
            card.querySelectorAll('[data-cb="pick"]').forEach((button) => { button.disabled = true; });
            target.classList.add('cb-select--picked');
            target.textContent = '✓';
            const row = target.closest('.cb-row');
            if (row) row.classList.add('cb-row--selected');
          }
          if (value) void sendMessage(value);
        }
      };
      document.addEventListener('pointerdown', handle, true);
    };

    const openLightbox = (src, title) => {
      const overlay = document.createElement('div');
      overlay.className = 'cb-lightbox';
      overlay.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'cb-lightbox-card';
      const img = document.createElement('img');
      img.className = 'cb-lightbox-img';
      img.src = src;
      card.appendChild(img);
      if (title) {
        const caption = document.createElement('span');
        caption.className = 'cb-lightbox-cap';
        caption.textContent = title;
        card.appendChild(caption);
      }
      overlay.appendChild(card);
      const close = () => overlay.remove();
      overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); }, { once: true });
      document.body.appendChild(overlay);
    };

    return {
      inject: ['slots', 'uiConversation'],
      apply(ctx) {
        installFallback();
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
