const { useState, useEffect, useRef, useCallback } = React;

// --- Design System & Theme ---
const COLORS = {
  bgDeep: '#050505',
  bgCard: 'rgba(15, 15, 20, 0.6)',
  bgCardStrong: 'rgba(15, 15, 20, 0.85)',
  bgInput: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderFocus: 'rgba(255, 255, 255, 0.2)',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  accentRed: '#f43f5e',
  accentRedSoft: 'rgba(244, 63, 94, 0.15)',
  accentYellow: '#fbbf24',
  accentBlue: '#3b82f6',
  accentBlueSoft: 'rgba(59, 130, 246, 0.15)',
  success: '#10b981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  error: '#ef4444',
  errorSoft: 'rgba(239, 68, 68, 0.12)',
};

const CATEGORIES = [
  { id: 'Startup Pitch', placeholder: 'e.g. Raise a seed round from top VCs', textareaPlaceholder: 'Paste your pitch deck text, investor email, or one-pager here...' },
  { id: 'CV / Resume', placeholder: 'e.g. Get hired as a senior developer', textareaPlaceholder: 'Paste your CV, resume, or cover letter text here...' },
  { id: 'Dating Profile', placeholder: 'e.g. Get more meaningful matches', textareaPlaceholder: 'Paste your dating profile bio, prompts, or about me section here...' },
  { id: 'Bio / About Me', placeholder: 'e.g. Build a memorable personal brand', textareaPlaceholder: 'Paste your bio, about page, LinkedIn summary, or speaker intro here...' },
];

const INTENSITIES = [
  { id: 'gentle', label: 'Gentle Nudge', color: COLORS.accentBlue },
  { id: 'hard', label: 'Hard Truth', color: COLORS.accentYellow },
  { id: 'full', label: 'Full Roast', color: COLORS.accentRed },
];

const LOADING_MESSAGES = [
  'Analyzing your text...',
  'Finding the weak spots...',
  'Crafting the perfect insult...',
  'Almost done. This is going to hurt.',
  'Generating your roast...',
];

const SHIMMER_LINES = [
  { width: '55%', height: 36, mb: 20 },
  { width: '100%', height: 14, mb: 10 },
  { width: '92%', height: 14, mb: 10 },
  { width: '80%', height: 14, mb: 36 },
  { width: '35%', height: 10, mb: 16 },
  { width: '100%', height: 10, mb: 10 },
  { width: '100%', height: 10, mb: 0 },
];

const SHIMMER_BASE_STYLE = {
  borderRadius: '6px',
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmerMove 1.6s ease-in-out infinite',
};

const DIVIDER_STYLE = { height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '0 0 32px 0' };

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

