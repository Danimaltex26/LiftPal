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
  var [followUpLoading, setFollowUpLoading] = useState(false);
  var [followUps, setFollowUps] = useState([]);
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
      setFollowUps([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowUp(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!followUp.trim() || !sessionId) return;
    var question = followUp;
    setFollowUpLoading(true);
    setError('');
    try {
      var data = await apiPost('/troubleshoot', { session_id: sessionId, follow_up: question });
      setResult(data.result);
      setModel(data.model || '');
      setFollowUps(function (prev) { return prev.concat([{ question: question, at: Date.now() }]); });
      setFollowUp('');
    } catch (err) {
      setError(err.message);
    } finally {
      setFollowUpLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setModel('');
    setSessionId(null);
    setSymptom('');
    setFollowUp('');
    setFollowUps([]);
    setError('');
  }

  if (loading) return <LoadingSpinner messages={LOADING_MESSAGES} />;

  if (result) {
    var oos = result.take_out_of_service === true;
    return (
      <div className="page stack">
        <h1>Diagnosis</h1>
        {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginTop: '0.25rem' }}>{model}</div>}

        {/* Take Out Of Service — top critical banner */}
        {oos && (
          <div className="card" style={{ background: 'rgba(239,68,68,0.12)', borderLeft: '4px solid #EF4444' }}>
            <h3 style={{ marginBottom: '0.375rem', color: '#EF4444' }}>⚠ Take out of service</h3>
            {result.take_out_of_service_reasoning && (
              <p style={{ fontSize: '0.9375rem' }}>{result.take_out_of_service_reasoning}</p>
            )}
          </div>
        )}

        {/* Safety callout */}
        {result.safety_callout && (
          <div className="warning-box">
            <strong>Safety: </strong>{result.safety_callout}
          </div>
        )}

        {/* Required LOTO & PPE — always populated, purple accent */}
        {result.required_loto_and_ppe && (
          <div className="card" style={{ borderLeft: '4px solid #A855F7' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#A855F7' }}>LOTO & PPE</h3>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{result.required_loto_and_ppe}</p>
          </div>
        )}

        {/* Plain English Summary */}
        {result.plain_english_summary && (
          <div className="card">
            <p style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>{result.plain_english_summary}</p>
          </div>
        )}

        {/* Probable Causes */}
        {result.probable_causes && result.probable_causes.length > 0 && (
          <div className="stack">
            <h3>Probable Causes</h3>
            {result.probable_causes.map(function (c, i) {
              var rank = c.rank != null ? c.rank : i + 1;
              var fixSteps = c.fix_path || c.fix_steps || [];
              var parts = c.parts_to_check || [];
              var faultCodes = c.fault_codes_to_check || [];
              var meas = c.measurement_expectations || {};
              var hasMeas = meas && Object.values(meas).some(Boolean);
              return (
                <div key={i} className="card">
                  <div className="row" style={{ marginBottom: '0.5rem', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{
                        minWidth: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#A855F7',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                      }}>
                        {rank}
                      </div>
                      <strong style={{ lineHeight: 1.3 }}>{c.cause}</strong>
                    </div>
                    <div className="row" style={{ gap: '0.375rem', alignItems: 'center' }}>
                      {c.witness_test_required === true && (
                        <span className="badge badge-amber" style={{ fontSize: '0.6875rem' }}>Witness test</span>
                      )}
                      {c.likelihood && (
                        <span className={'badge ' + (c.likelihood === 'high' ? 'badge-red' : c.likelihood === 'medium' ? 'badge-amber' : 'badge-gray')}>
                          {c.likelihood}
                        </span>
                      )}
                    </div>
                  </div>

                  {c.explanation && (
                    <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                      {c.explanation}
                    </p>
                  )}

                  {c.asme_reference && (
                    <p style={{ fontSize: '0.8125rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(168,85,247,0.1)', borderLeft: '3px solid #A855F7', borderRadius: 4 }}>
                      <strong>ASME ref: </strong>{c.asme_reference}
                    </p>
                  )}

                  {faultCodes.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                        Fault codes to check
                      </p>
                      <div className="row" style={{ gap: '0.375rem', flexWrap: 'wrap' }}>
                        {faultCodes.map(function (code, ci) {
                          return (
                            <span key={ci} style={{ fontSize: '0.8125rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: 4, fontFamily: 'monospace' }}>
                              {code}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {hasMeas && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                        Measurement Expectations
                      </p>
                      <div style={{ fontSize: '0.875rem' }}>
                        {Object.entries(meas).map(function (entry) {
                          var k = entry[0];
                          var v = entry[1];
                          return v ? (
                            <p key={k} style={{ marginBottom: '0.25rem' }}>
                              <strong style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</strong> {v}
                            </p>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {parts.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                        Parts to Check
                      </p>
                      <div className="stack-sm">
                        {parts.map(function (p, pi) {
                          return (
                            <div key={pi} style={{ padding: '0.5rem 0.625rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                              <div className="row-between" style={{ marginBottom: '0.25rem', alignItems: 'flex-start' }}>
                                <strong style={{ fontSize: '0.9375rem' }}>{p.part}</strong>
                                {p.estimated_cost && <span className="text-secondary" style={{ fontSize: '0.8125rem', flexShrink: 0, marginLeft: '0.5rem' }}>{p.estimated_cost}</span>}
                              </div>
                              {(p.symptom_if_failed || p.symptom_to_look_for) && (
                                <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>
                                  <em>If failed:</em> {p.symptom_if_failed || p.symptom_to_look_for}
                                </p>
                              )}
                              {p.test_method && (
                                <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                                  <em>Test:</em> {p.test_method}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {fixSteps.length > 0 && (
                    <div style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #2A2A2E' }}>
                      <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                        Fix Path
                      </p>
                      <div className="stack-sm">
                        {fixSteps.map(function (step, si) {
                          return (
                            <div key={si} className="row" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 600, color: '#A855F7', minWidth: 18, fontSize: '0.875rem' }}>
                                {(step.step != null ? step.step : si + 1) + '.'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.9375rem' }}>{step.action || step.instruction || step}</p>
                                {step.tip && (
                                  <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                    Tip: {step.tip}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* AHJ notification */}
        {result.ahj_notification_required === true && (
          <div className="warning-box">
            <strong>AHJ notification may be required.</strong> Verify local code for this condition before returning to service.
          </div>
        )}

        {/* Permit / inspection */}
        {result.permit_or_inspection_required && (
          <div className="card" style={{ borderLeft: '4px solid #F59E0B' }}>
            <strong style={{ color: '#F59E0B' }}>Permit / inspection: </strong>
            <span>{result.permit_or_inspection_required}</span>
          </div>
        )}

        {/* Top-level code reference */}
        {result.code_reference && (
          <div className="card">
            <p style={{ fontSize: '0.9375rem' }}>
              <span className="text-secondary">Code reference: </span>
              <strong>{result.code_reference}</strong>
            </p>
          </div>
        )}

        {/* Escalate */}
        {result.escalate_if && (
          <div className="warning-box">
            <strong>Escalate if: </strong>{result.escalate_if}
          </div>
        )}

        {/* Estimated fix time */}
        {result.estimated_fix_time && (
          <div className="card">
            <div className="row-between">
              <span className="text-secondary">Estimated fix time</span>
              <strong>{result.estimated_fix_time}</strong>
            </div>
          </div>
        )}

        {/* Confidence */}
        {result.confidence && (
          <div className="card">
            <div className="row-between" style={{ alignItems: 'center' }}>
              <span className="text-secondary">Confidence</span>
              <span className={'badge ' + (result.confidence === 'high' ? 'badge-green' : result.confidence === 'medium' ? 'badge-amber' : 'badge-red')}>
                {result.confidence}
              </span>
            </div>
            {result.confidence_reasoning && (
              <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {result.confidence_reasoning}
              </p>
            )}
          </div>
        )}

        {/* Prior follow-up questions */}
        {followUps.length > 0 && (
          <div className="stack-sm">
            {followUps.map(function (fu, i) {
              return (
                <div key={i} className="card" style={{ background: 'rgba(168,85,247,0.06)' }}>
                  <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                    Follow-up #{i + 1}
                  </p>
                  <p style={{ fontSize: '0.9375rem' }}>{fu.question}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Ask a follow-up */}
        {sessionId && (
          <form onSubmit={handleFollowUp} className="stack-sm">
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Ask a follow-up</label>
            <textarea
              className="textarea"
              placeholder="e.g. Checked door operator — still faulting, what next?"
              value={followUp}
              onChange={function (e) { setFollowUp(e.target.value); }}
              rows={2}
            />
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={followUpLoading || !followUp.trim()}
            >
              {followUpLoading ? 'Asking...' : 'Ask'}
            </button>
          </form>
        )}

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
