import { useState } from 'react';
import { apiUpload } from '../utils/api';
import { compressImage } from '../utils/compressImage';
import LoadingSpinner from '../components/LoadingSpinner';
import OfflineQueue from '../components/OfflineQueue';
import useOfflineQueue from '../hooks/useOfflineQueue';

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

function actionBadgeClass(action) {
  if (!action) return 'badge badge-gray';
  var lower = String(action).toLowerCase();
  if (lower.includes('return_to_service') || lower.includes('return to service') || lower.includes('pass') || lower.includes('good') || lower.includes('routine') || lower.includes('informational') || lower.includes('minor')) return 'badge badge-green';
  if (lower.includes('monitoring') || lower.includes('maintenance') || lower.includes('moderate') || lower.includes('this_week') || lower.includes('next_inspection') || lower.includes('today') || lower.includes('before_return') || lower.includes('safety_concern') || lower.includes('serious')) return 'badge badge-amber';
  if (lower.includes('take_out') || lower.includes('emergency') || lower.includes('critical') || lower.includes('immediate') || lower.includes('code_violation') || lower.includes('fail')) return 'badge badge-red';
  return 'badge badge-gray';
}

function confidenceBadgeClass(confidence) {
  if (!confidence) return 'badge badge-gray';
  var lower = String(confidence).toLowerCase();
  if (lower.includes('high')) return 'badge badge-green';
  if (lower.includes('medium')) return 'badge badge-amber';
  return 'badge badge-red';
}

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/_/g, ' ');
}