function normalizeText(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function wordsFrom(s) {
  const cleaned = normalizeText(s).replace(/[^\p{L}\p{N}\s']/gu, ' ');
  return cleaned.split(' ').map(w => w.trim()).filter(Boolean);
}

function overlapRatioByWords(input, rewrite) {
  const a = wordsFrom(input);
  const b = wordsFrom(rewrite);
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  let hits = 0;
  for (const w of b) { if (setA.has(w)) hits++; }
  return hits / b.length;
}

function levenshteinDistance(a, b) {
  const s = normalizeText(a); const t = normalizeText(b);
  if (!s && !t) return 0; if (!s) return t.length; if (!t) return s.length;
  const m = s.length; const n = t.length;
  const prev = new Array(n + 1); const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i; const si = s.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = si === t.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function similarityRatio(a, b) {
  const s = normalizeText(a); const t = normalizeText(b);
  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 1;
  return 1 - (levenshteinDistance(s, t) / maxLen);
}

function qualityHint(wordCount) {
  if (wordCount < 30) return { color: COLORS.error, label: 'Too short for a good roast. Paste more.' };
  if (wordCount < 80) return { color: COLORS.warning, label: 'Getting there. More context means better feedback.' };
  if (wordCount <= 500) return { color: COLORS.success, label: 'Good length.' };
  return { color: COLORS.accentBlue, label: 'Solid. The AI has plenty to work with.' };
}

function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(''); setDone(false); if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++; setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, 22);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}{!done && <span style={{ opacity: 0.35, animation: 'cursorBlink 0.9s step-end infinite' }}>|</span>}</span>;
}

function ShimmerLoading({ isMobile }) {
  return (
    <div className="framer-card stagger-1" style={{ borderRadius: isMobile ? '20px' : '28px', padding: isMobile ? '28px 20px' : '56px 48px', marginBottom: '32px' }}>
      {SHIMMER_LINES.map((line, i) => (
        <div key={i} style={{ ...SHIMMER_BASE_STYLE, width: line.width, height: `${line.height}px`, marginBottom: `${line.mb}px` }} />
      ))}
    </div>
  );
}

function Roastd() {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [targetGoal, setTargetGoal] = useState('');
  const [intensity, setIntensity] = useState('hard');
  const [text, setText] = useState('');
  const [pastedFlash, setPastedFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [recentRoasts, setRecentRoasts] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [lastRewrite, setLastRewrite] = useState('');
  const [lastOriginalText, setLastOriginalText] = useState('');
  const [showResubmissionInterstitial, setShowResubmissionInterstitial] = useState(false);
  const [pendingSubmitText, setPendingSubmitText] = useState('');
  const [resultsFading, setResultsFading] = useState(false);

  const textareaRef = useRef(null);
  const resultsRef = useRef(null);
  const pastedFlashTimeoutRef = useRef(null);
  const resultsFadeTimeoutRef = useRef(null);

  const currentCategoryObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  const wordCount = wordsFrom(text).length;
  const charCount = text.length;
  const hint = qualityHint(wordCount);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentRoasts');
      if (saved) setRecentRoasts(JSON.parse(saved));
    } catch (_) {}

    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400;1,9..40,600&display=swap');
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      button, select, input, textarea { touch-action: manipulation; }
      textarea { -webkit-appearance: none; }
      @media (max-width: 640px) { body { -webkit-text-size-adjust: 100%; } }
      body { background-color: ${COLORS.bgDeep}; background-image: radial-gradient(circle at 15% 50%, rgba(244, 63, 94, 0.10), transparent 25%); background-attachment: fixed; font-family: 'DM Sans', sans-serif; }
      .premium-input { transition: border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease; }
      .premium-input:focus { outline: none; border-color: rgba(255,255,255,0.3) !important; background-color: rgba(255,255,255,0.05) !important; }
      .btn { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; }
      .btn:hover:not(:disabled) { transform: scale(1.03) translateY(-2px); filter: brightness(1.1); }
      .btn:active:not(:disabled) { transform: scale(0.97); }
      .framer-card { background: ${COLORS.bgCard}; backdrop-filter: blur(20px); border: 1px solid ${COLORS.border}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease; }
      .framer-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); }
      @keyframes framerReveal { 0% { opacity: 0; transform: translateY(30px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      .stagger-1 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
      .stagger-2 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.1s forwards; opacity: 0; }
      .stagger-3 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.2s forwards; opacity: 0; }
      @keyframes shimmerMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      @keyframes cursorBlink { 0%, 100% { opacity: 0.35; } 50% { opacity: 0; } }
      @keyframes submitPulse { 0%, 100% { box-shadow: 0 8px 30px rgba(244, 63, 94, 0.15); } 50% { box-shadow: 0 8px 40px rgba(244, 63, 94, 0.30); } }
    `;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch (_) {} };
  }, []);

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length), 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const saveToRecent = useCallback((newResult, reqCategory, reqIntensity) => {
    const roastData = {
      id: Date.now().toString(),
      roast_quote: newResult.roast_quote,
      heat_score: newResult.heat_score,
      category: reqCategory,
      intensity: INTENSITIES.find(i => i.id === reqIntensity)?.label || reqIntensity,
      timestamp: new Date().toISOString(),
    };
    setRecentRoasts(prev => {
      const updated = [roastData, ...prev].slice(0, 5);
      try { localStorage.setItem('recentRoasts', JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
  }, []);

  const autoResizeTextarea = useCallback((el) => {
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 500);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 500 ? 'auto' : 'hidden';
  }, []);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    autoResizeTextarea(e.target);
  }, [autoResizeTextarea]);

  const handleTextareaPaste = useCallback(() => {
    setPastedFlash(true);
    if (pastedFlashTimeoutRef.current) clearTimeout(pastedFlashTimeoutRef.current);
    pastedFlashTimeoutRef.current = setTimeout(() => setPastedFlash(false), 500);
  }, []);

  const performSubmit = useCallback(async ({ submitText, isResubmission }) => {
    if (!submitText.trim()) return;
    setIsLoading(true); setError(null); setResult(null); setShowShareCard(false);
    try {
      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: submitText.trim(),
          category,
          targetGoal: targetGoal.trim() || 'Improve my text',
          intensity,
          ...(isResubmission ? { isResubmission: true, originalText: lastOriginalText || '' } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI error. Try again.');
      setResult(data);
      setStats({
        tokens: response.headers.get('X-Tokens-Used') || 'N/A',
        latency: response.headers.get('X-Latency-Ms') || 'N/A',
        retries: response.headers.get('X-Retry-Count') || '0',
      });
      saveToRecent(data, category, intensity);
      if (!isResubmission) setLastOriginalText(submitText.trim());
      setLastRewrite(data.rewrite || '');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { setError(err.message); } finally { setIsLoading(false); }
  }, [category, intensity, lastOriginalText, saveToRecent, targetGoal]);

  const handleSubmit = useCallback(() => {
    const cand = text.trim();
    if (!cand) return;
    if (lastRewrite && (overlapRatioByWords(cand, lastRewrite) > 0.6 || similarityRatio(cand, lastRewrite) > 0.7)) {
      setPendingSubmitText(cand); setShowResubmissionInterstitial(true); return;
    }
    performSubmit({ submitText: cand, isResubmission: false });
  }, [lastRewrite, performSubmit, text]);

  const reset = useCallback(() => {
    setResultsFading(true);
    if (resultsFadeTimeoutRef.current) clearTimeout(resultsFadeTimeoutRef.current);
    resultsFadeTimeoutRef.current = setTimeout(() => {
      setResult(null); setText(''); setResultsFading(false); window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  }, []);

  const handleCopyRewrite = useCallback(() => {
    navigator.clipboard.writeText(result?.rewrite || '').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '32px 16px' : '60px 20px', color: COLORS.textPrimary }}>
      <header style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '56px' }} className="stagger-1">
        <h1 style={{ fontSize: isMobile ? '44px' : '72px', fontWeight: '900', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          Roastd <span style={{ fontSize: isMobile ? '36px' : '56px' }}>🌶️</span>
        </h1>
        <p style={{ fontSize: isMobile ? '16px' : '20px', color: COLORS.textSecondary, margin: 0 }}>Paste it. Pick your poison. Get roasted.</p>
      </header>

      {showResubmissionInterstitial && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="framer-card" style={{ width: '100%', maxWidth: '520px', borderRadius: '20px', padding: '28px', background: COLORS.bgCardStrong }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Hold on.</h3>
            <p style={{ color: COLORS.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
              This looks like the rewrite I just gave you. Roasting my own work is like grading my own homework.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginTop: '24px' }}>
              <button className="btn" onClick={() => { setShowResubmissionInterstitial(false); performSubmit({ submitText: pendingSubmitText, isResubmission: true }); }} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>Roast Anyway</button>
              <button className="btn" onClick={() => { setShowResubmissionInterstitial(false); setText(''); }} style={{ padding: '14px', borderRadius: '14px', background: COLORS.success, color: '#fff', fontWeight: '700' }}>Paste New</button>
            </div>
          </div>
        </div>
      )}

      {showShareCard && result && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowShareCard(false)}>
          <div style={{ width: '100%', maxWidth: '600px', aspectRatio: '1/1', background: 'radial-gradient(circle at top left, #201010, #050505)', borderRadius: '32px', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '24px', fontWeight: '900' }}>Roastd 🌶️</div>
            <div style={{ fontSize: '30px', fontWeight: '800', fontStyle: 'italic' }}>"{result.roast_quote}"</div>
            <div style={{ fontSize: '14px', color: COLORS.textMuted }}>Get roasted at roastd.vercel.app</div>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <section className="stagger-2 framer-card" style={{ borderRadius: isMobile ? '20px' : '28px', padding: isMobile ? '24px' : '48px', marginBottom: '40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <select className="premium-input" value={category} onChange={e => setCategory(e.target.value)} style={{ background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: '#fff', padding: '16px', borderRadius: '14px', minHeight: '44px' }}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
            <input className="premium-input" type="text" placeholder={currentCategoryObj.placeholder} value={targetGoal} onChange={e => setTargetGoal(e.target.value)} style={{ background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: '#fff', padding: '16px', borderRadius: '14px', minHeight: '44px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '24px' }}>
            {INTENSITIES.map(int => (
              <button key={int.id} className="btn" onClick={() => setIntensity(int.id)} style={{ flex: 1, padding: '16px', borderRadius: '14px', background: intensity === int.id ? `${int.color}18` : COLORS.bgInput, color: intensity === int.id ? int.color : COLORS.textMuted, border: `1px solid ${intensity === int.id ? int.color : COLORS.border}`, fontWeight: '700', minHeight: '44px' }}>{int.label}</button>
            ))}
          </div>
          <textarea ref={textareaRef} className="premium-input" value={text} onChange={handleTextChange} onPaste={handleTextareaPaste} style={{ width: '100%', minHeight: isMobile ? '180px' : '220px', padding: '24px', borderRadius: '16px', background: COLORS.bgInput, border: `1px solid ${pastedFlash ? COLORS.success : COLORS.border}`, color: '#fff', fontSize: '16px', resize: 'none' }} placeholder={currentCategoryObj.textareaPlaceholder} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px', color: text ? hint.color : COLORS.textMuted }}>
            <span>{wordCount} words</span><span>{text ? hint.label : 'Paste more for a better roast.'}</span>
          </div>
          <button className="btn" disabled={!text || isLoading} onClick={handleSubmit} style={{ width: '100%', padding: '20px', borderRadius: '16px', background: COLORS.accentRed, color: '#fff', fontWeight: '900', marginTop: '24px', textTransform: 'uppercase', animation: text ? 'submitPulse 2.5s infinite' : 'none' }}>
            {isLoading ? 'Roasting in progress...' : 'Roast Me Alive'}
          </button>
        </section>
      )}

      {isLoading && <div>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', animation: 'framerReveal 1s infinite alternate' }}>🔥</div>
          <h3 style={{ marginTop: '20px' }}>{LOADING_MESSAGES[loadingMsgIdx]}</h3>
        </div>
        <ShimmerLoading isMobile={isMobile} />
      </div>}

      {result && (
        <section ref={resultsRef} style={{ opacity: resultsFading ? 0 : 1, transition: 'opacity 0.3s' }}>
          {typeof result.improvement_score === 'number' && (
            <div className="stagger-1 framer-card" style={{ padding: '16px', borderRadius: '16px', borderLeft: `4px solid ${COLORS.success}`, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800' }}>Improvement: {result.improvement_score}/10</span>
              <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Revision mode</span>
            </div>
          )}
          <div className="stagger-1 framer-card" style={{ padding: isMobile ? '32px 24px' : '56px 48px', borderRadius: '28px', borderLeft: `6px solid ${COLORS.accentRed}`, marginBottom: '32px' }}>
            <h2 style={{ fontSize: isMobile ? '22px' : '32px', fontStyle: 'italic', lineHeight: '1.4' }}>"<TypewriterText text={result.roast_quote} />"</h2>
            <div style={{ marginTop: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px', fontWeight: '700' }}>Heat Score</span>
                <span style={{ fontSize: '40px', fontWeight: '900', color: COLORS.accentRed }}>{result.heat_score}/10</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(result.heat_score/10)*100}%`, background: COLORS.accentRed }} />
              </div>
            </div>
          </div>

          <div style={DIVIDER_STYLE} />

          <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {(result.multi_perspective || []).map((p, i) => (
              <div key={i} className="framer-card" style={{ padding: '24px', borderRadius: '20px', borderTop: `3px solid ${i===0?COLORS.accentRed:i===1?COLORS.accentYellow:COLORS.accentBlue}` }}>
                 <h4 style={{ textTransform: 'uppercase', fontSize: '11px', marginBottom: '12px' }}>{p.title}</h4>
                 <p style={{ fontSize: '15px', color: COLORS.textSecondary, margin:0 }}>{p.content}</p>
              </div>
            ))}
          </div>

          <div className="stagger-2 framer-card" style={{ padding: '28px', borderRadius: '20px', borderLeft: `4px solid ${COLORS.success}`, marginBottom: '32px' }}>
            <h4 style={{ color: COLORS.success, textTransform: 'uppercase', fontSize: '11px', marginBottom: '20px' }}>What You Did Right</h4>
            {(result.strengths || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <span style={{ color: COLORS.success }}>✓</span>
                <p style={{ margin:0, fontWeight: '700' }}>{s}</p>
              </div>
            ))}
          </div>

          <div className="stagger-3 framer-card" style={{ padding: isMobile ? '28px' : '48px', borderRadius: '28px', marginBottom: '32px' }}>
             <h3 style={{ marginBottom: '24px' }}>Actionable Fixes</h3>
             {(result.tips || []).map((t, i) => (
               <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                 <div style={{ width: '28px', height: '28px', background: `${COLORS.accentYellow}22`, color: COLORS.accentYellow, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', flexShrink:0 }}>{i+1}</div>
                 <p style={{ margin: 0, fontSize: '16px' }}>{t}</p>
               </div>
             ))}
          </div>

          <div className="stagger-3 framer-card" style={{ padding: isMobile ? '28px' : '40px', borderRadius: '28px', borderLeft: `4px solid ${COLORS.accentBlue}`, marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
               <h4 style={{ color: COLORS.accentBlue }}>The Rewrite</h4>
               <button className="btn" onClick={handleCopyRewrite} style={{ padding: '8px 16px', borderRadius: '8px', background: copied ? COLORS.success : 'rgba(255,255,255,0.05)', color: '#fff' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{result.rewrite}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '40px' }}>
             <button className="btn framer-card" onClick={() => setShowShareCard(true)} style={{ padding: '16px', borderRadius: '14px', color: '#fff' }}>Share Card</button>
             <button className="btn" onClick={reset} style={{ padding: '16px', borderRadius: '14px', background: '#fff', color: '#000', fontWeight: '800', gridColumn: isMobile ? '1 / -1' : 'auto' }}>Roast Another</button>
          </div>
        </section>
      )}
    </div>
  );
}
