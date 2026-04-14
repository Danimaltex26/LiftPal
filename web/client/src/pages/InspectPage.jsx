import { useState } from 'react';
import { apiUpload } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

var COMPONENT_TYPES = ['Auto-detect', 'Controller', 'Door Operator', 'Motor/Drive', 'Governor', 'Safety Device', 'Guide Rails', 'Car Top', 'Pit', 'Hoistway', 'Ropes/Belts', 'Escalator'];

var LOADING_MESSAGES = [
  'Analyzing elevator equipment...',
  'Checking for code violations...',
  'Inspecting component condition...',
  'Evaluating safety systems...',
  'Cross-referencing ASME A17.1...',
  'Generating diagnosis...',
];

var SEVERITY_COLORS = { critical: 'badge-red', major: 'badge-amber', minor: 'badge-blue', observation: 'badge-gray' };

export default function InspectPage() {
  var [files, setFiles] = useState([]);
  var [analysisType, setAnalysisType] = useState('Auto-detect');
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [model, setModel] = useState('');
  var [error, setError] = useState('');

  function handleFiles(e) {
    var selected = Array.from(e.target.files || []).slice(0, 4);
    setFiles(selected);
  }

  async function handleSubmit() {
    if (files.length === 0) { setError('Select at least one photo'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      var formData = new FormData();
      files.forEach(function (f) { formData.append('images', f); });
      if (analysisType !== 'Auto-detect') formData.append('analysis_type', analysisType.toLowerCase().replace(/[\s/]/g, '_'));
      var data = await apiUpload('/analysis', formData);
      setResult(data.result);
      setModel(data.model || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() { setFiles([]); setResult(null); setModel(''); setError(''); setAnalysisType('Auto-detect'); }

  if (loading) return <LoadingSpinner messages={LOADING_MESSAGES} />;

  if (result) {
    return (
      <div className="page stack">
        <div className="row-between">
          <h1 style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>Inspection Result {model && <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#6B6B73' }}>{model}</span>}</h1>
          <span className={'badge ' + (SEVERITY_COLORS[result.severity] || 'badge-gray')}>{result.severity}</span>
        </div>
        <div className="card"><p>{result.plain_english_summary || result.overall_diagnosis}</p></div>

        {result.findings && result.findings.length > 0 && (
          <div className="stack-sm">
            <h3>Findings</h3>
            {result.findings.map(function (f, i) {
              return (
                <div key={i} className="card">
                  <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                    <strong>{f.issue}</strong>
                    <span className={'badge ' + (SEVERITY_COLORS[f.severity] || 'badge-gray')}>{f.severity}</span>
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{f.description}</p>
                  {f.probable_cause && <p style={{ fontSize: '0.8125rem', color: '#6B6B73' }}>Cause: {f.probable_cause}</p>}
                  {f.action && <p style={{ fontSize: '0.8125rem', color: '#A855F7', marginTop: '0.25rem' }}>Action: {f.action}</p>}
                </div>
              );
            })}
          </div>
        )}

        {result.recommended_action && (
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Recommended Action</h3>
            <p className="text-secondary">{result.recommended_action}</p>
          </div>
        )}

        {result.code_references && result.code_references.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Code References</h3>
            {result.code_references.map(function (ref, i) { return <p key={i} className="text-secondary" style={{ fontSize: '0.875rem' }}>{ref}</p>; })}
          </div>
        )}

        <div className="row-between" style={{ fontSize: '0.8125rem', color: '#6B6B73' }}>
          <span>Confidence: {result.confidence}</span>
          <span>Urgency: {result.urgency}</span>
        </div>

        <button className="btn btn-secondary btn-block" onClick={handleReset}>Start Over</button>
      </div>
    );
  }

  return (
    <div className="page stack">
      <h1>Equipment Inspection</h1>
      <p className="text-secondary">Upload 1-4 photos of elevator or lift equipment for AI-powered diagnosis.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label>Component Type</label>
        <select className="select" value={analysisType} onChange={function (e) { setAnalysisType(e.target.value); }}>
          {COMPONENT_TYPES.map(function (t) { return <option key={t} value={t}>{t}</option>; })}
        </select>
      </div>

      <div
        className="card"
        style={{ border: '2px dashed #2A2A2E', textAlign: 'center', padding: '2rem 1rem', cursor: 'pointer' }}
        onClick={function () { document.getElementById('file-input').click(); }}
        onDragOver={function (e) { e.preventDefault(); e.currentTarget.style.borderColor = '#A855F7'; }}
        onDragLeave={function (e) { e.currentTarget.style.borderColor = '#2A2A2E'; }}
        onDrop={function (e) { e.preventDefault(); e.currentTarget.style.borderColor = '#2A2A2E'; var dt = e.dataTransfer; if (dt.files) setFiles(Array.from(dt.files).slice(0, 4)); }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.75rem' }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="text-secondary">{files.length > 0 ? files.length + ' photo(s) selected' : 'Tap to select or drag photos here'}</p>
        <p className="text-muted" style={{ fontSize: '0.75rem' }}>Up to 4 images</p>
        <input id="file-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
      </div>

      <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={files.length === 0}>
        Analyze Photos
      </button>
    </div>
  );
}
