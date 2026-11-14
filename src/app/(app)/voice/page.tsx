'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Mic, RotateCcw, Send, Settings2, Square, Volume2, VolumeX } from 'lucide-react';
import { api } from '@/lib/api';
import type { DocFolder } from '@/lib/types';
import { useI18n } from '@/i18n';
import { useFolders } from '@/components/agents';
import { Dialog } from '@/components/dialog';
import { Checkbox, Segmented, Switch } from '@/components/form';
import { Badge, Button, Card, cx, errorMessage, Notice, PageHeader } from '@/components/ui';

interface Answer {
  answer: string;
  links: { label: string; href: string }[];
  usedTools: string[];
  simulated: boolean;
}
interface CompanionAnswer {
  reply: string;
  concern: boolean;
}
interface Settings {
  speakAnswers: boolean;
  documentFolders: { folderId: string; path: string }[];
  aiConnected: boolean;
  companionChatEnabled: boolean;
}
interface Message {
  role: 'user' | 'assistant';
  text: string;
  meta?: Answer;
  concern?: boolean;
  error?: boolean;
}

// Minimal typing for the browser speech API (Chrome/Edge expose it as webkitSpeechRecognition).
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
const getRecognition = (): (new () => Recognition) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

function pickVoice(tag: string) {
  const voices = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [];
  const lang = tag.toLowerCase();
  return voices.find((v) => v.lang.toLowerCase() === lang) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang.split('-')[0])) ?? null;
}

