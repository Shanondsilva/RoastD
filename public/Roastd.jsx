const { useState, useEffect, useRef, useCallback } = React;

// --- Design System & Theme ---
const COLORS = {
  bgDeep: '#050505',
  bgCard: 'rgba(15, 15, 20, 0.6)',
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
  error: '#ef4444',
  success: '#10b981',
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

const LOADING_QUOTES = [
  "Analyzing your text...",
  "Finding the weak spots...",
  "Crafting the perfect insult...",
  "Almost done. This is going to hurt.",
  "Generating your roast..."
];

// Defined outside component so it is never recreated on render
const SHIMMER_LINES = [
  { width: '55%', height: '36px', mb: '20px' },
  { width: '100%', height: '14px', mb: '10px' },
  { width: '92%', height: '14px', mb: '10px' },
  { width: '80%', height: '14px', mb: '36px' },
  { width: '35%', height: '10px', mb: '16px' },
  { width: '100%', height: '10px', mb: '10px' },
  { width: '100%', height: '10px', mb: '0' },
];

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src; script.crossOrigin = 'anonymous';
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
};

// --- Custom hook ---
function wordsFrom(s) {
  const cleaned = (s || '').toLowerCase().trim().replace(/[^\w\s]/g, ' ');
  return cleaned.split(' ').map(w => w.trim()).filter(Boolean);
}
function overlapRatioByWords(input, rewrite) {
  const a = wordsFrom(input), b = wordsFrom(rewrite);
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  let hits = 0;
  for (const w of b) if (setA.has(w)) hits++;
  return hits / b.length;
}
function levenshteinDistance(s, t) {
  if (!s) return t.length; if (!t) return s.length;
  const prev = new Array(t.length+1);
  for(let j=0; j<=t.length; j++) prev[j] = j;
  for(let i=1; i<=s.length; i++) {
    let pJ = prev[0]; prev[0] = i;
    for(let j=1; j<=t.length; j++) {
      const c = s[i-1]===t[j-1]?0:1;
      const nPJ = prev[j];
      prev[j] = Math.min(prev[j]+1, prev[j-1]+1, pJ+c);
      pJ = nPJ;
    }
  }
  return prev[t.length];
}
function similarityRatio(a, b) {
  const s = (a||'').toLowerCase().trim(), t = (b||'').toLowerCase().trim();
  const max = Math.max(s.length, t.length);
  if(max===0) return 1; return 1 - (levenshteinDistance(s,t)/max);
}
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// --- Typewriter component ---
function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, 22);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && <span style={{ opacity: 0.35, animation: 'cursorBlink 0.9s step-end infinite' }}>|</span>}
    </span>
  );
}

