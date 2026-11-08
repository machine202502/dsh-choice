window.__ModuleLoader__.load({
  id: 'dsh-choice',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Loopback bridge of the host half; the saved language lives behind it. */
    const PORT = 49236;
    const base = `http://127.0.0.1:${PORT}`;

    const STRINGS = {
      ru: {
        select: 'Выбрать',
        play: 'Воспроизвести',
        open: 'Открыть',
        option: 'Вариант',
        settingsTitle: 'Язык',
        settingsHint: 'Авто — по языку приложения',
        save: 'Сохранить',
        saved: 'Сохранено',
        saveFailed: 'Не удалось сохранить',
        loading: 'Загрузка…',
        auto: 'Авто',
        langRu: 'Русский',
        langEn: 'English',
        langZh: '中文',
      },
      en: {
        select: 'Select',
        play: 'Play',
        open: 'Open',
        option: 'Option',
        settingsTitle: 'Language',
        settingsHint: 'Auto follows the application language',
        save: 'Save',
        saved: 'Saved',
        saveFailed: 'Could not save',
        loading: 'Loading…',
        auto: 'Auto',
        langRu: 'Русский',
        langEn: 'English',
        langZh: '中文',
      },
      zh: {
        select: '选择',
        play: '播放',
        open: '打开',
        option: '选项',
        settingsTitle: '语言',
        settingsHint: '自动 — 跟随应用界面语言',
        save: '保存',
        saved: '已保存',
        saveFailed: '保存失败',
        loading: '加载中…',
        auto: '自动',
        langRu: 'Русский',
        langEn: 'English',
        langZh: '中文',
      },
    };

    /** The interface language; the shared default until the settings answer. */
    let uiLanguage = 'ru';
    const languageListeners = new Set();
    const setLanguage = (next) => {
      if (!STRINGS[next] || next === uiLanguage) return;
      uiLanguage = next;
      for (const listener of languageListeners) listener(next);
    };

    /** The application locale an `auto` preference follows. */
    const detectLanguage = () => {
      const raw = String(
        (typeof document === 'undefined' ? '' : document.documentElement?.lang)
        || (typeof navigator === 'undefined' ? '' : navigator.language)
        || 'en',
      ).toLowerCase();
      if (raw.startsWith('ru')) return 'ru';
      if (raw.startsWith('zh')) return 'zh';
      return 'en';
    };

    /** Saved language first, `auto` second, the ru default when nothing is stored. */
    const resolveLanguage = (settings) => {
      const preference = settings?.language;
      if (preference === 'ru' || preference === 'en' || preference === 'zh') return preference;
      if (preference === 'auto') return detectLanguage();
      return 'ru';
    };

    /** Read the stored language over the loopback bridge; failure keeps the default. */
    const readSettings = async () => {
      const response = await fetch(`${base}/settings`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      setLanguage(resolveLanguage(body?.values));
      return body;
    };

    // The card may render before the bridge answers; it re-renders on a language change.
    void readSettings().catch(() => {});
    // Another page part (or a second form instance) saved the language: re-read it.
    window.addEventListener('dsh-choice:settings', () => { void readSettings().catch(() => {}); });

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
.cb-set { display: flex; flex-direction: column; gap: 14px; max-width: 520px; padding: 4px 0 8px; font-size: 13px; }
.cb-set-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.cb-set-hint { margin-top: 2px; font-size: 12px; line-height: 16px; opacity: .6; }
.cb-set-select { height: 32px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1, #dcdcdc); border-radius: 10px;
  background: var(--dsw-alias-bg-base, #fff); color: inherit; font: inherit; outline: none; }
.cb-set-actions { display: flex; align-items: center; gap: 12px; }
.cb-set-save { height: 34px; padding: 0 16px; border: none; border-radius: 10px;
  background: var(--dsw-alias-label-primary, #1f1f1f); color: var(--dsw-alias-bg-base, #fff); font: inherit; cursor: pointer; }
.cb-set-save:disabled { opacity: .45; cursor: default; }
.cb-set-status { font-size: 12px; opacity: .6; }
.cb-set-status--error { color: #c0392b; opacity: 1; }
`;
      document.head.appendChild(tag);
    };

    const isUrl = (value) => /^https?:\/\//i.test(value ?? '');
    /** Cards that already posted their pick in this page session. */
    const sentCards = new Set();
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

    const selectAllContents = (area) => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(area);
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    const setComposerText = async (area, text) => {
      area.focus();
      await sleep(60);
      if (area instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(area, text);
        area.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      selectAllContents(area);
      await sleep(40);
      document.execCommand('delete');
      await sleep(40);
      if (text.length > 0) {
        selectAllContents(area);
        document.execCommand('insertText', false, text);
      }
      await sleep(80);
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const sendMessage = async (text) => {
      const send = findSendButton();
      const area = findComposer();
      if (!area) return { ok: false, debug: 'no composer' };
      const draft = composerText(area);
      let inserted = false;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await setComposerText(area, text);
        if (composerText(area) === text.trim()) { inserted = true; break; }
        if (attempt === 1) {
          area.textContent = '';
          area.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(60);
          area.textContent = text;
          area.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(140);
          if (composerText(area) === text.trim()) { inserted = true; break; }
        }
      }

      if (!inserted) {
        return { ok: false };
      }

      if (send) send.click();
      else area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));

      await sleep(180);
      if (draft && composerText(area) === '') {
        await setComposerText(area, draft);
      }
      return { ok: true };
    };


    function ChoiceCard(props) {
      ensureStyles();
      const [language, setLanguageState] = React.useState(uiLanguage);
      const t = STRINGS[language] ?? STRINGS.ru;
      const data = props?.node?.data ?? {};
      const args = data.args ?? {};
      const callId = data.seq !== undefined && data.seq !== null ? String(data.seq) : (data.nodeKey ?? data.id ?? 'board');
      const options = Array.isArray(args.options) ? args.options : [];
      const [loaded, setLoaded] = React.useState({});
      const [picked, setPicked] = React.useState(() => (sentCards.has(callId) ? '__sent__' : null));
      const [playing, setPlaying] = React.useState(null);
      const [zoom, setZoom] = React.useState(null);
      const audioRef = React.useRef(null);


      React.useEffect(() => {
        languageListeners.add(setLanguageState);
        setLanguageState(uiLanguage);
        return () => { languageListeners.delete(setLanguageState); };
      }, []);
      React.useEffect(() => () => { audioRef.current?.pause?.(); }, []);
      React.useEffect(() => {
        if (!zoom) return undefined;
        const onKey = (event) => { if (event.key === 'Escape') setZoom(null); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
      }, [zoom]);

      const sourceOf = (option, index) => (isUrl(option?.src) ? option.src : (data.media?.[index] ?? loaded[index] ?? null));
      const labelOf = (option, index) => option?.title ?? option?.id ?? `${t.option} ${index + 1}`;
      const valueOf = (option, index) => (typeof option?.value === 'string' ? option.value : labelOf(option, index));

      const choose = async (option, index, none) => {
        if (picked || sentCards.has(callId)) return;
        sentCards.add(callId);
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
            'aria-label': t.open,
            onClick: (event) => { event.stopPropagation(); if (source) setZoom({ src: source, title: labelOf(option, index), desc: option?.description }); },
          }, source ? h('img', { className: 'cb-thumb', src: source, alt: '' }) : null);
        } else if (kind === 'audio') {
          mediaBlock = h('button', {
            className: 'cb-media',
            type: 'button',
            'data-cb': 'play',
            'data-cb-src': source ?? '',
            title: t.play,
            'aria-label': t.play,
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
        lightbox,
      );
    }

    /**
     * The settings row: one language select, saved to the host bridge so the
     * board and the form agree without a restart.
     */
    function ChoiceSettings() {
      ensureStyles();
      const [state, setState] = React.useState({ status: 'loading', values: {}, defaults: {} });
      const [saving, setSaving] = React.useState(false);
      const [notice, setNotice] = React.useState({ text: '', error: false });
      const [language, setLanguageState] = React.useState(uiLanguage);

      React.useEffect(() => {
        let alive = true;
        languageListeners.add(setLanguageState);
        readSettings()
          .then((body) => {
            if (alive) setState({ status: 'ready', values: body?.values ?? {}, defaults: body?.defaults ?? {} });
          })
          .catch(() => {
            if (alive) setState({ status: 'error', values: {}, defaults: {} });
          });
        return () => {
          alive = false;
          languageListeners.delete(setLanguageState);
        };
      }, []);

      const t = STRINGS[language] ?? STRINGS.ru;
      const chosen = state.values.language ?? state.defaults.language ?? 'ru';

      const save = async () => {
        setSaving(true);
        setNotice({ text: '', error: false });
        try {
          const response = await fetch(`${base}/settings`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ language: chosen }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
          setState({ status: 'ready', values: body.values ?? {}, defaults: body.defaults ?? {} });
          setLanguage(resolveLanguage(body?.values));
          setNotice({ text: (STRINGS[uiLanguage] ?? STRINGS.ru).saved, error: false });
          window.dispatchEvent(new CustomEvent('dsh-choice:settings'));
        } catch (error) {
          setNotice({ text: `${(STRINGS[uiLanguage] ?? STRINGS.ru).saveFailed}: ${String(error?.message ?? error)}`, error: true });
        } finally {
          setSaving(false);
        }
      };

      if (state.status === 'loading') {
        return h('div', { className: 'cb-set' }, h('span', { className: 'cb-set-status' }, t.loading));
      }

      const options = [
        ['ru', t.langRu],
        ['en', t.langEn],
        ['zh', t.langZh],
        ['auto', t.auto],
      ];

      return h('div', { className: 'cb-set' },
        h('div', { className: 'cb-set-row' },
          h('div', null,
            h('div', null, t.settingsTitle),
            h('div', { className: 'cb-set-hint' }, t.settingsHint),
          ),
          h('select', {
            className: 'cb-set-select',
            value: chosen,
            'aria-label': t.settingsTitle,
            onChange: (event) => setState((previous) => ({ ...previous, values: { ...previous.values, language: event.target.value } })),
          }, options.map(([value, text]) => h('option', { key: value, value }, text))),
        ),
        h('div', { className: 'cb-set-actions' },
          h('button', { type: 'button', className: 'cb-set-save', onClick: save, disabled: saving === true },
            saving ? '…' : t.save),
          notice.text ? h('span', { className: `cb-set-status${notice.error ? ' cb-set-status--error' : ''}` }, notice.text) : null,
        ),
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
        try {
          ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
            name: 'plugins.row.config',
            key: 'dsh-choice#choice',
          }, ChoiceSettings));
        } catch (error) {
          console.warn('dsh-choice: settings form failed', error);
        }
      },
    };
  },
});
