const { useState, useEffect, useRef } = React;

// --- Design System & Theme ---
const COLORS = {
  bgDeep: '#0c0f15',
  bgCard: '#131824',
  bgInput: '#0a0d12',
  border: '#232a3b',
  borderFocus: '#4b5563',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accentRed: '#e63946',
  accentRedSoft: 'rgba(230, 57, 70, 0.1)',
  accentYellow: '#fbbf24',
  accentBlue: '#3b82f6',
  accentBlueSoft: 'rgba(59, 130, 246, 0.1)',
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
  { id: 'Gentle Nudge', label: 'Gentle Nudge', color: COLORS.accentBlue },
  { id: 'Hard Truth', label: 'Hard Truth', color: COLORS.accentYellow },
  { id: 'Full Roast', label: 'Full Roast', color: COLORS.accentRed },
];

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

function Roastd() {
  // --- State ---
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [targetGoal, setTargetGoal] = useState('');
  const [intensity, setIntensity] = useState('Hard Truth');
  const [text, setText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const [recentRoasts, setRecentRoasts] = useState([]);
  const [sharedRoast, setSharedRoast] = useState(null);
  const [copied, setCopied] = useState(false);

  const resultsRef = useRef(null);

  // --- Initialization & Styling ---
  useEffect(() => {
    // Load local storage
    try {
      const saved = localStorage.getItem('recentRoasts');
      if (saved) {
        setRecentRoasts(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Could not load recent roasts', e);
    }

    // Handle shared links via URL Hash
    if (window.location.hash) {
      try {
        const hashData = window.location.hash.substring(1);
        const decoded = JSON.parse(atob(decodeURIComponent(hashData)));
        setSharedRoast(decoded);
      } catch (e) {
        console.error('Invalid share link', e);
      }
    }

    // Inject Global Interactive Styles (Animations & Pseudo-classes)
    const style = document.createElement('style');
    style.innerHTML = `
      * { box-sizing: border-box; }
      
      /* Input Interactions */
      .premium-input:focus {
        outline: none;
        border-color: ${COLORS.borderFocus} !important;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
      }
      
      /* Button Interactions */
      .btn {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      }
      .btn:hover:not(:disabled) { transform: translateY(-2px); }
      .btn:active:not(:disabled) { transform: translateY(0); }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      
      /* Card Hover Effects */
      .interactive-card {
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
      }
      .interactive-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5);
      }

      /* Scrollbar */
      ::-webkit-scrollbar { height: 6px; width: 6px; }
      ::-webkit-scrollbar-track { background: ${COLORS.bgDeep}; }
      ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${COLORS.borderFocus}; }

      /* Animations */
      @keyframes flamePulse {
        0%, 100% { transform: scale(1); opacity: 1; filter: brightness(1); }
        50% { transform: scale(1.1); opacity: 0.8; filter: brightness(1.2); }
      }
      .flame-loader { animation: flamePulse 1.2s infinite ease-in-out; display: inline-block; font-size: 48px; }
      
      @keyframes slideUpFade {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .stagger-1 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .stagger-2 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
      .stagger-3 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
      .stagger-4 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
      .stagger-5 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; opacity: 0; }

      @keyframes fillBar {
        from { width: 0%; }
      }
      .animate-bar { animation: fillBar 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    `;
    document.head.appendChild(style);
  }, []);

  // --- Handlers ---
  const saveToRecent = (newResult, reqCategory, reqIntensity) => {
    const roastData = {
      id: Date.now().toString(),
      roast_quote: newResult.roast_quote,
      heat_score: newResult.heat_score,
      category: reqCategory,
      intensity: reqIntensity,
      timestamp: new Date().toISOString()
    };

    setRecentRoasts(prev => {
      const updated = [roastData, ...prev].slice(0, 5); // Kept last 5 for better horizontal scrolling
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
      intensity
    };
    const b64 = encodeURIComponent(btoa(JSON.stringify(shareObj)));
    const url = window.location.origin + window.location.pathname + '#' + b64;
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied to clipboard!');
    }).catch(e => {
      console.error('Failed to copy link.', e);
    });
  };

  const reset = () => {
    setResult(null);
    setStats(null);
    setError(null);
    setText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Document Downloads (Preserved Logic) ---
  const handleDownloadPDF = async () => {
    if (!result) return;
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Roastd Results', 15, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Category: ${category} | Intensity: ${intensity}`, 15, 30);
      doc.setDrawColor(230, 57, 70);
      doc.setLineWidth(1);
      doc.line(15, 36, 195, 36);

      let yPos = 46;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('The Roast', 15, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(12);
      const splitQuote = doc.splitTextToSize(`"${result.roast_quote}"`, 180);
      doc.text(splitQuote, 15, yPos);
      yPos += (splitQuote.length * 6) + 4;

      doc.setFont('helvetica', 'bold');
      doc.text(`Heat Score: ${result.heat_score}/10`, 15, yPos);
      yPos += 14;

      doc.setFontSize(16);
      doc.text('Perspectives', 15, yPos);
      yPos += 8;
      doc.setFontSize(12);
      result.multi_perspective.forEach((p, i) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${p.title}`, 15, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(p.content, 180);
        doc.text(splitText, 15, yPos);
        yPos += (splitText.length * 5) + 6;
      });

      if (yPos > 250) { doc.addPage(); yPos = 20; } else { yPos += 6; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Actionable Tips', 15, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      result.tips.forEach((t, i) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        const splitTip = doc.splitTextToSize(`${i + 1}. ${t}`, 180);
        doc.text(splitTip, 15, yPos);
        yPos += (splitTip.length * 5) + 3;
      });

      doc.save(`roastd-${Date.now()}.pdf`);
    } catch (e) { alert('Failed to generate PDF: ' + e.message); }
  };

  const handleDownloadDOCX = async () => {
    if (!result) return;
    try {
      await loadScript('https://unpkg.com/docx@8.5.0/build/index.umd.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

      const children = [
        new Paragraph({ text: "Roastd Results", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Category: ${category} | Intensity: ${intensity}` }),
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
      result.rewrite.split('\n').forEach(line => { children.push(new Paragraph({ text: line })); });

      const doc = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(doc);
      window.saveAs(blob, `roastd-${Date.now()}.docx`);
    } catch (e) { alert('Failed to generate DOCX: ' + e.message); }
  };

  // --- UI Helpers ---
  const getBorderColorForIndex = (i) => [COLORS.accentRed, COLORS.accentYellow, COLORS.accentBlue][i % 3];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: COLORS.textPrimary, minHeight: '100vh' }}>

      {/* HEADER */}
      <header style={{ textAlign: 'center', marginBottom: '48px' }} className="stagger-1">
        <h1 style={{ fontSize: '56px', fontWeight: '800', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', letterSpacing: '-0.02em' }}>
          Roastd
          <span style={{ fontSize: '48px', lineHeight: '1' }}>🌶️</span>
        </h1>
        <p style={{ fontSize: '18px', color: COLORS.textSecondary, margin: 0, fontWeight: '500' }}>Paste it. Pick your poison. Get roasted.</p>
      </header>

      {/* SHARED VIEW ALERT */}
      {sharedRoast && !result && (
        <div className="stagger-2 interactive-card" style={{ backgroundColor: COLORS.bgCard, borderRadius: '16px', padding: '32px', border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${COLORS.accentBlue}`, marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.accentBlue }}></span>
            <h3 style={{ margin: 0, color: COLORS.accentBlue, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Shared Roast</h3>
          </div>
          <p style={{ margin: '0 0 24px 0', fontSize: '20px', fontStyle: 'italic', lineHeight: '1.5', color: COLORS.textPrimary }}>"{sharedRoast.roast_quote}"</p>
          <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: COLORS.textSecondary, marginBottom: '24px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ color: COLORS.textPrimary }}>Category</strong> {sharedRoast.category}</span>
            <span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ color: COLORS.textPrimary }}>Intensity</strong> {sharedRoast.intensity}</span>
            <span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ color: COLORS.accentRed }}>Heat Score</strong> <span style={{ color: COLORS.accentRed, fontWeight: '700' }}>{sharedRoast.heat_score}/10</span></span>
          </div>
          <button className="btn" style={{ padding: '12px 24px', backgroundColor: COLORS.bgInput, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '14px', fontWeight: '600' }} onClick={() => { setSharedRoast(null); window.history.replaceState(null, '', window.location.pathname); }}>
            Roast Your Own Text
          </button>
        </div>
      )}

      {/* INPUT FORM */}
      <section className="stagger-2" style={{ display: result ? 'none' : 'block', backgroundColor: COLORS.bgCard, borderRadius: '24px', padding: '40px', border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>

        {/* Dropdown & Input Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>1. Document Type</label>
            <select className="premium-input" style={{ width: '100%', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '16px', borderRadius: '12px', fontSize: '16px', appearance: 'none', cursor: 'pointer', transition: 'all 0.2s' }} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>2. Target Goal (Optional)</label>
            <input className="premium-input" type="text" style={{ width: '100%', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '16px', borderRadius: '12px', fontSize: '16px', transition: 'all 0.2s' }} placeholder={currentCategoryObj.placeholder} value={targetGoal} onChange={e => setTargetGoal(e.target.value)} />
          </div>
        </div>

        {/* Intensity Selector */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>3. Roast Intensity</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {INTENSITIES.map(int => {
              const isActive = intensity === int.label;
              return (
                <button key={int.id} className="btn" onClick={() => setIntensity(int.label)}
                  style={{ flex: 1, minWidth: '140px', padding: '16px', borderRadius: '12px', border: `1px solid ${isActive ? int.color : COLORS.border}`, backgroundColor: isActive ? `${int.color}15` : COLORS.bgInput, color: isActive ? int.color : COLORS.textSecondary, fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isActive && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: int.color }}></span>}
                  {int.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Area */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>4. The Victim (Paste Text)</label>
          <textarea className="premium-input" style={{ width: '100%', minHeight: '200px', backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, padding: '20px', borderRadius: '12px', fontSize: '16px', lineHeight: '1.6', resize: 'vertical', transition: 'all 0.2s', fontFamily: 'inherit' }} placeholder="Paste your CV, dating bio, or startup pitch here. Don't hold back..." value={text} onChange={e => setText(e.target.value)} />
        </div>

        <button className="btn" style={{ width: '100%', padding: '20px', backgroundColor: COLORS.accentRed, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: `0 8px 24px ${COLORS.accentRedSoft}`, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }} onClick={handleSubmit} disabled={isLoading || !text.trim()}>
          {isLoading ? 'Summoning the AI...' : 'Roast Me Alive'}
        </button>

        {error && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: COLORS.accentRedSoft, border: `1px solid rgba(230, 57, 70, 0.3)`, borderRadius: '12px', color: COLORS.accentRed, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </section>

      {/* LOADING STATE */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div className="flame-loader">🔥</div>
          <h3 style={{ marginTop: '24px', color: COLORS.textSecondary, fontSize: '18px', fontWeight: '500' }}>Analyzing your life choices...</h3>
        </div>
      )}

      {/* RECENT ROASTS */}
      {!result && !isLoading && !error && recentRoasts.length > 0 && (
        <div className="stagger-3" style={{ marginTop: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.textSecondary, fontWeight: '700', margin: 0 }}>Hall of Shame (Recent)</h3>
          </div>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', scrollSnapType: 'x mandatory' }}>
            {recentRoasts.map((r, idx) => (
              <div key={idx} className="interactive-card" style={{ minWidth: '300px', width: '300px', backgroundColor: COLORS.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${COLORS.border}`, scrollSnapAlign: 'start', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.category}</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: COLORS.accentRed, backgroundColor: COLORS.accentRedSoft, padding: '4px 8px', borderRadius: '4px' }}>{r.heat_score}/10</span>
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
        <section ref={resultsRef} style={{ paddingTop: '20px' }}>

          {/* Headline Verdict */}
          <div className="stagger-1" style={{ backgroundColor: COLORS.bgCard, borderRadius: '24px', padding: '48px 40px', border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', backgroundColor: COLORS.accentRed }}></div>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.textMuted, fontWeight: '700' }}>The Verdict</h2>
            <p style={{ margin: 0, fontSize: '28px', fontStyle: 'italic', fontWeight: '600', lineHeight: '1.4', color: COLORS.textPrimary }}>"{result.roast_quote}"</p>

            {/* Animated Heat Score */}
            <div style={{ marginTop: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: COLORS.textSecondary }}>Heat Score</span>
                <span style={{ fontSize: '32px', fontWeight: '800', color: COLORS.accentRed, lineHeight: '1' }}>{result.heat_score}<span style={{ fontSize: '18px', color: COLORS.textMuted }}>/10</span></span>
              </div>
              <div style={{ height: '8px', backgroundColor: COLORS.bgInput, borderRadius: '4px', overflow: 'hidden' }}>
                <div className="animate-bar" style={{ height: '100%', width: `${(result.heat_score / 10) * 100}%`, backgroundColor: COLORS.accentRed, borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          {/* Perspectives Grid */}
          <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {result.multi_perspective.map((p, idx) => {
              const color = getBorderColorForIndex(idx);
              return (
                <div key={idx} className="interactive-card" style={{ backgroundColor: COLORS.bgCard, borderRadius: '16px', padding: '32px', border: `1px solid ${COLORS.border}`, borderTop: `4px solid ${color}` }}>
                  <h4 style={{ margin: '0 0 16px 0', color: color, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>{p.title}</h4>
                  <p style={{ margin: 0, lineHeight: '1.7', fontSize: '15px', color: COLORS.textSecondary }}>{p.content}</p>
                </div>
              );
            })}
          </div>

          {/* Actionable Tips */}
          <div className="stagger-3 interactive-card" style={{ backgroundColor: COLORS.bgCard, borderRadius: '24px', padding: '40px', border: `1px solid ${COLORS.border}`, marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '2px', backgroundColor: COLORS.accentYellow }}></span>
              Actionable Fixes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {result.tips.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: `${COLORS.accentYellow}15`, color: COLORS.accentYellow, fontSize: '13px', fontWeight: '800', flexShrink: 0, marginTop: '2px' }}>{idx + 1}</div>
                  <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.6', color: COLORS.textPrimary }}>{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rewrite */}
          <div className="stagger-4" style={{ backgroundColor: COLORS.bgCard, borderRadius: '24px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginBottom: '40px' }}>
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgDeep }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: COLORS.accentBlue, textTransform: 'uppercase', letterSpacing: '1px' }}>The Rewrite</h3>
              <button className="btn" onClick={handleCopyRewrite} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${copied ? COLORS.success : COLORS.border}`, color: copied ? COLORS.success : COLORS.textSecondary, borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <div style={{ padding: '32px', whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '16px', color: COLORS.textPrimary }}>
              {result.rewrite}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="stagger-5" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            <button className="btn" style={{ padding: '14px 28px', backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: '12px', fontSize: '15px', fontWeight: '700' }} onClick={handleDownloadPDF}>Download PDF</button>
            <button className="btn" style={{ padding: '14px 28px', backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: '12px', fontSize: '15px', fontWeight: '700' }} onClick={handleDownloadDOCX}>Download DOCX</button>
            <button className="btn" style={{ padding: '14px 28px', backgroundColor: COLORS.accentBlueSoft, color: COLORS.accentBlue, border: `1px solid rgba(59, 130, 246, 0.3)`, borderRadius: '12px', fontSize: '15px', fontWeight: '700' }} onClick={handleShare}>Share Roast Link</button>
            <button className="btn" style={{ padding: '14px 28px', backgroundColor: COLORS.textPrimary, color: COLORS.bgDeep, border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', marginLeft: 'auto' }} onClick={reset}>Roast Another</button>
          </div>

          {/* Observability Stats */}
          {stats && (
            <div className="stagger-5" style={{ marginTop: '60px', textAlign: 'center', borderTop: `1px solid ${COLORS.border}`, paddingTop: '24px' }}>
              <button onClick={() => setShowStats(!showStats)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                {showStats ? 'Hide API Stats' : 'View API Stats'}
              </button>
              {showStats && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '16px', fontSize: '13px', color: COLORS.textMuted, animation: 'slideUpFade 0.3s ease forwards' }}>
                  <div><strong style={{ color: COLORS.textSecondary }}>Tokens:</strong> {stats.tokens}</div>
                  <div><strong style={{ color: COLORS.textSecondary }}>Latency:</strong> {stats.latency}ms</div>
                  <div><strong style={{ color: COLORS.textSecondary }}>Retries:</strong> {stats.retries}</div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}