// --- Shimmer skeleton ---
function ShimmerLoading() {
  return (
    <div className="framer-card stagger-1" style={{ borderRadius: '28px', padding: '56px 48px', marginBottom: '32px' }}>
      {SHIMMER_LINES.map((line, i) => (
        <div key={i} style={{
          width: line.width,
          height: line.height,
          borderRadius: '6px',
          marginBottom: line.mb,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmerMove 1.6s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

// --- Main component ---
function Roastd() {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 600;
  const isSmall = windowWidth < 400;

  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [targetGoal, setTargetGoal] = useState('');
  const [intensity, setIntensity] = useState('hard');
  const [text, setText] = useState('');
  const [textareaFocused, setTextareaFocused] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingQuoteIdx, setLoadingQuoteIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const [recentRoasts, setRecentRoasts] = useState([]);
  const [sharedRoast, setSharedRoast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastRewrite, setLastRewrite] = useState('');
  const [lastOriginalText, setLastOriginalText] = useState('');
  const [showResubmissionInterstitial, setShowResubmissionInterstitial] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const wordCount = wordsFrom(text).length;
  const charCount = text.length;

  const resultsRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentRoasts');
      if (saved) setRecentRoasts(JSON.parse(saved));
    } catch (e) { console.error('Could not load recent roasts', e); }

    if (window.location.hash) {
      try {
        const hashData = window.location.hash.substring(1);
        const decoded = JSON.parse(atob(decodeURIComponent(hashData)));
        setSharedRoast(decoded);
      } catch (e) { console.error('Invalid share link', e); }
    }

    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400;1,9..40,600&display=swap');

      * { box-sizing: border-box; }

      body {
        background-color: ${COLORS.bgDeep};
        background-image:
          radial-gradient(circle at 15% 50%, rgba(244, 63, 94, 0.10), transparent 25%),
          radial-gradient(circle at 85% 30%, rgba(59, 130, 246, 0.06), transparent 25%),
          radial-gradient(circle at 50% 90%, rgba(251, 191, 36, 0.04), transparent 25%);
        background-attachment: fixed;
        font-family: 'DM Sans', system-ui, sans-serif;
      }

      button, input, select, textarea {
        font-family: 'DM Sans', system-ui, sans-serif;
      }

      @media (max-width: 640px) {
        body { -webkit-text-size-adjust: 100%; }
      }
      html { scroll-behavior: smooth; }
      button, select, input, textarea { touch-action: manipulation; }
      textarea { -webkit-appearance: none; }

      option {
        background-color: #0f0f14;
        color: #ffffff;
      }

      .premium-input {
        transition: border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
      }
      .premium-input:focus {
        outline: none;
        border-color: rgba(255,255,255,0.3) !important;
        background-color: rgba(255,255,255,0.05) !important;
        box-shadow: 0 0 0 4px rgba(255,255,255,0.05), 0 0 0 4px rgba(244, 63, 94, 0.08) !important;
      }

      .btn {
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease, box-shadow 0.3s ease;
        cursor: pointer;
      }
      .btn:hover:not(:disabled) {
        transform: scale(1.03) translateY(-2px);
        filter: brightness(1.1);
      }
      .btn:active:not(:disabled) {
        transform: scale(0.97);
        transition: transform 0.1s;
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .btn-submit:hover:not(:disabled) {
        transform: translateY(-3px) !important;
        box-shadow: 0 8px 40px rgba(244, 63, 94, 0.38) !important;
        filter: brightness(1.08);
      }

      @keyframes submitPulse {
        0%, 100% { box-shadow: 0 8px 30px rgba(244, 63, 94, 0.15); }
        50%       { box-shadow: 0 8px 40px rgba(244, 63, 94, 0.30); }
      }

      @keyframes roastAnotherShake {
        0%,100% { transform: translateX(0) scale(1); }
        20%     { transform: translateX(-4px) rotate(-1deg) scale(1.02); }
        40%     { transform: translateX(4px) rotate(1deg) scale(1.02); }
        60%     { transform: translateX(-2px) rotate(-0.5deg) scale(1.01); }
        80%     { transform: translateX(2px) rotate(0.5deg) scale(1.01); }
      }
      .btn-roast-another:hover:not(:disabled) {
        animation: roastAnotherShake 0.45s ease-in-out !important;
        transform: none !important;
        filter: brightness(1.05);
      }

      .framer-card {
        background: ${COLORS.bgCard};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid ${COLORS.border};
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08);
        transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
      }
      .framer-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
      }

      @keyframes framerReveal {
        0%   { opacity: 0; transform: translateY(30px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .stagger-1 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
      .stagger-2 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.1s forwards; opacity: 0; }
      .stagger-3 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.2s forwards; opacity: 0; }

      @keyframes tipReveal {
        0%   { opacity: 0; transform: translateX(-14px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      .tip-item {
        animation: tipReveal 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
        opacity: 0;
      }

      @keyframes fillBar { from { width: 0%; } }
      .animate-bar { animation: fillBar 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

      @keyframes copyPop {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.06); }
        100% { transform: scale(1); }
      }

      @keyframes shimmerMove {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes cursorBlink {
        0%, 100% { opacity: 0.35; }
        50%       { opacity: 0; }
      }

      ::-webkit-scrollbar { height: 6px; width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

      *:focus-visible {
        outline: 2px solid rgba(244, 63, 94, 0.55);
        outline-offset: 3px;
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingQuoteIdx((prev) => (prev + 1) % LOADING_QUOTES.length);
      }, 2500);
    } else {
      setLoadingQuoteIdx(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const saveToRecent = useCallback((newResult, reqCategory, reqIntensity) => {
    const intensityLabel = INTENSITIES.find(i => i.id === reqIntensity)?.label || reqIntensity;
    const roastData = {
      id: Date.now().toString(),
      roast_quote: newResult.roast_quote,
      heat_score: newResult.heat_score,
      category: reqCategory,
      intensity: intensityLabel,
      timestamp: new Date().toISOString()
    };
    setRecentRoasts(prev => {
      const updated = [roastData, ...prev].slice(0, 5);
      localStorage.setItem('recentRoasts', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const currentCategoryObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  const performSubmit = useCallback(async ({ submitText, isResubmission }) => {
    if (!submitText.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStats(null);
    setSharedRoast(null);
    setCopied(false);

    try {
      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: submitText.trim(),
          category,
          targetGoal: targetGoal.trim() || 'Improve my text',
          intensity,
          ...(isResubmission ? { isResubmission: true, originalText: lastOriginalText || '' } : {})
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'The AI choked on your text. Try again.');
      }

      setResult(data);
      setStats({
        tokens: response.headers.get('X-Tokens-Used') || 'N/A',
        latency: response.headers.get('X-Latency-Ms') || 'N/A',
        retries: response.headers.get('X-Retry-Count') || '0',
      });
      saveToRecent(data, category, intensity);
      if (!isResubmission) setLastOriginalText(submitText.trim());
      setLastRewrite(data.rewrite || '');

      setTimeout(() => {
        if (resultsRef.current) {
          const top = resultsRef.current.getBoundingClientRect().top + window.scrollY - 20;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 100);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [category, targetGoal, intensity, saveToRecent, lastOriginalText]);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 500) + 'px';
    }
  }, []);

  const handlePaste = useCallback(() => {
    setIsPasting(true);
    setTimeout(() => setIsPasting(false), 500);
  }, []);

  const handleSubmit = useCallback(() => {
    const cand = text.trim();
    if (!cand) return;
    if (lastRewrite && (overlapRatioByWords(cand, lastRewrite) > 0.6 || similarityRatio(cand, lastRewrite) > 0.7)) {
      setPendingText(cand);
      setShowResubmissionInterstitial(true);
      return;
    }
    performSubmit({ submitText: cand, isResubmission: false });
  }, [text, lastRewrite, performSubmit]);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && text.trim().length > 0) handleSubmit();
    }
  }, [isLoading, text, handleSubmit]);

  const handleCopyRewrite = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.rewrite).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const handleShare = useCallback(() => {
    if (!result) return;
    const shareObj = {
      roast_quote: result.roast_quote,
      heat_score: result.heat_score,
      category,
      intensity: INTENSITIES.find(i => i.id === intensity)?.label || intensity
    };
    const b64 = encodeURIComponent(btoa(JSON.stringify(shareObj)));
    const url = window.location.origin + window.location.pathname + '#' + b64;
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied to clipboard!');
    }).catch(e => { console.error('Failed to copy link.', e); });
  }, [result, category, intensity]);

  const reset = useCallback(() => {
    setIsFadingOut(true);
    setTimeout(() => {
      setResult(null); setStats(null); setError(null); setText('');
      setIsFadingOut(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (!result) return;
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text('Roastd Results', 15, 20);
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.text(`Category: ${category} | Intensity: ${INTENSITIES.find(i => i.id === intensity)?.label}`, 15, 30);
      doc.setDrawColor(230, 57, 70); doc.setLineWidth(1); doc.line(15, 36, 195, 36);

      let yPos = 46;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('The Roast', 15, yPos); yPos += 8;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(12);
      const splitQuote = doc.splitTextToSize(`"${result.roast_quote}"`, 180); doc.text(splitQuote, 15, yPos);
      yPos += (splitQuote.length * 6) + 4;

      doc.setFont('helvetica', 'bold'); doc.text(`Heat Score: ${result.heat_score}/10`, 15, yPos); yPos += 14;
      if (result.strengths && result.strengths.length > 0) {
        doc.setFontSize(16); doc.text('Strengths', 15, yPos); yPos += 8;
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        result.strengths.forEach((s) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          const st = doc.splitTextToSize('- ' + s, 180); doc.text(st, 15, yPos);
          yPos += (st.length * 5) + 6;
        });
        if (yPos > 250) { doc.addPage(); yPos = 20; } else { yPos += 4; }
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16); doc.text('Perspectives', 15, yPos); yPos += 8;
      doc.setFontSize(12);
      result.multi_perspective.forEach((p, i) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.setFont('helvetica', 'bold'); doc.text(`${i + 1}. ${p.title}`, 15, yPos); yPos += 6;
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(p.content, 180); doc.text(splitText, 15, yPos);
        yPos += (splitText.length * 5) + 6;
      });

      if (yPos > 250) { doc.addPage(); yPos = 20; } else { yPos += 6; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Actionable Tips', 15, yPos); yPos += 8;
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      result.tips.forEach((t, i) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        const splitTip = doc.splitTextToSize(`${i + 1}. ${t}`, 180); doc.text(splitTip, 15, yPos);
        yPos += (splitTip.length * 5) + 3;
      });

      doc.save(`roastd-${Date.now()}.pdf`);
    } catch (e) { alert('Failed to generate PDF: ' + e.message); }
  }, [result, category, intensity]);

  const handleDownloadDOCX = useCallback(async () => {
    if (!result) return;
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/docx@8.2.2/build/index.umd.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');

      if (!window.docx) {
        throw new Error("Failed to load DOCX library from CDN. Please check your internet connection or ad blocker.");
      }

      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

      const children = [
        new Paragraph({ text: "Roastd Results", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Category: ${category} | Intensity: ${INTENSITIES.find(i => i.id === intensity)?.label}` }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "The Roast", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: `"${result.roast_quote}"`, italics: true })] }),
        new Paragraph({ children: [new TextRun({ text: `Heat Score: ${result.heat_score}/10`, bold: true })] }),
        new Paragraph({ text: "" }),
        ...(result.strengths && result.strengths.length > 0 ? [
          new Paragraph({ text: "Strengths", heading: HeadingLevel.HEADING_2 }),
          ...result.strengths.map(s => new Paragraph({ text: "- " + s })),
          new Paragraph({ text: "" }),
        ] : []),
        new Paragraph({ text: "Perspectives", heading: HeadingLevel.HEADING_2 }),
      ];

      result.multi_perspective.forEach((p, i) => {
        children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${p.title}`, bold: true })] }));
        children.push(new Paragraph({ text: p.content }));
        children.push(new Paragraph({ text: "" }));
      });

      children.push(new Paragraph({ text: "Actionable Tips", heading: HeadingLevel.HEADING_2 }));
      result.tips.forEach((t, i) => { children.push(new Paragraph({ text: `${i + 1}. ${t}` })); });
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ text: "Your Improved Version", heading: HeadingLevel.HEADING_2 }));

      const safeRewrite = result.rewrite || "No rewrite provided.";
      safeRewrite.split('\n').forEach(line => { children.push(new Paragraph({ text: line })); });

      const doc = new Document({
        creator: "Roastd AI",
        title: "Roastd Document",
        sections: [{ properties: {}, children }]
      });

      const blob = await Packer.toBlob(doc);
      window.saveAs(blob, `roastd-${Date.now()}.docx`);
    } catch (e) {
      console.error("DOCX Error Details:", e);
      alert('Failed to generate DOCX. Details: ' + e.message);
    }
  }, [result, category, intensity]);

  const getBorderColorForIndex = (i) => [COLORS.accentRed, COLORS.accentYellow, COLORS.accentBlue][i % 3];

  const submitEnabled = !isLoading && text.trim().length > 0;

  const DIVIDER = { height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '0 0 32px 0' };

  const sectionLabelStyle = (color) => ({
    display: 'block',
    fontSize: '11px',
    letterSpacing: '1.5px',
    fontWeight: '700',
    color: color || COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: '20px',
  });

  let countColor = COLORS.error;
  let countMsg = "Too short for a good roast. Paste more.";
  if (wordCount >= 30 && wordCount < 80) {
    countColor = COLORS.accentYellow;
    countMsg = "Getting there. More context means better feedback.";
  } else if (wordCount >= 80 && wordCount <= 500) {
    countColor = COLORS.success;
    countMsg = "Good length.";
  } else if (wordCount > 500) {
    countColor = COLORS.accentBlue;
    countMsg = "Solid. The AI has plenty to work with.";
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: isMobile ? '40px 16px' : '60px 20px',
      color: COLORS.textPrimary,
      minHeight: '100vh',
      position: 'relative',
      zIndex: 1,
      fontFamily: '"DM Sans", system-ui, sans-serif',
    }}>

      {/* HEADER */}
      <header style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '56px' }} className="stagger-1">
        <h1 style={{
          fontSize: isMobile ? '44px' : '72px',
          fontWeight: '900',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          letterSpacing: '-0.05em',
        }}>
          Roastd
          <span style={{ fontSize: isMobile ? '36px' : '56px', lineHeight: '1' }}>🌶️</span>
        </h1>
        <p style={{ fontSize: isMobile ? '16px' : '20px', color: COLORS.textSecondary, margin: 0, fontWeight: '500', letterSpacing: '-0.01em' }}>
          Paste it. Pick your poison. Get roasted.
        </p>
      </header>

      {showResubmissionInterstitial && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="framer-card" style={{ maxWidth: '520px', width: '100%', padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>Hold on. 🤔</h3>
            <p style={{ color: COLORS.textSecondary, lineHeight: '1.6', marginBottom: '32px' }}>
              This looks like the rewrite I just gave you. Are you submitting it again? Let me see how you've improved it.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn" onClick={() => { setShowResubmissionInterstitial(false); performSubmit({ submitText: pendingText, isResubmission: true }); }} style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontWeight:'600' }}>Roast my revision</button>
              <button className="btn" onClick={() => { setShowResubmissionInterstitial(false); setText(''); }} style={{ flex: 1, padding: '16px', background: COLORS.accentRed, borderRadius: '12px', color: '#fff', fontWeight:'600' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {showShareCard && result && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowShareCard(false)}>
          <div style={{ maxWidth: '600px', width: '100%', aspectRatio: '1/1', background: 'radial-gradient(circle at top left, #201010, #050505)', borderRadius: '32px', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: COLORS.accentRed }}>Roastd 🌶️</div>
            <div style={{ fontSize: '32px', fontWeight: '800', fontStyle: 'italic', lineHeight: '1.3' }}>"{result.roast_quote}"</div>
            <div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px' }}>{category}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px' }}>{INTENSITIES.find(i => i.id === intensity)?.label}</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Heat Score: <span style={{color: COLORS.accentRed}}>{result.heat_score}/10</span></div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', margin: '12px 0 16px 0' }}>
                <div style={{ width: `${(result.heat_score / 10) * 100}%`, height: '100%', backgroundColor: COLORS.accentRed }} />
              </div>
              <div style={{ fontSize: '14px', color: COLORS.textMuted, marginTop: '8px' }}>Get roasted at roastd.vercel.app</div>
            </div>
          </div>
        </div>
      )}

      {/* SHARED VIEW ALERT */}
      {sharedRoast && !result && (
        <div className="stagger-2 framer-card" style={{ borderRadius: '20px', padding: isMobile ? '24px' : '32px', borderLeft: `4px solid ${COLORS.accentBlue}`, marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.accentBlue }}></span>
            <h3 style={{ margin: 0, color: COLORS.accentBlue, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>Someone shared a roast</h3>
          </div>
          <p style={{ margin: '0 0 24px 0', fontSize: '18px', fontStyle: 'italic', lineHeight: '1.5', color: COLORS.textPrimary }}>
            "{sharedRoast.roast_quote}"
          </p>
          <div style={{ display: 'flex', gap: '32px', fontSize: '14px', color: COLORS.textSecondary, marginBottom: '32px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong style={{ color: COLORS.textPrimary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Category</strong>
              {sharedRoast.category}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong style={{ color: COLORS.textPrimary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Intensity</strong>
              {sharedRoast.intensity}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong style={{ color: COLORS.accentRed, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Heat Score</strong>
              <span style={{ color: COLORS.accentRed, fontWeight: '700', fontSize: '16px' }}>{sharedRoast.heat_score}/10</span>
            </span>
          </div>
          <button
            className="btn framer-card"
            aria-label="Dismiss shared roast and create your own"
            style={{ padding: '14px 28px', color: COLORS.textPrimary, borderRadius: '12px', fontSize: '15px', fontWeight: '600' }}
            onClick={() => { setSharedRoast(null); window.history.replaceState(null, '', window.location.pathname); }}
          >
            I want to get roasted
          </button>
        </div>
      )}

      {/* INPUT FORM */}
      <section
        className="stagger-2 framer-card"
        style={{ display: result ? 'none' : 'block', borderRadius: isMobile ? '20px' : '28px', padding: isMobile ? '24px' : '48px', marginBottom: '40px' }}
      >
        {/* Category + Goal */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '36px',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              1. Document Type
            </label>
            <select
              className="premium-input"
              aria-label="Select document type"
              style={{ width: '100%', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '16px', borderRadius: '14px', fontSize: '16px', appearance: 'none', cursor: 'pointer' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id} style={{ backgroundColor: '#0f0f14', color: '#ffffff' }}>{c.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              2. Target Goal (Optional)
            </label>
            <input
              className="premium-input"
              type="text"
              style={{ width: '100%', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '16px', borderRadius: '14px', fontSize: '16px' }}
              placeholder={currentCategoryObj.placeholder}
              value={targetGoal}
              onChange={e => setTargetGoal(e.target.value)}
            />
          </div>
        </div>

        {/* Intensity */}
        <div style={{ marginBottom: '36px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            3. Roast Intensity
          </label>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: '12px' }}>
            {INTENSITIES.map(int => {
              const isActive = intensity === int.id;
              return (
                <button
                  key={int.id}
                  className="btn"
                  aria-label={`Set intensity to ${int.label}`}
                  aria-pressed={isActive}
                  onClick={() => setIntensity(int.id)}
                  style={{
                    flex: isSmall ? '1 1 100%' : '1',
                    minWidth: isSmall ? '100%' : '140px',
                    padding: '16px',
                    borderRadius: '14px',
                    border: `1px solid ${isActive ? int.color : COLORS.border}`,
                    backgroundColor: isActive ? `${int.color}18` : COLORS.bgInput,
                    color: isActive ? int.color : COLORS.textSecondary,
                    fontSize: '15px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  }}
                >
                  {isActive && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: int.color,
                      boxShadow: `0 0 10px ${int.color}`,
                      flexShrink: 0,
                    }} />
                  )}
                  {int.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            4. The Victim (Paste Text)
          </label>
          <textarea
            ref={textareaRef}
            className="premium-input"
            style={{
              width: '100%',
              maxWidth: '100%',
              minHeight: '180px',
              backgroundColor: COLORS.bgInput,
              border: `1px solid ${isPasting ? COLORS.success : COLORS.border}`,
              color: COLORS.textPrimary,
              padding: isMobile ? '16px' : '24px',
              borderRadius: '16px',
              fontSize: isMobile ? '15px' : '16px',
              lineHeight: '1.6',
              resize: 'none',
              overflowY: 'auto',
              boxShadow: isPasting ? `0 0 0 4px #10b98140` : textareaFocused ? '0 0 0 4px rgba(244, 63, 94, 0.08)' : 'none',
              transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            placeholder={currentCategoryObj.textareaPlaceholder}
            value={text}
            onChange={handleTextChange}
            onFocus={() => setTextareaFocused(true)}
            onBlur={() => setTextareaFocused(false)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
          />
          {!text && !textareaFocused && (
            <p style={{ margin: '8px 0 0 4px', fontSize: '13px', color: COLORS.textMuted, lineHeight: '1.5' }}>
              Tip: The more text you paste, the better the roast.
            </p>
          )}
          {text && (
            <p style={{ margin: '8px 0 0 4px', fontSize: '13px', color: countColor, lineHeight: '1.5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Word count: {wordCount} <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>({charCount} characters)</span>
              </span>
              <span>{countMsg}</span>
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          className="btn btn-submit"
          aria-label="Submit text for roasting"
          style={{
            width: '100%',
            padding: isMobile ? '18px' : '22px',
            backgroundColor: COLORS.accentRed,
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            fontSize: '18px',
            fontWeight: '800',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            animation: submitEnabled ? 'submitPulse 2.5s ease-in-out infinite' : 'none',
          }}
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
        >
          {isLoading ? 'Roasting in progress...' : 'Roast Me Alive'}
        </button>
        <div style={{ fontSize: '12px', color: COLORS.textMuted, textAlign: 'center', marginTop: '12px' }}>Cmd+Enter (or Ctrl+Enter) to roast</div>

        {error && (
          <div
            role="alert"
            style={{ marginTop: '24px', padding: '16px 20px', backgroundColor: COLORS.accentRedSoft, border: `1px solid rgba(244, 63, 94, 0.4)`, borderRadius: '14px', color: COLORS.accentRed, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong>Error:</strong> {error}
            </div>
            <button className="btn" onClick={handleSubmit} style={{ padding: '8px 16px', background: 'rgba(244, 63, 94, 0.2)', borderRadius: '8px', color: COLORS.accentRed, fontWeight: 'bold', border: 'none' }}>Try Again</button>
          </div>
        )}
      </section>

      {/* LOADING STATE */}
      {isLoading && (
        <div>
          <div className="stagger-1" style={{ textAlign: 'center', padding: '60px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', animation: 'framerReveal 1s infinite alternate cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>🔥</div>
            <div style={{ height: '40px', overflow: 'hidden', marginTop: '32px' }}>
              <h3 key={loadingQuoteIdx} className="stagger-1" style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: '600', margin: 0 }}>
                {LOADING_QUOTES[loadingQuoteIdx]}
              </h3>
            </div>
          </div>
          <ShimmerLoading />
        </div>
      )}

      {/* RECENT ROASTS */}
      {!result && !isLoading && !error && recentRoasts.length > 0 && (
        <div className="stagger-3" style={{ marginTop: '80px' }}>
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: COLORS.textSecondary, fontWeight: '700', marginBottom: '24px', paddingLeft: '8px' }}>
            Hall of Shame (Recent)
          </h3>
          <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '32px', paddingLeft: '8px', scrollSnapType: 'x mandatory' }}>
            {recentRoasts.map((r, idx) => (
              <div key={idx} className="framer-card" style={{ minWidth: isMobile ? '260px' : '300px', width: isMobile ? '260px' : '300px', borderRadius: '20px', padding: isMobile ? '20px' : '28px', scrollSnapAlign: 'start', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{r.category}</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: COLORS.accentRed, backgroundColor: COLORS.accentRedSoft, padding: '4px 10px', borderRadius: '6px' }}>{r.heat_score}/10</span>
                </div>
                <div style={{ fontSize: '15px', fontStyle: 'italic', color: COLORS.textPrimary, lineHeight: '1.6', flex: 1, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{r.roast_quote}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS SECTION */}
      {result && (
        <section ref={resultsRef} aria-live="polite" style={{ paddingTop: '20px', opacity: isFadingOut ? 0 : 1, transition: 'opacity 0.3s ease' }}>

          {/* Quote + Heat Score card */}
          <div className="stagger-1 framer-card" style={{ borderRadius: '28px', padding: isMobile ? '28px 20px' : '56px 48px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', backgroundColor: COLORS.accentRed }} />
            {result.improvement_score && (
              (() => {
                const impColor = result.improvement_score >= 7 ? COLORS.success : result.improvement_score >= 4 ? COLORS.accentYellow : COLORS.error;
                return (
                  <div style={{ backgroundColor: `${impColor}1A`, border: `1px solid ${impColor}4D`, padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: impColor, fontWeight: '700', fontSize: '14px' }}>Improvement from last time:</span>
                    <span style={{ color: impColor, fontWeight: '900', fontSize: '18px' }}>{result.improvement_score}/10</span>
                  </div>
                );
              })()
            )}
            <h2 style={{ margin: '0 0 24px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.textSecondary, fontWeight: '700' }}>
              The Verdict
            </h2>
            <p style={{ margin: 0, fontSize: isMobile ? '22px' : '32px', fontStyle: 'italic', fontWeight: '600', lineHeight: '1.4', color: COLORS.textPrimary, letterSpacing: '-0.02em' }}>
              "<TypewriterText text={result.roast_quote} />"
            </p>

            <div style={{ marginTop: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: COLORS.textSecondary }}>Heat Score</span>
                <span style={{ fontSize: '40px', fontWeight: '800', color: COLORS.accentRed, lineHeight: '1', letterSpacing: '-0.04em' }}>
                  {result.heat_score}<span style={{ fontSize: '20px', color: COLORS.textMuted }}>/10</span>
                </span>
              </div>
              {/* Bar track with notch marks */}
              <div style={{ position: 'relative', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div className="animate-bar" style={{ height: '100%', width: `${(result.heat_score / 10) * 100}%`, backgroundColor: COLORS.accentRed, borderRadius: '4px' }} />
                {[25, 50, 75].map(pct => (
                  <div key={pct} style={{ position: 'absolute', top: 0, left: `${pct}%`, width: '1px', height: '100%', backgroundColor: 'rgba(255,255,255,0.12)', zIndex: 2 }} />
                ))}
              </div>
            </div>
          </div>

          <div style={DIVIDER} />

          {/* Perspectives */}
          <span style={sectionLabelStyle(COLORS.textMuted)}>Perspectives</span>
          <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {result.multi_perspective.map((p, idx) => {
              const color = getBorderColorForIndex(idx);
              return (
                <div key={idx} className="framer-card" style={{ borderRadius: isMobile ? '16px' : '24px', padding: isMobile ? '24px' : '40px', borderTop: `3px solid ${color}` }}>
                  <h4 style={{ margin: '0 0 16px 0', color, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>{p.title}</h4>
                  <p style={{ margin: 0, lineHeight: '1.7', fontSize: isMobile ? '15px' : '16px', color: COLORS.textSecondary }}>{p.content}</p>
                </div>
              );
            })}
          </div>

          <div style={DIVIDER} />

          {/* Strengths */}
          {(result.strengths && result.strengths.length > 0) && (
            <div className="stagger-2 framer-card" style={{ borderRadius: '28px', padding: isMobile ? '28px 20px' : '48px', marginBottom: '32px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderLeft: `4px solid ${COLORS.success}` }}>
              <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 32px 0', display: 'flex', alignItems: 'center', gap: '12px', color: COLORS.success }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: COLORS.success, flexShrink: 0 }} />
                What You Did Right
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {result.strengths.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ color: COLORS.success, fontSize: '18px', fontWeight: '900' }}>✓</div>
                    <p style={{ margin: 0, fontSize: isMobile ? '15px' : '17px', lineHeight: '1.6', color: COLORS.textPrimary }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={DIVIDER} />

          {/* Tips */}
          <div className="stagger-3 framer-card" style={{ borderRadius: '28px', padding: isMobile ? '28px 20px' : '48px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 32px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: COLORS.accentYellow, flexShrink: 0 }} />
              Actionable Fixes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {result.tips.map((t, idx) => (
                <div
                  key={idx}
                  className="tip-item"
                  style={{ display: 'flex', gap: isMobile ? '16px' : '20px', alignItems: 'flex-start', animationDelay: `${idx * 0.08}s` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${COLORS.accentYellow}15`, color: COLORS.accentYellow, fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>{idx + 1}</div>
                  <p style={{ margin: 0, fontSize: isMobile ? '15px' : '17px', lineHeight: '1.6', color: COLORS.textPrimary }}>{t}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={DIVIDER} />

          {/* Rewrite */}
          <span style={sectionLabelStyle(COLORS.accentBlue)}>Your Improved Version</span>
          <div className="stagger-3 framer-card" style={{ borderRadius: '28px', overflow: 'hidden', marginBottom: '48px', borderLeft: `4px solid ${COLORS.accentBlue}` }}>
            <div style={{
              padding: isMobile ? '16px 20px' : '24px 40px',
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '12px' : '0',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS.accentBlue }} />
                <h3 style={{ fontSize: '11px', fontWeight: '800', margin: 0, color: COLORS.accentBlue, textTransform: 'uppercase', letterSpacing: '1.5px' }}>The Rewrite</h3>
              </div>
              <button
                className="btn"
                aria-label="Copy rewritten text to clipboard"
                onClick={handleCopyRewrite}
                style={{
                  padding: '10px 20px',
                  backgroundColor: copied ? `${COLORS.success}22` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${copied ? COLORS.success : COLORS.border}`,
                  color: copied ? COLORS.success : COLORS.textPrimary,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.25s ease',
                  animation: copied ? 'copyPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
                }}
              >
                {copied ? 'Copied ✓' : 'Copy Text'}
              </button>
            </div>
            <div style={{ padding: isMobile ? '24px 20px' : '40px', whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: isMobile ? '15px' : '17px', color: COLORS.textPrimary }}>
              {result.rewrite}
            </div>
          </div>

          {/* Action buttons */}
          <div
            className="stagger-3"
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, auto)',
              gap: '12px',
              justifyContent: isMobile ? 'stretch' : 'center',
              marginBottom: '16px',
            }}
          >
            <button
              className="btn framer-card"
              aria-label="Download results as PDF"
              style={{ padding: '16px 20px', color: COLORS.textPrimary, borderRadius: '16px', fontSize: '15px', fontWeight: '600' }}
              onClick={handleDownloadPDF}
            >
              Download PDF
            </button>
            <button
              className="btn framer-card"
              aria-label="Download results as DOCX"
              style={{ padding: '16px 20px', color: COLORS.textPrimary, borderRadius: '16px', fontSize: '15px', fontWeight: '600' }}
              onClick={handleDownloadDOCX}
            >
              Download DOCX
            </button>
            <button
              className="btn framer-card"
              aria-label="Copy shareable link to clipboard"
              style={{ padding: '16px 20px', color: COLORS.accentBlue, borderColor: 'rgba(59, 130, 246, 0.3)', borderRadius: '16px', fontSize: '15px', fontWeight: '600' }}
              onClick={handleShare}
            >
              Share Link
            </button>
            <button
              className="btn framer-card"
              aria-label="Show share card"
              style={{ padding: '16px 20px', color: COLORS.accentYellow, borderColor: 'rgba(251, 191, 36, 0.3)', borderRadius: '16px', fontSize: '15px', fontWeight: '600' }}
              onClick={() => setShowShareCard(true)}
            >
              Share Card
            </button>
            <button
              className="btn btn-roast-another"
              aria-label="Start a new roast"
              style={{
                padding: '16px 28px',
                backgroundColor: COLORS.textPrimary,
                color: COLORS.bgDeep,
                border: 'none',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: '800',
                gridColumn: isMobile ? 'span 2' : 'auto'
              }}
              onClick={reset}
            >
              Roast Another
            </button>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', marginTop: '80px', paddingBottom: '48px' }}>
        <p style={{ fontSize: '12px', color: COLORS.textMuted, margin: 0, lineHeight: '1.6' }}>
          Built with Gemini 2.5 Flash. Roasted with love.
        </p>
      </footer>

    </div>
  );
}
