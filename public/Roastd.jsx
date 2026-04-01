const { useState, useEffect, useRef } = React;

// --- Design System & Theme ---
const COLORS = {
  bgDeep: '#050505', // Darker, almost true black for better contrast
  bgCard: 'rgba(15, 15, 20, 0.6)', // Glassmorphism base
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
  { id: 'Startup Pitch', placeholder: 'e.g. Raise a seed round from top VCs' },
  { id: 'CV / Resume', placeholder: 'e.g. Get hired as a senior developer' },
  { id: 'Dating Profile', placeholder: 'e.g. Get more meaningful matches' },
  { id: 'Bio / About Me', placeholder: 'e.g. Build a memorable personal brand' },
];

const INTENSITIES = [
  { id: 'gentle', label: 'Gentle Nudge', color: COLORS.accentBlue },
  { id: 'hard', label: 'Hard Truth', color: COLORS.accentYellow },
  { id: 'full', label: 'Full Roast', color: COLORS.accentRed },
];

const LOADING_QUOTES = [
  "Running your text through the reality check...",
  "Trying to find a silver lining...",
  "Oof. Okay, let's look at this...",
  "Waking up the harsh AI judge...",
  "Preparing the emotional damage..."
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

function Roastd() {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [targetGoal, setTargetGoal] = useState('');
  const [intensity, setIntensity] = useState('hard');
  const [text, setText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingQuoteIdx, setLoadingQuoteIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const [recentRoasts, setRecentRoasts] = useState([]);
  const [sharedRoast, setSharedRoast] = useState(null);
  const [copied, setCopied] = useState(false);

  const resultsRef = useRef(null);

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

    // --- FRAMER AESTHETIC CSS INJECTION ---
    const style = document.createElement('style');
    style.innerHTML = `
      * { box-sizing: border-box; }
      
      /* Dark Mesh Gradient Background */
      body { 
        background-color: ${COLORS.bgDeep}; 
        background-image: 
          radial-gradient(circle at 15% 50%, rgba(244, 63, 94, 0.08), transparent 25%),
          radial-gradient(circle at 85% 30%, rgba(59, 130, 246, 0.08), transparent 25%);
        background-attachment: fixed;
      }

      /* Native Dropdown Overrides */
      option {
        background-color: #0f0f14;
        color: #ffffff;
      }

      /* Framer-style inputs */
      .premium-input {
        transition: border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
      }
      .premium-input:focus {
        outline: none; 
        border-color: rgba(255,255,255,0.3) !important;
        background-color: rgba(255,255,255,0.05) !important;
        box-shadow: 0 0 0 4px rgba(255,255,255,0.05);
      }
      
      /* Framer-style Spring Buttons */
      .btn { 
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease; 
        cursor: pointer; 
      }
      .btn:hover:not(:disabled) { 
        transform: scale(1.03) translateY(-2px); 
        filter: brightness(1.1);
      }
      .btn:active:not(:disabled) { 
        transform: scale(0.97); 
        transition: transform 0.1s; /* Faster snap back on click */
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      
      /* Glassmorphism Cards */
      .framer-card { 
        background: ${COLORS.bgCard};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid ${COLORS.border};
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.05);
        transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease; 
      }
      .framer-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.1);
      }

      /* Spring Reveal Animations */
      @keyframes framerReveal { 
        0% { opacity: 0; transform: translateY(30px) scale(0.95); } 
        100% { opacity: 1; transform: translateY(0) scale(1); } 
      }
      
      .stagger-1 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
      .stagger-2 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.1s forwards; opacity: 0; }
      .stagger-3 { animation: framerReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.2s forwards; opacity: 0; }
      
      @keyframes fillBar { from { width: 0%; } }
      .animate-bar { animation: fillBar 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

      /* Custom scrollbar */
      ::-webkit-scrollbar { height: 6px; width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
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

  const saveToRecent = (newResult, reqCategory, reqIntensity) => {
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
  };

  const currentCategoryObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  const handleSubmit = async () => {
    if (!text.trim()) return;

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
          text: text.trim(),
          category,
          targetGoal: targetGoal.trim() || 'Improve my text',
          intensity
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

      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRewrite = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.rewrite).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
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
  };

  const reset = () => {
    setResult(null); setStats(null); setError(null); setText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      // ... (PDF logic remains identical, it works well)
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
  };

  // --- THE DOCX FIX ---
  const handleDownloadDOCX = async () => {
    if (!result) return;
    try {
      // FIX 1: Use jsDelivr and a slightly older, much more stable browser build (8.2.2)
      await loadScript('https://cdn.jsdelivr.net/npm/docx@8.2.2/build/index.umd.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');

      // FIX 2: Ensure the library actually loaded onto the window object
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

      // FIX 3: Safe string splitting in case rewrite is malformed
      const safeRewrite = result.rewrite || "No rewrite provided.";
      safeRewrite.split('\n').forEach(line => {
        children.push(new Paragraph({ text: line }));
      });

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
  };

  const getBorderColorForIndex = (i) => [COLORS.accentRed, COLORS.accentYellow, COLORS.accentBlue][i % 3];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: COLORS.textPrimary, minHeight: '100vh', position: 'relative', zIndex: 1, fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* HEADER */}
      <header style={{ textAlign: 'center', marginBottom: '56px' }} className="stagger-1">
        <h1 style={{ fontSize: '72px', fontWeight: '800', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', letterSpacing: '-0.04em' }}>
          Roastd
          <span style={{ fontSize: '56px', lineHeight: '1' }}>🌶️</span>
        </h1>
        <p style={{ fontSize: '20px', color: COLORS.textSecondary, margin: 0, fontWeight: '500', letterSpacing: '-0.01em' }}>Paste it. Pick your poison. Get roasted.</p>
      </header>

      {/* SHARED VIEW ALERT */}
      {sharedRoast && !result && (
        <div className="stagger-2 framer-card" style={{ borderRadius: '20px', padding: '32px', borderLeft: `4px solid ${COLORS.accentBlue}`, marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.accentBlue }}></span>
            <h3 style={{ margin: 0, color: COLORS.accentBlue, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Someone shared a roast</h3>
          </div>
          <p style={{ margin: '0 0 24px 0', fontSize: '22px', fontStyle: 'italic', lineHeight: '1.5', color: COLORS.textPrimary }}>"{sharedRoast.roast_quote}"</p>
          <div style={{ display: 'flex', gap: '32px', fontSize: '14px', color: COLORS.textSecondary, marginBottom: '32px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><strong style={{ color: COLORS.textPrimary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Category</strong> {sharedRoast.category}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><strong style={{ color: COLORS.textPrimary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Intensity</strong> {sharedRoast.intensity}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><strong style={{ color: COLORS.accentRed, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Heat Score</strong> <span style={{ color: COLORS.accentRed, fontWeight: '700', fontSize: '16px' }}>{sharedRoast.heat_score}/10</span></span>
          </div>
          <button className="btn framer-card" style={{ padding: '14px 28px', color: COLORS.textPrimary, borderRadius: '12px', fontSize: '15px', fontWeight: '600' }} onClick={() => { setSharedRoast(null); window.history.replaceState(null, '', window.location.pathname); }}>
            I want to get roasted
          </button>
        </div>
      )}

      {/* INPUT FORM */}
      <section className="stagger-2 framer-card" style={{ display: result ? 'none' : 'block', borderRadius: '28px', padding: '48px', marginBottom: '40px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '36px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>1. Document Type</label>
            <select className="premium-input" style={{ width: '100%', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '16px', borderRadius: '14px', fontSize: '16px', appearance: 'none', cursor: 'pointer' }} value={category} onChange={e => setCategory(e.target.value)}>
              {/* THE FIX: Explicitly forcing dark background on the options */}
              {CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: '#0f0f14', color: '#ffffff' }}>{c.id}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>2. Target Goal (Optional)</label>
            <input className="premium-input" type="text" style={{ width: '100%', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '16px', borderRadius: '14px', fontSize: '16px' }} placeholder={currentCategoryObj.placeholder} value={targetGoal} onChange={e => setTargetGoal(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: '36px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>3. Roast Intensity</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {INTENSITIES.map(int => {
              const isActive = intensity === int.id;
              return (
                <button key={int.id} className="btn" onClick={() => setIntensity(int.id)}
                  style={{ flex: 1, minWidth: '140px', padding: '16px', borderRadius: '14px', border: `1px solid ${isActive ? int.color : COLORS.border}`, backgroundColor: isActive ? `${int.color}15` : COLORS.bgInput, color: isActive ? int.color : COLORS.textSecondary, fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isActive && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: int.color, boxShadow: `0 0 10px ${int.color}` }}></span>}
                  {int.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>4. The Victim (Paste Text)</label>
          <textarea className="premium-input" style={{ width: '100%', minHeight: '220px', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '24px', borderRadius: '16px', fontSize: '16px', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit' }} placeholder="Paste your CV, dating bio, or startup pitch here. Don't hold back..." value={text} onChange={e => setText(e.target.value)} />
        </div>

        <button className="btn" style={{ width: '100%', padding: '22px', backgroundColor: COLORS.accentRed, color: '#fff', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: `0 8px 30px ${COLORS.accentRedSoft}`, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={handleSubmit} disabled={isLoading || !text.trim()}>
          {isLoading ? 'Roasting in progress...' : 'Roast Me Alive'}
        </button>

        {error && (
          <div style={{ marginTop: '24px', padding: '16px 20px', backgroundColor: COLORS.accentRedSoft, border: `1px solid rgba(244, 63, 94, 0.4)`, borderRadius: '14px', color: COLORS.accentRed, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <strong>Error:</strong> {error}
          </div>
        )}
      </section>

      {/* LOADING STATE */}
      {isLoading && (
        <div className="stagger-1" style={{ textAlign: 'center', padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '64px', animation: 'framerReveal 1s infinite alternate cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>🔥</div>
          <div style={{ height: '40px', overflow: 'hidden', marginTop: '32px' }}>
            <h3 key={loadingQuoteIdx} className="stagger-1" style={{ color: COLORS.textPrimary, fontSize: '22px', fontWeight: '600', margin: 0 }}>
              {LOADING_QUOTES[loadingQuoteIdx]}
            </h3>
          </div>
        </div>
      )}

      {/* RECENT ROASTS */}
      {!result && !isLoading && !error && recentRoasts.length > 0 && (
        <div className="stagger-3" style={{ marginTop: '80px' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.textSecondary, fontWeight: '700', marginBottom: '24px', paddingLeft: '8px' }}>Hall of Shame (Recent)</h3>
          <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '32px', scrollSnapType: 'x mandatory' }}>
            {recentRoasts.map((r, idx) => (
              <div key={idx} className="framer-card" style={{ minWidth: '320px', width: '320px', borderRadius: '20px', padding: '28px', scrollSnapAlign: 'start', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.category}</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: COLORS.accentRed, backgroundColor: COLORS.accentRedSoft, padding: '4px 10px', borderRadius: '6px' }}>{r.heat_score}/10</span>
                </div>
                <div style={{ fontSize: '16px', fontStyle: 'italic', color: COLORS.textPrimary, lineHeight: '1.6', flex: 1, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{r.roast_quote}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS SECTION */}
      {result && (
        <section ref={resultsRef} style={{ paddingTop: '20px' }}>

          <div className="stagger-1 framer-card" style={{ borderRadius: '28px', padding: '56px 48px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', backgroundColor: COLORS.accentRed }}></div>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.textSecondary, fontWeight: '700' }}>The Verdict</h2>
            <p style={{ margin: 0, fontSize: '32px', fontStyle: 'italic', fontWeight: '600', lineHeight: '1.4', color: COLORS.textPrimary, letterSpacing: '-0.02em' }}>"{result.roast_quote}"</p>

            <div style={{ marginTop: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.textSecondary }}>Heat Score</span>
                <span style={{ fontSize: '40px', fontWeight: '800', color: COLORS.accentRed, lineHeight: '1', letterSpacing: '-0.04em' }}>{result.heat_score}<span style={{ fontSize: '20px', color: COLORS.textMuted }}>/10</span></span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div className="animate-bar" style={{ height: '100%', width: `${(result.heat_score / 10) * 100}%`, backgroundColor: COLORS.accentRed, borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {result.multi_perspective.map((p, idx) => {
              const color = getBorderColorForIndex(idx);
              return (
                <div key={idx} className="framer-card" style={{ borderRadius: '24px', padding: '40px', borderTop: `4px solid ${color}` }}>
                  <h4 style={{ margin: '0 0 16px 0', color: color, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>{p.title}</h4>
                  <p style={{ margin: 0, lineHeight: '1.7', fontSize: '16px', color: COLORS.textSecondary }}>{p.content}</p>
                </div>
              );
            })}
          </div>

          <div className="stagger-3 framer-card" style={{ borderRadius: '28px', padding: '48px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 32px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: COLORS.accentYellow }}></span>
              Actionable Fixes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {result.tips.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${COLORS.accentYellow}15`, color: COLORS.accentYellow, fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>{idx + 1}</div>
                  <p style={{ margin: 0, fontSize: '17px', lineHeight: '1.6', color: COLORS.textPrimary }}>{t}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="stagger-3 framer-card" style={{ borderRadius: '28px', overflow: 'hidden', marginBottom: '48px' }}>
            <div style={{ padding: '24px 40px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS.accentBlue }}></span>
                <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: COLORS.accentBlue, textTransform: 'uppercase', letterSpacing: '1px' }}>The Rewrite</h3>
              </div>
              <button className="btn" onClick={handleCopyRewrite} style={{ padding: '10px 20px', backgroundColor: copied ? `${COLORS.success}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? COLORS.success : COLORS.border}`, color: copied ? COLORS.success : COLORS.textPrimary, borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}>
                {copied ? 'Copied ✓' : 'Copy Text'}
              </button>
            </div>
            <div style={{ padding: '40px', whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '17px', color: COLORS.textPrimary }}>
              {result.rewrite}
            </div>
          </div>

          <div className="stagger-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            <button className="btn framer-card" style={{ padding: '16px 32px', color: COLORS.textPrimary, borderRadius: '16px', fontSize: '16px', fontWeight: '600' }} onClick={handleDownloadPDF}>Download PDF</button>
            <button className="btn framer-card" style={{ padding: '16px 32px', color: COLORS.textPrimary, borderRadius: '16px', fontSize: '16px', fontWeight: '600' }} onClick={handleDownloadDOCX}>Download DOCX</button>
            <button className="btn framer-card" style={{ padding: '16px 32px', color: COLORS.accentBlue, borderColor: 'rgba(59, 130, 246, 0.3)', borderRadius: '16px', fontSize: '16px', fontWeight: '600' }} onClick={handleShare}>Share Link</button>
            <button className="btn" style={{ padding: '16px 40px', backgroundColor: COLORS.textPrimary, color: COLORS.bgDeep, border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', marginLeft: 'auto' }} onClick={reset}>Roast Another</button>
          </div>
        </section>
      )}
    </div>
  );
}