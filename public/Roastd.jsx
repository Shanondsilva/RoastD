const { useState, useEffect, useRef } = React;

const COLORS = {
  bgDeep: '#0c0f15',
  bgCard: '#151a26',
  bgCardHover: '#1c2233',
  border: '#2b3348',
  textPrimary: '#f2f0eb',
  textSecondary: '#8b90a6',
  accentRed: '#e63946',
  accentYellow: '#fbbf24',
  accentBlue: '#3b82f6',
  accentRedSoft: '#a33240',
  error: '#dc2626',
  success: '#22c55e',
};

const CATEGORIES = [
  { id: 'CV / Resume', placeholder: 'e.g. Get hired as a senior developer' },
  { id: 'Dating Profile', placeholder: 'e.g. Get more meaningful matches' },
  { id: 'Startup Pitch', placeholder: 'e.g. Raise a seed round from top VCs' },
  { id: 'Bio / About Me', placeholder: 'e.g. Build a memorable personal brand' },
];

const INTENSITIES = [
  { id: 'gentle', label: 'Gentle Nudge', color: COLORS.accentBlue },
  { id: 'hard', label: 'Hard Truth', color: COLORS.accentYellow },
  { id: 'full', label: 'Full Roast', color: COLORS.accentRed },
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
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [targetGoal, setTargetGoal] = useState('');
  const [intensity, setIntensity] = useState('hard');
  const [text, setText] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const [recentRoasts, setRecentRoasts] = useState([]);
  const [sharedRoast, setSharedRoast] = useState(null);

  const resultsRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentRoasts');
      if (saved) {
        setRecentRoasts(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Could not load recent roasts', e);
    }

    if (window.location.hash) {
      try {
        const hashData = window.location.hash.substring(1);
        const decoded = JSON.parse(atob(decodeURIComponent(hashData)));
        setSharedRoast(decoded);
      } catch (e) {
        console.error('Invalid share link', e);
      }
    }

    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .fade-in { animation: fadeIn 0.5s ease-out forwards; }
      .pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      * { box-sizing: border-box; }
    `;
    document.head.appendChild(style);
  }, []);

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
      const updated = [roastData, ...prev].slice(0, 3);
      localStorage.setItem('recentRoasts', JSON.stringify(updated));
      return updated;
    });
  };

  const currentCategoryObj = CATEGORIES.find(c => c.id === category);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStats(null);
    setSharedRoast(null);

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
        throw new Error(data.details || data.error || 'Something went wrong');
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
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 36);

      doc.setDrawColor(230, 57, 70); // accentRed
      doc.setLineWidth(1);
      doc.line(15, 42, 195, 42);

      let yPos = 50;
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
      yPos += 12;

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

      if (yPos > 250) { doc.addPage(); yPos = 20; }
      else { yPos += 4; }

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

      if (yPos > 250) { doc.addPage(); yPos = 20; }
      else { yPos += 6; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Your Improved Version', 15, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const splitRewrite = doc.splitTextToSize(result.rewrite, 180);
      
      splitRewrite.forEach(line => {
        if (yPos > 280) { doc.addPage(); yPos = 20; }
        doc.text(line, 15, yPos);
        yPos += 5;
      });

      doc.save(`roastd-${category.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.pdf`);
    } catch (e) {
      alert('Failed to generate PDF: ' + e.message);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!result) return;
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/docx/8.2.2/docx.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');
      
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

      const children = [
        new Paragraph({ text: "Roastd Results", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Category: ${category} | Intensity: ${intensity} | Date: ${new Date().toLocaleDateString()}` }),
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
      result.tips.forEach((t, i) => {
        children.push(new Paragraph({ text: `${i + 1}. ${t}` }));
      });
      children.push(new Paragraph({ text: "" }));

      children.push(new Paragraph({ text: "Your Improved Version", heading: HeadingLevel.HEADING_2 }));
      const rewriteLines = result.rewrite.split('\\n');
      rewriteLines.forEach(line => {
        if (line.trim()) {
           children.push(new Paragraph({ text: line }));
        } else {
           children.push(new Paragraph({ text: "" }));
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: children
        }]
      });

      const blob = await Packer.toBlob(doc);
      window.saveAs(blob, `roastd-${category.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.docx`);
    } catch (e) {
      alert('Failed to generate DOCX: ' + e.message);
    }
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
      alert('Failed to copy link. Check console.');
      console.error(e);
    });
  };

  const reset = () => {
    setResult(null);
    setStats(null);
    setError(null);
    setText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const containerStyle = {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '40px 20px',
    color: COLORS.textPrimary,
    minHeight: '100vh'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px'
  };

  const cardStyle = {
    backgroundColor: COLORS.bgCard,
    borderRadius: '12px',
    padding: '24px',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: COLORS.bgDeep,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textPrimary,
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const buttonStyle = {
    width: '100%',
    padding: '16px',
    backgroundColor: COLORS.accentYellow,
    color: COLORS.bgDeep,
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '16px',
    transition: 'transform 0.1s, opacity 0.2s',
    opacity: (!text.trim() || isLoading) ? 0.6 : 1,
    pointerEvents: (!text.trim() || isLoading) ? 'none' : 'auto'
  };

  const getBorderColorForIndex = (i) => [COLORS.accentRed, COLORS.accentYellow, COLORS.accentBlue][i % 3];

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <header style={headerStyle}>
        <h1 style={{ fontSize: '48px', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          Roastd
          <img src="/favicon.svg" alt="fire" width="36" height="36" />
        </h1>
        <p style={{ fontSize: '18px', color: COLORS.textSecondary, margin: 0 }}>Paste it. Pick your poison. Get roasted.</p>
      </header>

      {/* SHARED VIEW ALERT */}
      {sharedRoast && !result && (
        <div className="fade-in" style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.accentBlue}`, marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: COLORS.accentBlue }}>Your friend got roasted</h3>
          <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontStyle: 'italic' }}>"{sharedRoast.roast_quote}"</p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: COLORS.textSecondary }}>
            <span>Category: {sharedRoast.category}</span>
            <span>Intensity: {sharedRoast.intensity}</span>
            <span style={{ color: COLORS.accentRed }}>Heat Score: {sharedRoast.heat_score}/10</span>
          </div>
          <button 
            style={{ ...buttonStyle, backgroundColor: COLORS.bgDeep, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, marginTop: '16px', width: 'auto', padding: '8px 16px', fontSize: '14px' }}
            onClick={() => {
              setSharedRoast(null);
              window.history.replaceState(null, '', window.location.pathname);
            }}
          >
            Try it yourself
          </button>
        </div>
      )}

      {/* INPUT SECTION */}
      <section style={cardStyle}>
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>1. Document Type</label>
          <select 
            style={inputStyle} 
            value={category} 
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>2. Target Goal (Optional)</label>
          <input 
            style={inputStyle}
            type="text"
            placeholder={currentCategoryObj.placeholder}
            value={targetGoal}
            onChange={e => setTargetGoal(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>3. Roast Intensity</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {INTENSITIES.map(int => (
              <button
                key={int.id}
                onClick={() => setIntensity(int.id)}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '12px',
                  borderRadius: '24px',
                  border: `2px solid ${intensity === int.id ? int.color : 'transparent'}`,
                  backgroundColor: COLORS.bgDeep,
                  color: intensity === int.id ? int.color : COLORS.textSecondary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {int.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>4. The Victim (Paste Text)</label>
          <textarea 
            style={{ ...inputStyle, minHeight: '160px', resize: 'vertical' }}
            placeholder="Paste your text here..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        <button 
          style={buttonStyle} 
          onClick={handleSubmit} 
          className={isLoading ? 'pulse' : ''}
        >
          {isLoading ? 'Roasting...' : 'Roast Me'}
        </button>
      </section>

      {/* RECENT ROASTS (Only show if not loading and no result) */}
      {!result && !isLoading && recentRoasts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: COLORS.textSecondary, marginBottom: '16px' }}>Recent Roasts</h3>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
            {recentRoasts.map((r, idx) => (
              <div key={idx} style={{ 
                minWidth: '240px', 
                backgroundColor: COLORS.bgCard, 
                borderRadius: '8px', 
                padding: '16px', 
                borderLeft: `4px solid ${COLORS.accentRedSoft}`,
                flexShrink: 0
              }}>
                <div style={{ fontSize: '12px', color: COLORS.textSecondary, marginBottom: '8px' }}>
                  {r.category} • {r.intensity}
                </div>
                <div style={{ fontSize: '14px', fontStyle: 'italic', color: COLORS.textPrimary, marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{r.roast_quote}"
                </div>
                <div style={{ fontSize: '12px', color: COLORS.accentRed, fontWeight: 'bold' }}>
                  Heat: {r.heat_score}/10
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="fade-in" style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.error}` }}>
          <h3 style={{ margin: '0 0 8px 0', color: COLORS.error }}>Something went wrong</h3>
          <p style={{ margin: '0 0 16px 0' }}>{error}</p>
          <button 
            style={{ ...buttonStyle, backgroundColor: COLORS.bgDeep, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, marginTop: 0, padding: '12px' }}
            onClick={handleSubmit}
          >
            Try Again
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!result && !isLoading && !error && (
        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textSecondary, border: `2px dashed ${COLORS.border}`, borderRadius: '12px' }}>
          Your roast results will appear here. Go ahead, we can take it.
        </div>
      )}

      {/* RESULTS SECTION */}
      {result && (
        <section ref={resultsRef} className="fade-in" style={{ marginTop: '24px' }}>
          {/* Headline Quote */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.accentRed}`, fontSize: '24px', fontStyle: 'italic', fontWeight: 'bold' }}>
            "{result.roast_quote}"
          </div>

          {/* Heat Score */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>Heat Score</span>
              <span style={{ color: COLORS.accentRed, fontWeight: 'bold' }}>{result.heat_score}/10</span>
            </div>
            <div style={{ height: '12px', backgroundColor: COLORS.bgCard, borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(result.heat_score / 10) * 100}%`, backgroundColor: COLORS.accentRed, transition: 'width 1s ease-out' }}></div>
            </div>
          </div>

          {/* Perspectives */}
          <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>The Perspectives</h3>
          {result.multi_perspective.map((p, idx) => (
            <div key={idx} style={{ ...cardStyle, borderLeft: `4px solid ${getBorderColorForIndex(idx)}` }}>
              <h4 style={{ margin: '0 0 12px 0', color: getBorderColorForIndex(idx), fontSize: '18px' }}>{p.title}</h4>
              <p style={{ margin: 0, lineHeight: '1.6' }}>{p.content}</p>
            </div>
          ))}

          {/* Tips */}
          <h3 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px' }}>Actionable Tips</h3>
          <div style={cardStyle}>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {result.tips.map((t, idx) => (
                <li key={idx} style={{ lineHeight: '1.5' }}>
                  <span style={{ color: COLORS.accentYellow, fontWeight: 'bold', marginRight: '8px' }}>#{idx + 1}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Rewrite */}
          <h3 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px' }}>Your Improved Version</h3>
          <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.accentBlue}`, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {result.rewrite}
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '32px' }}>
            <button 
              style={{ ...buttonStyle, marginTop: 0, backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}
              onClick={handleDownloadPDF}
            >
              Download PDF
            </button>
            <button 
              style={{ ...buttonStyle, marginTop: 0, backgroundColor: COLORS.bgCard, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}` }}
              onClick={handleDownloadDOCX}
            >
              Download DOCX
            </button>
            <button 
              style={{ ...buttonStyle, marginTop: 0, backgroundColor: COLORS.bgCard, color: COLORS.accentBlue, border: `1px solid ${COLORS.accentBlue}` }}
              onClick={handleShare}
            >
              Share Roast
            </button>
            <button 
              style={{ ...buttonStyle, marginTop: 0, backgroundColor: COLORS.accentYellow, color: COLORS.bgDeep }}
              onClick={reset}
            >
              Roast Again
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <button 
                onClick={() => setShowStats(!showStats)}
                style={{ background: 'none', border: 'none', color: COLORS.textSecondary, textDecoration: 'underline', cursor: 'pointer', fontSize: '14px' }}
              >
                {showStats ? 'Hide API Stats' : 'Show API Stats'}
              </button>
              
              {showStats && (
                <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '12px', color: COLORS.textSecondary }}>
                  <div>Tokens: <span style={{ color: COLORS.textPrimary }}>{stats.tokens}</span></div>
                  <div>Latency: <span style={{ color: COLORS.textPrimary }}>{stats.latency}ms</span></div>
                  <div>Retries: <span style={{ color: COLORS.textPrimary }}>{stats.retries}</span></div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