export default function InspectPage() {
  var [files, setFiles] = useState([]);
  var [analysisType, setAnalysisType] = useState('Auto-detect');
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [model, setModel] = useState('');
  var [error, setError] = useState('');
  var [queued, setQueued] = useState(false);
  var offlineQueue = useOfflineQueue();

  function handleFiles(e) {
    var selected = Array.from(e.target.files || []).slice(0, 4);
    setFiles(selected);
  }

  async function handleSubmit() {
    if (files.length === 0) { setError('Select at least one photo'); return; }
    setError('');
    setResult(null);
    setQueued(false);

    var typeValue = analysisType !== 'Auto-detect' ? analysisType.toLowerCase().replace(/[\s/]/g, '_') : '';

    // If offline, queue it
    if (!navigator.onLine) {
      await offlineQueue.enqueue(files, typeValue);
      setQueued(true);
      setFiles([]);
      return;
    }

    // Online — upload directly
    setLoading(true);
    try {
      var formData = new FormData();
      for (var i = 0; i < files.length; i++) {
        var compressed = await compressImage(files[i]);
        formData.append('images', compressed);
      }
      if (typeValue) formData.append('analysis_type', typeValue);
      var data = await apiUpload('/analysis', formData);
      setResult(data.result);
      setModel(data.model || '');
    } catch (err) {
      // If upload fails (network dropped mid-request), queue it
      if (!navigator.onLine || err.message?.includes('fetch') || err.message?.includes('network')) {
        await offlineQueue.enqueue(files, typeValue);
        setQueued(true);
        setFiles([]);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() { setFiles([]); setResult(null); setModel(''); setError(''); setQueued(false); setAnalysisType('Auto-detect'); }

  function handleViewQueueResult(item) {
    if (item.result) {
      setResult(item.result);
      offlineQueue.dismiss(item.id);
    }
  }

  if (loading) return <LoadingSpinner messages={LOADING_MESSAGES} />;

  if (result) {
    var imageUsable = result.is_elevator_image !== false && result.image_quality?.usable !== false;
    var ctx = result.equipment_context;
    var machine = result.machine_room_analysis;
    var controller = result.controller_analysis;
    var hoistway = result.hoistway_analysis;
    var doorSys = result.door_system_analysis;
    var carInt = result.car_interior_analysis;
    var safety = result.safety_devices_analysis;
    var hydraulic = result.hydraulic_system_analysis;
    var escalator = result.escalator_analysis;
    var faultDisplay = result.fault_display_analysis;

    return (
      <div className="page stack">
        <div className="page-header">
          <h1>Inspection Result</h1>
          {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginTop: '0.25rem' }}>{model}</div>}
        </div>

        {/* Unusable image warning */}
        {!imageUsable && (
          <div className="warning-box">
            <strong>Image could not be analyzed.</strong>
            {result.image_quality?.quality_note && (
              <p style={{ marginTop: '0.25rem' }}>{result.image_quality.quality_note}</p>
            )}
          </div>
        )}

        {/* Overall Assessment Badge */}
        {imageUsable && result.overall_assessment && (
          <div className="card" style={{ textAlign: 'center' }}>
            <span className={actionBadgeClass(result.overall_assessment)} style={{ fontSize: '1.25rem', padding: '0.5rem 1.5rem' }}>
              {humanize(result.overall_assessment).toUpperCase()}
            </span>
          </div>
        )}

        {/* Assessment Reasoning */}
        {result.assessment_reasoning && (
          <div className="card">
            <p style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>{result.assessment_reasoning}</p>
          </div>
        )}

        {/* Detected Equipment Context */}
        {ctx && (ctx.equipment_type || ctx.manufacturer_detected || ctx.installation_type || ctx.approximate_vintage) && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Detected</h3>
            <div className="stack-sm">
              {ctx.equipment_type && ctx.equipment_type !== 'unknown' && (
                <div className="row-between">
                  <span className="text-secondary">Equipment Type</span>
                  <span className="badge badge-blue">{humanize(ctx.equipment_type)}</span>
                </div>
              )}
              {ctx.manufacturer_detected && ctx.manufacturer_detected !== 'Unknown' && ctx.manufacturer_detected !== 'Other' && (
                <div className="row-between">
                  <span className="text-secondary">Manufacturer</span>
                  <span style={{ fontWeight: 600 }}>{ctx.manufacturer_detected}</span>
                </div>
              )}
              {ctx.installation_type && ctx.installation_type !== 'unknown' && (
                <div className="row-between">
                  <span className="text-secondary">Installation</span>
                  <span>{humanize(ctx.installation_type)}</span>
                </div>
              )}
              {ctx.approximate_vintage && (
                <div className="row-between">
                  <span className="text-secondary">Vintage</span>
                  <span>{ctx.approximate_vintage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Immediate Safety Hazards */}
        {result.immediate_safety_hazards && result.immediate_safety_hazards.length > 0 && (
          <div className="card" style={{ borderLeft: '3px solid #A855F7' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Immediate Safety Hazards</h3>
            <div className="stack-sm">
              {result.immediate_safety_hazards.map(function (h, i) {
                return (
                  <div key={i} className="warning-box">
                    <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                      <strong>{humanize(h.hazard_type)}</strong>
                      {h.severity && <span className={actionBadgeClass(h.severity)}>{h.severity}</span>}
                    </div>
                    {h.description && <p style={{ marginTop: '0.25rem' }}>{h.description}</p>}
                    {h.immediate_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Action:</span> {h.immediate_action}</p>}
                    {h.asme_reference && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{h.asme_reference}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Machine Room Analysis */}
        {machine?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Machine Room</h3>
            <div className="stack-sm">
              {machine.machine_type && machine.machine_type !== 'unknown' && (
                <div className="row-between">
                  <span className="text-secondary">Machine Type</span>
                  <span style={{ fontWeight: 600 }}>{humanize(machine.machine_type)}</span>
                </div>
              )}
              {machine.brake_condition_visible && (
                <div className="row-between">
                  <span className="text-secondary">Brake Condition</span>
                  <span>{machine.brake_condition_visible}</span>
                </div>
              )}
              {machine.rope_condition_visible && (
                <div className="row-between">
                  <span className="text-secondary">Rope Condition</span>
                  <span>{machine.rope_condition_visible}</span>
                </div>
              )}
              {machine.working_clearances_adequate != null && (
                <div className="row-between">
                  <span className="text-secondary">Working Clearances</span>
                  <span>{machine.working_clearances_adequate ? 'Adequate' : 'Inadequate'}</span>
                </div>
              )}
            </div>
            {machine.issues_found && machine.issues_found.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Issues</h4>
                <div className="stack-sm">
                  {machine.issues_found.map(function (it, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{it.component} — {humanize(it.issue_type)}</strong>
                          {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                        </div>
                        {it.description && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{it.description}</p>}
                        {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                        {it.asme_reference && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{it.asme_reference}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controller Analysis */}
        {controller?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Controller</h3>
            <div className="stack-sm">
              {controller.controller_type && controller.controller_type !== 'unknown' && (
                <div className="row-between">
                  <span className="text-secondary">Controller Type</span>
                  <span style={{ fontWeight: 600 }}>{humanize(controller.controller_type)}</span>
                </div>
              )}
              {controller.manufacturer_controller && (
                <div className="row-between">
                  <span className="text-secondary">Manufacturer</span>
                  <span>{controller.manufacturer_controller}</span>
                </div>
              )}
              {controller.safety_circuit_indicators && (
                <div className="row-between">
                  <span className="text-secondary">Safety Circuit</span>
                  <span>{controller.safety_circuit_indicators}</span>
                </div>
              )}
              {controller.fault_codes_visible && controller.fault_codes_visible.length > 0 && (
                <div>
                  <span className="text-secondary">Fault Codes: </span>
                  <span style={{ fontWeight: 600 }}>{controller.fault_codes_visible.join(', ')}</span>
                </div>
              )}
            </div>
            {controller.fault_interpretations && controller.fault_interpretations.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Fault Interpretations</h4>
                <div className="stack-sm">
                  {controller.fault_interpretations.map(function (f, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div style={{ marginBottom: '0.25rem' }}><strong>{f.fault_code}</strong> — {f.meaning}</div>
                        {f.probable_causes && f.probable_causes.length > 0 && (
                          <p style={{ fontSize: '0.875rem' }}><span className="text-secondary">Causes:</span> {f.probable_causes.join(', ')}</p>
                        )}
                        {f.reset_procedure && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Reset:</span> {f.reset_procedure}</p>}
                        {f.requires_physical_inspection && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Requires physical inspection</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {controller.issues_found && controller.issues_found.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Issues</h4>
                <div className="stack-sm">
                  {controller.issues_found.map(function (it, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{humanize(it.issue_type)}</strong>
                          {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                        </div>
                        {it.description && <p style={{ fontSize: '0.875rem' }}>{it.description}</p>}
                        {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hoistway Analysis */}
        {hoistway?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Hoistway</h3>
            <div className="stack-sm">
              {hoistway.pit_condition && (
                <div className="row-between">
                  <span className="text-secondary">Pit Condition</span>
                  <span>{humanize(hoistway.pit_condition)}</span>
                </div>
              )}
              {hoistway.pit_lighting_adequate != null && (
                <div className="row-between">
                  <span className="text-secondary">Pit Lighting</span>
                  <span>{hoistway.pit_lighting_adequate ? 'Adequate' : 'Inadequate'}</span>
                </div>
              )}
              {hoistway.pit_stop_accessible != null && (
                <div className="row-between">
                  <span className="text-secondary">Pit Stop Accessible</span>
                  <span>{hoistway.pit_stop_accessible ? 'Yes' : 'No'}</span>
                </div>
              )}
            </div>
            {hoistway.issues_found && hoistway.issues_found.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Issues</h4>
                <div className="stack-sm">
                  {hoistway.issues_found.map(function (it, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{humanize(it.component)} — {humanize(it.issue_type)}</strong>
                          {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                        </div>
                        {it.location && <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>Location: {it.location}</p>}
                        {it.description && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{it.description}</p>}
                        {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                        {it.asme_reference && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{it.asme_reference}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Door System Analysis */}
        {doorSys?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Door System</h3>
            <div className="stack-sm">
              {doorSys.door_type && doorSys.door_type !== 'unknown' && (
                <div className="row-between">
                  <span className="text-secondary">Door Type</span>
                  <span style={{ fontWeight: 600 }}>{humanize(doorSys.door_type)}</span>
                </div>
              )}
              {doorSys.sill_gap_visible && (
                <div className="row-between">
                  <span className="text-secondary">Sill Gap</span>
                  <span>{doorSys.sill_gap_visible}</span>
                </div>
              )}
              {doorSys.door_restrictor_present != null && (
                <div className="row-between">
                  <span className="text-secondary">Door Restrictor</span>
                  <span>{doorSys.door_restrictor_present ? 'Present' : 'Missing'}</span>
                </div>
              )}
              {doorSys.reopening_device_visible != null && (
                <div className="row-between">
                  <span className="text-secondary">Reopening Device</span>
                  <span>{doorSys.reopening_device_visible ? 'Visible' : 'Not Visible'}</span>
                </div>
              )}
            </div>
            {doorSys.issues_found && doorSys.issues_found.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Issues</h4>
                <div className="stack-sm">
                  {doorSys.issues_found.map(function (it, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{humanize(it.component)} — {humanize(it.issue_type)}</strong>
                          {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                        </div>
                        {it.description && <p style={{ fontSize: '0.875rem' }}>{it.description}</p>}
                        {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                        {it.asme_reference && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{it.asme_reference}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Car Interior Analysis */}
        {carInt?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Car Interior</h3>
            <div className="stack-sm">
              {carInt.certificate_visible != null && (
                <div className="row-between">
                  <span className="text-secondary">Certificate Visible</span>
                  <span>{carInt.certificate_visible ? 'Yes' : 'No'}</span>
                </div>
              )}
              {carInt.certificate_expiry_visible && (
                <div className="row-between">
                  <span className="text-secondary">Certificate Expiry</span>
                  <span>{carInt.certificate_expiry_visible}</span>
                </div>
              )}
              {carInt.emergency_lighting_visible != null && (
                <div className="row-between">
                  <span className="text-secondary">Emergency Lighting</span>
                  <span>{carInt.emergency_lighting_visible ? 'Visible' : 'Not Visible'}</span>
                </div>
              )}
              {carInt.emergency_phone_visible != null && (
                <div className="row-between">
                  <span className="text-secondary">Emergency Phone</span>
                  <span>{carInt.emergency_phone_visible ? 'Visible' : 'Not Visible'}</span>
                </div>
              )}
              {carInt.capacity_posting_visible != null && (
                <div className="row-between">
                  <span className="text-secondary">Capacity Posting</span>
                  <span>{carInt.capacity_posting_visible ? 'Visible' : 'Not Visible'}</span>
                </div>
              )}
            </div>
            {carInt.issues_found && carInt.issues_found.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Issues</h4>
                <div className="stack-sm">
                  {carInt.issues_found.map(function (it, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{humanize(it.issue_type)}</strong>
                          {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                        </div>
                        {it.description && <p style={{ fontSize: '0.875rem' }}>{it.description}</p>}
                        {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                        {it.asme_reference && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{it.asme_reference}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Safety Devices Analysis */}
        {safety?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Safety Devices</h3>
            {safety.devices_visible && safety.devices_visible.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <span className="text-secondary">Visible: </span>
                <span>{safety.devices_visible.join(', ')}</span>
              </div>
            )}
            {safety.issues_found && safety.issues_found.length > 0 && (
              <div className="stack-sm">
                {safety.issues_found.map(function (it, i) {
                  return (
                    <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                        <strong>{humanize(it.device)} — {humanize(it.issue_type)}</strong>
                        {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                      </div>
                      {it.description && <p style={{ fontSize: '0.875rem' }}>{it.description}</p>}
                      {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                      {it.witness_test_required && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Witness test required</p>}
                      {it.asme_reference && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{it.asme_reference}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Hydraulic System Analysis */}
        {hydraulic?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Hydraulic System</h3>
            <div className="stack-sm">
              {hydraulic.system_type && hydraulic.system_type !== 'unknown' && (
                <div className="row-between">
                  <span className="text-secondary">System Type</span>
                  <span style={{ fontWeight: 600 }}>{humanize(hydraulic.system_type)}</span>
                </div>
              )}
              {hydraulic.oil_level_visible && (
                <div className="row-between">
                  <span className="text-secondary">Oil Level</span>
                  <span>{hydraulic.oil_level_visible}</span>
                </div>
              )}
              {hydraulic.oil_condition_visual && (
                <div className="row-between">
                  <span className="text-secondary">Oil Condition</span>
                  <span>{humanize(hydraulic.oil_condition_visual)}</span>
                </div>
              )}
              {hydraulic.leak_evidence != null && (
                <div className="row-between">
                  <span className="text-secondary">Leak Evidence</span>
                  <span>{hydraulic.leak_evidence ? 'Yes' : 'No'}</span>
                </div>
              )}
              {hydraulic.leak_location && (
                <div className="row-between">
                  <span className="text-secondary">Leak Location</span>
                  <span>{hydraulic.leak_location}</span>
                </div>
              )}
            </div>
            {hydraulic.issues_found && hydraulic.issues_found.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Issues</h4>
                <div className="stack-sm">
                  {hydraulic.issues_found.map(function (it, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{humanize(it.component)} — {humanize(it.issue_type)}</strong>
                          {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                        </div>
                        {it.description && <p style={{ fontSize: '0.875rem' }}>{it.description}</p>}
                        {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Escalator Analysis */}
        {escalator?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Escalator / Moving Walk</h3>
            <div className="stack-sm">
              {escalator.equipment_type && (
                <div className="row-between">
                  <span className="text-secondary">Equipment Type</span>
                  <span style={{ fontWeight: 600 }}>{humanize(escalator.equipment_type)}</span>
                </div>
              )}
              {escalator.combplate_condition && (
                <div className="row-between">
                  <span className="text-secondary">Combplate</span>
                  <span>{humanize(escalator.combplate_condition)}</span>
                </div>
              )}
              {escalator.step_demarcation_visible != null && (
                <div className="row-between">
                  <span className="text-secondary">Step Demarcation</span>
                  <span>{escalator.step_demarcation_visible ? 'Visible' : 'Not Visible'}</span>
                </div>
              )}
            </div>
            {escalator.issues_found && escalator.issues_found.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Issues</h4>
                <div className="stack-sm">
                  {escalator.issues_found.map(function (it, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{humanize(it.component)} — {humanize(it.issue_type)}</strong>
                          {it.severity && <span className={actionBadgeClass(it.severity)}>{humanize(it.severity)}</span>}
                        </div>
                        {it.location && <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>Location: {it.location}</p>}
                        {it.description && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{it.description}</p>}
                        {it.corrective_action && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Fix:</span> {it.corrective_action}</p>}
                        {it.asme_reference && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{it.asme_reference}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fault Display Analysis */}
        {faultDisplay?.applicable && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Fault Display</h3>
            <div className="stack-sm">
              {faultDisplay.display_type && faultDisplay.display_type !== 'unknown' && (
                <div className="row-between">
                  <span className="text-secondary">Display Type</span>
                  <span style={{ fontWeight: 600 }}>{humanize(faultDisplay.display_type)}</span>
                </div>
              )}
              {faultDisplay.manufacturer_platform && (
                <div className="row-between">
                  <span className="text-secondary">Platform</span>
                  <span>{faultDisplay.manufacturer_platform}</span>
                </div>
              )}
              {faultDisplay.fault_count != null && (
                <div className="row-between">
                  <span className="text-secondary">Fault Count</span>
                  <span style={{ fontWeight: 600 }}>{faultDisplay.fault_count}</span>
                </div>
              )}
              {faultDisplay.system_status_visible && (
                <div className="row-between">
                  <span className="text-secondary">System Status</span>
                  <span>{faultDisplay.system_status_visible}</span>
                </div>
              )}
              {faultDisplay.other_readings_visible && (
                <div>
                  <span className="text-secondary">Other Readings: </span>
                  <span>{faultDisplay.other_readings_visible}</span>
                </div>
              )}
            </div>
            {faultDisplay.active_faults && faultDisplay.active_faults.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Active Faults</h4>
                <div className="stack-sm">
                  {faultDisplay.active_faults.map(function (f, i) {
                    return (
                      <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                          <strong>{f.fault_code} — {f.fault_description}</strong>
                          {f.fault_category && <span className="badge badge-blue">{humanize(f.fault_category)}</span>}
                        </div>
                        {f.probable_causes && f.probable_causes.length > 0 && (
                          <p style={{ fontSize: '0.875rem' }}><span className="text-secondary">Causes:</span> {f.probable_causes.join(', ')}</p>
                        )}
                        {f.reset_procedure && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><span className="text-secondary">Reset:</span> {f.reset_procedure}</p>}
                        {f.requires_physical_inspection && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Requires physical inspection</p>}
                        {f.out_of_service_required && <p style={{ fontSize: '0.8125rem', color: '#A855F7', marginTop: '0.25rem' }}>Out of service required</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prioritized Actions */}
        {result.prioritized_actions && result.prioritized_actions.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Prioritized Actions</h3>
            <ol className="stack-sm" style={{ paddingLeft: '1.25rem', margin: 0 }}>
              {result.prioritized_actions.map(function (a, i) {
                return (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>
                    <div className="row-between" style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div>{a.action}</div>
                        {a.reason && <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>{a.reason}</p>}
                      </div>
                      {a.urgency && (
                        <span className={actionBadgeClass(a.urgency)} style={{ minWidth: 'fit-content', fontSize: '0.6875rem' }}>
                          {humanize(a.urgency)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* ASME References */}
        {result.asme_references && result.asme_references.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Standards</h3>
            <div className="stack-sm">
              {result.asme_references.map(function (s, i) {
                return (
                  <div key={i} style={{ fontSize: '0.875rem' }}>
                    <strong>{s.code}</strong>
                    {s.section && <span className="text-secondary"> · {s.section}</span>}
                    {s.requirement_summary && <p className="text-secondary" style={{ marginTop: '0.125rem' }}>{s.requirement_summary}</p>}
                    {s.applies_to && <p className="text-muted" style={{ fontSize: '0.75rem' }}>Applies to: {s.applies_to}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended Next Steps */}
        {result.recommended_next_steps && (
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Next Steps</h3>
            <p>{result.recommended_next_steps}</p>
          </div>
        )}

        {/* Confidence */}
        {result.confidence && (
          <div className="card">
            <div className="row-between">
              <span className="text-secondary">Confidence</span>
              <span className={confidenceBadgeClass(result.confidence)}>{result.confidence}</span>
            </div>
            {result.confidence_reasoning && (
              <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>{result.confidence_reasoning}</p>
            )}
          </div>
        )}

        {/* Scope Disclaimer */}
        {result.scope_disclaimer && (
          <p className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', padding: '0 0.5rem' }}>
            {result.scope_disclaimer}
          </p>
        )}

        <button className="btn btn-secondary btn-block" onClick={handleReset}>Start Over</button>
      </div>
    );
  }

  return (
    <div className="page stack">
      <h1>Equipment Inspection</h1>
      <p className="text-secondary">Upload 1-4 photos of elevator or lift equipment for AI-powered diagnosis.</p>

      {/* Offline indicator */}
      {!navigator.onLine && (
        <div className="warning-box" style={{ fontSize: '0.875rem' }}>
          You are offline. Photos will be queued and processed automatically when you reconnect.
        </div>
      )}

      {/* Queued confirmation */}
      {queued && (
        <div className="info-box" style={{ fontSize: '0.875rem' }}>
          Photo queued! It will be processed automatically when you're back online.
        </div>
      )}

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

      {/* Offline Queue */}
      <OfflineQueue
        queue={offlineQueue.queue}
        processing={offlineQueue.processing}
        onRetry={offlineQueue.retry}
        onDismiss={offlineQueue.dismiss}
        onViewResult={handleViewQueueResult}
        onClearCompleted={offlineQueue.clearCompleted}
      />
    </div>
  );
}
