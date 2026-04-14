import { useState } from 'react';
import { apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

var EQUIPMENT_TYPES = ['Traction Elevator', 'Hydraulic Elevator', 'MRL (Machine Room-Less)', 'Escalator', 'Moving Walk', 'Dumbwaiter', 'Freight Elevator', 'Residential Elevator'];

var MANUFACTURERS = [
  'Otis', 'Schindler', 'ThyssenKrupp', 'Kone', 'Mitsubishi Electric',
  'Fujitec', 'Hitachi', 'Hyundai Elevator', 'Toshiba', 'Dover',
  'GAL', 'Virginia Controls', 'MCE', 'Hollister-Whitney', 'Imperial Electric',
  'Other',
];

var COMPONENTS = [
  'Controller', 'Door Operator', 'Door Interlocks', 'Motor/Drive',
  'Governor', 'Safety Device', 'Guide Rails', 'Guide Shoes/Rollers',
  'Car Frame', 'Counterweight', 'Ropes/Belts', 'Sheave',
  'Brake', 'Buffers', 'Pit Equipment', 'Hoistway Wiring',
  'Hydraulic Jack', 'Hydraulic Valve Block', 'Hydraulic Pump',
  'Escalator Step Chain', 'Escalator Handrail', 'Comb Plate',
  'Other',
];

var ENVIRONMENTS = ['Commercial high-rise', 'Commercial low-rise', 'Residential', 'Hospital/medical', 'Industrial/freight', 'Parking garage', 'Outdoor/exposed', 'Seismic zone'];

var LOADING_MESSAGES = [
  'Analyzing symptoms...',
  'Building diagnostic tree...',
  'Checking common failure modes...',
  'Cross-referencing fault codes...',
  'Preparing fix steps...',
];

export default function TroubleshootPage() {
  var [equipmentType, setEquipmentType] = useState('');
  var [manufacturer, setManufacturer] = useState('');
  var [component, setComponent] = useState('');
  var [symptom, setSymptom] = useState('');
  var [environment, setEnvironment] = useState('');
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [model, setModel] = useState('');
  var [sessionId, setSessionId] = useState(null);
  var [followUp, setFollowUp] = useState('');
  var [error, setError] = useState('');

  async function handleSubmit() {
    if (!symptom.trim()) { setError('Describe the symptoms'); return; }
    setError('');
    setLoading(true);
    try {
      var data = await apiPost('/troubleshoot', {
        equipment_type: equipmentType,
        manufacturer_model: manufacturer,
        component: component,
        symptom: symptom,
        environment: environment,
      });
      setResult(data.result);
      setModel(data.model || '');
      setSessionId(data.session_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowUp() {
    if (!followUp.trim()) return;
    setLoading(true);
    try {
      var data = await apiPost('/troubleshoot', { session_id: sessionId, follow_up: followUp });
      setResult(data.result);
      setModel(data.model || '');
      setFollowUp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() { setResult(null); setModel(''); setSessionId(null); setSymptom(''); setFollowUp(''); setError(''); }

  if (loading) return <LoadingSpinner messages={LOADING_MESSAGES} />;

  if (result) {
    return (
      <div className="page stack">
        <h1>Diagnosis</h1>
        {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginTop: '0.25rem' }}>{model}</div>}
        <div className="card"><p>{result.plain_english_summary}</p></div>

        {result.probable_causes && result.probable_causes.length > 0 && (
          <div className="stack-sm">
            <h3>Probable Causes</h3>
            {result.probable_causes.map(function (c, i) {
              return (
                <div key={i} className="card">
                  <div className="row" style={{ gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: '#A855F7', minWidth: 24 }}>{'#' + (c.rank || i + 1)}</span>
                    <strong>{c.cause}</strong>
                  </div>
                  <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{c.explanation}</p>
                  <span className={'badge ' + (c.likelihood === 'high' ? 'badge-red' : c.likelihood === 'medium' ? 'badge-amber' : 'badge-gray')} style={{ marginTop: '0.5rem' }}>{c.likelihood}</span>
                </div>
              );
            })}
          </div>
        )}

        {result.step_by_step_fix && result.step_by_step_fix.length > 0 && (
          <div className="stack-sm">
            <h3>Step-by-Step Fix</h3>
            {result.step_by_step_fix.map(function (s, i) {
              return (
                <div key={i} className="card">
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#A855F7', minWidth: 24 }}>{s.step || i + 1}</span>
                    <span>{s.action}</span>
                  </div>
                  {s.tip && <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem', marginLeft: 32 }}>{s.tip}</p>}
                </div>
              );
            })}
          </div>
        )}

        {result.parts_to_check && result.parts_to_check.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Parts to Check</h3>
            {result.parts_to_check.map(function (p, i) {
              return <p key={i} className="text-secondary" style={{ fontSize: '0.875rem' }}><strong>{p.part}:</strong> {p.symptom_to_look_for}</p>;
            })}
          </div>
        )}

        {result.escalate_if && <div className="warning-box"><strong>Escalate if:</strong> {result.escalate_if}</div>}

        <div className="row-between text-muted" style={{ fontSize: '0.8125rem' }}>
          {result.estimated_fix_time && <span>Est. fix: {result.estimated_fix_time}</span>}
        </div>

        <div className="stack-sm">
          <h3>Follow-up Question</h3>
          <textarea className="textarea" placeholder="Ask a follow-up..." value={followUp} onChange={function (e) { setFollowUp(e.target.value); }} />
          <button className="btn btn-primary" onClick={handleFollowUp} disabled={loading}>Ask</button>
        </div>

        <button className="btn btn-secondary btn-block" onClick={handleReset}>Start Over</button>
      </div>
    );
  }

  return (
    <div className="page stack">
      <h1>Troubleshoot</h1>
      <p className="text-secondary">Describe the problem and get an AI-powered diagnosis.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label>Equipment Type</label>
        <select className="select" value={equipmentType} onChange={function (e) { setEquipmentType(e.target.value); }}>
          <option value="">Select...</option>
          {EQUIPMENT_TYPES.map(function (t) { return <option key={t} value={t}>{t}</option>; })}
        </select>
      </div>

      <div className="form-group">
        <label>Manufacturer</label>
        <select className="select" value={manufacturer} onChange={function (e) { setManufacturer(e.target.value); }}>
          <option value="">Select...</option>
          {MANUFACTURERS.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
        </select>
      </div>

      <div className="form-group">
        <label>Component</label>
        <select className="select" value={component} onChange={function (e) { setComponent(e.target.value); }}>
          <option value="">Select...</option>
          {COMPONENTS.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
        </select>
      </div>

      <div className="form-group">
        <label>Symptoms *</label>
        <textarea className="textarea" placeholder="Describe what's happening — error codes, noises, behavior..." value={symptom} onChange={function (e) { setSymptom(e.target.value); }} />
      </div>

      <div className="form-group">
        <label>Environment</label>
        <select className="select" value={environment} onChange={function (e) { setEnvironment(e.target.value); }}>
          <option value="">Select...</option>
          {ENVIRONMENTS.map(function (env) { return <option key={env} value={env}>{env}</option>; })}
        </select>
      </div>

      <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={loading}>
        Diagnose
      </button>
    </div>
  );
}
