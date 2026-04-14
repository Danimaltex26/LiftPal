import { useState } from 'react';
import { apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

var QUICK_RANGES = [
  { param: 'Rope Safety Factor', ideal: '8:1 minimum (ASME A17.1)', note: 'Higher for high-rise' },
  { param: 'Door Close Time', ideal: '3 sec minimum (ADA)', note: 'A17.1 Rule 112.5' },
  { param: 'Door Reopen Time', ideal: '20 sec minimum (ADA)', note: 'Nudging after 20s' },
  { param: 'Leveling Accuracy', ideal: '+/- 1/4 inch', note: 'ADA requirement' },
  { param: 'Governor Trip Speed', ideal: '115% rated speed', note: 'A17.1 Rule 200.7' },
  { param: 'Pit Depth', ideal: 'Per A17.1 Table 2.2.2.5', note: 'Speed-dependent' },
  { param: 'Overhead Clearance', ideal: 'Per A17.1 Rule 2.4.3', note: 'Min refuge space' },
  { param: 'Hydraulic Oil Temp', ideal: '60-100°F operating', note: 'Max 150°F' },
];

export default function ReferencePage() {
  var [tab, setTab] = useState('search');
  var [query, setQuery] = useState('');
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [model, setModel] = useState('');
  var [source, setSource] = useState('');
  var [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim()) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      var data = await apiPost('/reference/query', { query: query.trim() });
      setResult(data.result);
      setModel(data.model || '');
      setSource(data.source);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page stack">
      <h1>Reference</h1>

      <div className="toggle-group">
        <button className={'toggle-option' + (tab === 'search' ? ' active' : '')} onClick={function () { setTab('search'); }}>AI Search</button>
        <button className={'toggle-option' + (tab === 'ranges' ? ' active' : '')} onClick={function () { setTab('ranges'); }}>Quick Specs</button>
      </div>

      {tab === 'ranges' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2A2A2E' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>Parameter</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Requirement</th>
                <th style={{ padding: 6, textAlign: 'left' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {QUICK_RANGES.map(function (r, i) {
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1A1A1E' }}>
                    <td style={{ padding: 6, fontWeight: 500 }}>{r.param}</td>
                    <td style={{ padding: 6, color: '#A855F7' }}>{r.ideal}</td>
                    <td style={{ padding: 6, color: '#aaa' }}>{r.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'search' && (
        <div className="stack">
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label>Ask about elevator codes, specs, or procedures</label>
            <textarea className="textarea" placeholder="e.g. ASME A17.1 door interlock requirements, governor rope inspection criteria, hydraulic jack testing..." value={query} onChange={function (e) { setQuery(e.target.value); }} />
          </div>

          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>

          {loading && <LoadingSpinner message="Looking up reference..." />}

          {result && (
            <div className="card stack-sm">
              <div className="row-between">
                <h3>{result.title || result.fiber_name || query}</h3>
                <span className="badge badge-purple">{source}</span>
              </div>
              {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginTop: '0.25rem' }}>{model}</div>}

              {result.content && result.content.summary && (
                <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{result.content.summary}</p>
              )}

              {result.content && result.content.key_values && result.content.key_values.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {result.content.key_values.map(function (kv, i) {
                    return (
                      <div key={i} style={{ padding: '0.5rem', background: '#1A1A1E', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.75rem', color: '#6B6B73' }}>{kv.label}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#A855F7' }}>{kv.value}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {result.content && result.content.important_notes && result.content.important_notes.length > 0 && (
                <div className="warning-box">
                  {result.content.important_notes.map(function (n, i) { return <p key={i} style={{ fontSize: '0.8125rem' }}>{n}</p>; })}
                </div>
              )}

              {result.content_json && !result.content && (
                <pre style={{ fontSize: '0.75rem', color: '#A0A0A8', whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.content_json, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