function FolderSettings({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings | undefined }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const folders = useFolders(open);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [companion, setCompanion] = useState(false);
  useEffect(() => {
    if (open) {
      setChosen(new Set(settings?.documentFolders.map((f) => f.folderId) ?? []));
      setCompanion(settings?.companionChatEnabled ?? false);
    }
  }, [open, settings]);
  // A folder inside a chosen folder is already included.
  const covered = (f: DocFolder) => {
    let p = f.parentId;
    for (let i = 0; p && i < 50; i++) {
      if (chosen.has(p)) return true;
      p = folders.data?.find((x) => x.id === p)?.parentId ?? null;
    }
    return false;
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('voice.settings')}
      description={t('voice.settingsHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={async () => {
              await api.put('/v1/voice/settings', { documentFolderIds: [...chosen], companionChatEnabled: companion });
              qc.invalidateQueries({ queryKey: ['voice', 'settings'] });
              onClose();
            }}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="mb-5 border-b border-line pb-5">
        <Switch label={t('voice.companion.toggle')} hint={t('voice.companion.toggleHint')} checked={companion} onChange={setCompanion} />
      </div>
      <div className="mb-2 text-sm font-semibold">{t('voice.folders')}</div>
      {!folders.data?.length ? (
        <p className="text-sm text-muted">{t('voice.noFolders')}</p>
      ) : (
        <ul className="space-y-2">
          {folders.data.map((f) => (
            <li key={f.id} style={{ paddingInlineStart: `${(f.path.split(' / ').length - 1) * 1.25}rem` }}>
              <Checkbox
                label={f.name}
                checked={chosen.has(f.id) || covered(f)}
                disabled={covered(f)}
                onChange={(v) =>
                  setChosen((s) => {
                    const n = new Set(s);
                    if (v) n.add(f.id);
                    else n.delete(f.id);
                    return n;
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function Inner() {
  const { t, tag, locale } = useI18n();
  const params = useSearchParams();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['voice', 'settings'], queryFn: () => api.get<Settings>('/v1/voice/settings') });
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<'assistant' | 'companion'>('assistant');
  const [supported, setSupported] = useState(true);
  const rec = useRef<Recognition | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const speak = settings.data?.speakAnswers ?? true;

  useEffect(() => {
    setSupported(!!getRecognition());
    // Voices load asynchronously in some browsers.
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
    return () => {
      rec.current?.abort();
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    };
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, interim]);

  const sayAloud = useCallback(
    (s: string, after?: () => void) => {
      if (typeof speechSynthesis === 'undefined') return after?.();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(s.replace(/\[Simulated[^\]]*\]\s*/g, ''));
      u.lang = tag;
      const v = pickVoice(tag);
      if (v) u.voice = v;
      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        setSpeaking(false);
        after?.();
      };
      u.onerror = () => setSpeaking(false);
      speechSynthesis.speak(u);
    },
    [tag],
  );

  const listen = useCallback(() => {
    const R = getRecognition();
    if (!R) return setSupported(false);
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    setVoiceError(null);
    const r = new R();
    r.lang = tag;
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let finalText = '';
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else live += res[0].transcript;
      }
      setInterim(finalText || live);
    };
    r.onerror = (e) => {
      setListening(false);
      setInterim('');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setVoiceError(t('voice.micBlocked'));
      // In hands-free mode silence just ends the conversation quietly.
      else if (e.error === 'no-speech' && !handsFreeRef.current) setVoiceError(t('voice.didntCatch'));
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
      if (finalText.trim()) void send(finalText.trim());
    };
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, t]);

  const send = useCallback(
    async (question: string) => {
      if (!question.trim() || busy) return;
      const history = messages.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, text: m.text }));
      setMessages((m) => [...m, { role: 'user', text: question }]);
      setText('');
      setBusy(true);
      try {
        if (mode === 'companion') {
          const r = await api.post<CompanionAnswer>('/v1/voice/companion', { message: question, history });
          setMessages((m) => [...m, { role: 'assistant', text: r.reply, concern: r.concern }]);
          if (speak) sayAloud(r.reply, () => handsFreeRef.current && listen());
          else if (handsFreeRef.current) listen();
        } else {
          const r = await api.post<Answer>('/v1/voice/ask', { question, history });
          setMessages((m) => [...m, { role: 'assistant', text: r.answer, meta: r }]);
          if (speak) sayAloud(r.answer, () => handsFreeRef.current && listen());
          else if (handsFreeRef.current) listen();
        }
      } catch (e) {
        setMessages((m) => [...m, { role: 'assistant', text: errorMessage(e, t), error: true }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, mode, speak, sayAloud, listen, t],
  );

  // /voice?listen=1 (from the microphone button in the top bar) starts listening straight away.
  const started = useRef(false);
  useEffect(() => {
    if (!started.current && params.get('listen') === '1' && supported) {
      started.current = true;
      listen();
    }
  }, [params, supported, listen]);

  const toggleSpeak = async () => {
    await api.put('/v1/voice/settings', { speakAnswers: !speak });
    if (speak && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    qc.invalidateQueries({ queryKey: ['voice', 'settings'] });
  };

  const suggestions = mode === 'companion' ? ['c1', 'c2', 'c3', 'c4'].map((k) => t(`voice.companion.${k}`)) : ['s1', 's2', 's3', 's4', 's5', 's6'].map((k) => t(`voice.${k}`));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.voice')}
        description={t('voice.intro')}
        actions={
          <>
            <Button variant="secondary" icon={<Settings2 className="size-4" />} onClick={() => setShowSettings(true)}>
              {t('voice.settings')}
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => (speechSynthesis?.cancel(), setMessages([]))}>
                {t('voice.newConversation')}
              </Button>
            )}
          </>
        }
      />
      {settings.data && !settings.data.aiConnected && (
        <Notice tone="warn" className="mb-4">
          {t('voice.simulatedNote')}
        </Notice>
      )}

      {settings.data?.companionChatEnabled ? (
        <Segmented
          className="mb-4"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setMessages([]);
          }}
          options={[
            { value: 'assistant', label: t('voice.companion.assistantTab') },
            { value: 'companion', label: t('voice.companion.companionTab') },
          ]}
        />
      ) : (
        <button type="button" onClick={() => setShowSettings(true)} className="mb-4 block text-sm font-semibold text-brand hover:underline">
          {t('voice.companion.enablePrompt')}
        </button>
      )}

      <Card className="p-5">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <button
            type="button"
            onClick={() => (listening ? rec.current?.stop() : listen())}
            disabled={!supported || busy}
            aria-label={listening ? t('voice.stop') : t('voice.tapToSpeak')}
            aria-pressed={listening}
            className={cx(
              'relative flex size-24 items-center justify-center rounded-full text-white shadow-lg transition-transform focus-visible:ring-4 focus-visible:ring-brand/40 disabled:opacity-50',
              listening ? 'scale-105 bg-danger' : 'bg-brand hover:scale-105',
            )}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" aria-hidden />}
            {listening ? <Square className="relative size-9" /> : <Mic className="relative size-10" />}
          </button>
          <div className="min-h-6 text-sm font-semibold text-muted" aria-live="polite">
            {listening ? interim || t('voice.listening') : busy ? t('voice.thinking') : supported ? t('voice.tapToSpeak') : ''}
          </div>
          {!supported && <p className="max-w-md text-sm text-muted">{t('voice.noSpeech')}</p>}
          {voiceError && <p className="text-sm text-danger">{voiceError}</p>}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Switch label={t('voice.speakAnswers')} checked={speak} onChange={() => void toggleSpeak()} />
            {supported && <Switch label={t('voice.handsFree')} checked={handsFree} onChange={setHandsFree} />}
            {speaking && (
              <Button size="sm" variant="ghost" icon={<VolumeX className="size-4" />} onClick={() => (speechSynthesis.cancel(), setSpeaking(false))}>
                {t('voice.stopSpeaking')}
              </Button>
            )}
          </div>
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <input
            aria-label={t('voice.typeInstead')}
            placeholder={t('voice.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            dir="auto"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[0.95rem] focus:border-brand focus:outline-none"
          />
          <Button type="submit" icon={<Send className="size-4" />} loading={busy} disabled={!text.trim()}>
            {t('voice.ask')}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">{t('voice.privacy')}</p>
      </Card>

      {messages.length === 0 ? (
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold text-muted">{t('voice.suggestions')}</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:bg-surface-2" dir="auto">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="mt-5 space-y-3" aria-live="polite" lang={locale}>
          {messages.map((m, i) => (
            <li key={i} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[85%] rounded-2xl px-4 py-3', m.role === 'user' ? 'bg-brand text-brand-ink' : m.error ? 'bg-danger-soft text-danger' : 'card')}>
                <div className="sr-only">{m.role === 'user' ? t('voice.you') : t('voice.assistant')}:</div>
                <p className="whitespace-pre-wrap" dir="auto">
                  {m.text}
                </p>
                {m.concern && <p className="mt-2 text-xs text-muted">{t('voice.companion.concernNote')}</p>}
                {m.meta && (
                  <div className="mt-2 space-y-2">
                    {m.meta.usedTools.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span>{t('voice.lookedIn')}:</span>
                        {[...new Set(m.meta.usedTools.map((x) => t(`enums.voiceTool.${x}`)))].map((x) => (
                          <Badge key={x} tone="neutral">
                            {x}
                          </Badge>
                        ))}
                        {m.meta.simulated && <Badge tone="warn">{t('common.simulated')}</Badge>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {m.meta.links.map((l) => (
                        <Link key={l.href} href={l.href} className="rounded-lg bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand hover:underline">
                          {l.label}
                        </Link>
                      ))}
                      <button type="button" onClick={() => sayAloud(m.text)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2" aria-label={t('voice.replay')}>
                        <Volume2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li className="flex justify-start">
              <div className="card px-4 py-3 text-muted">{t('voice.thinking')}</div>
            </li>
          )}
        </ol>
      )}
      <div ref={bottom} />
      <FolderSettings open={showSettings} onClose={() => setShowSettings(false)} settings={settings.data} />
    </div>
  );
}

export default function VoicePage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
