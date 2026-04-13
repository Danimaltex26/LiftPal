import { useState, useEffect } from 'react';
import { apiGet, apiPatch, apiDelete } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

var SEVERITY_COLORS = { critical: 'badge-red', major: 'badge-amber', minor: 'badge-blue', observation: 'badge-gray' };

export default function HistoryPage() {
  var [tab, setTab] = useState('inspections');
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [expanded, setExpanded] = useState(null);
  var [editId, setEditId] = useState(null);
  var [editTitle, setEditTitle] = useState('');
  var [editNotes, setEditNotes] = useState('');

  useEffect(function () { fetchHistory(); }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      var result = await apiGet('/history');
      setData(result);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function saveEdit(id, type) {
    try {
      await apiPatch('/history/' + type + '/' + id, { title: editTitle, notes: editNotes });
      setEditId(null);
      fetchHistory();
    } catch (err) { setError(err.message); }
  }

  async function deleteItem(id, type) {
    if (!confirm('Delete this entry?')) return;
    try { await apiDelete('/history/' + type + '/' + id); fetchHistory(); }
    catch (err) { setError(err.message); }
  }

  async function markResolved(id) {
    try { await apiPatch('/history/troubleshoot/' + id + '/resolve'); fetchHistory(); }
    catch (err) { setError(err.message); }
  }

  if (loading) return <LoadingSpinner message="Loading history..." />;

  var inspections = data?.inspections || [];
  var sessions = data?.troubleshoot_sessions || [];

  function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  return (
    <div className="page stack">
      <h1>History</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="toggle-group">
        <button className={'toggle-option' + (tab === 'inspections' ? ' active' : '')} onClick={function () { setTab('inspections'); }}>Inspections ({inspections.length})</button>
        <button className={'toggle-option' + (tab === 'troubleshoot' ? ' active' : '')} onClick={function () { setTab('troubleshoot'); }}>Troubleshoot ({sessions.length})</button>
      </div>

      {tab === 'inspections' && (
        <div className="stack-sm">
          {inspections.length === 0 && <p className="text-muted text-center">No inspections yet</p>}
          {inspections.map(function (item) {
            var isExpanded = expanded === item.id;
            var isEditing = editId === item.id;
            var resp = item.full_response_json || {};
            return (
              <div key={item.id} className="card">
                <div className="expandable-header" onClick={function () { setExpanded(isExpanded ? null : item.id); }}>
                  <div>
                    <strong>{item.title || resp.component_identified || item.analysis_type || 'Inspection'}</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(item.created_at)}</div>
                  </div>
                  <span className={'badge ' + (SEVERITY_COLORS[item.severity] || 'badge-gray')}>{item.severity}</span>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '0.75rem' }} className="stack-sm">
                    <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{item.diagnosis}</p>
                    {isEditing ? (
                      <div className="stack-sm">
                        <input className="input" value={editTitle} onChange={function (e) { setEditTitle(e.target.value); }} placeholder="Title" />
                        <textarea className="textarea" value={editNotes} onChange={function (e) { setEditNotes(e.target.value); }} placeholder="Notes" />
                        <div className="row">
                          <button className="btn btn-primary" style={{ flex: 1 }} onClick={function () { saveEdit(item.id, 'analysis'); }}>Save</button>
                          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={function () { setEditId(null); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="row">
                        <button className="btn btn-ghost" onClick={function () { setEditId(item.id); setEditTitle(item.title || ''); setEditNotes(item.notes || ''); }}>Edit</button>
                        <button className="btn btn-ghost text-danger" onClick={function () { deleteItem(item.id, 'analysis'); }}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'troubleshoot' && (
        <div className="stack-sm">
          {sessions.length === 0 && <p className="text-muted text-center">No troubleshoot sessions yet</p>}
          {sessions.map(function (item) {
            var isExpanded = expanded === item.id;
            var isEditing = editId === item.id;
            return (
              <div key={item.id} className="card">
                <div className="expandable-header" onClick={function () { setExpanded(isExpanded ? null : item.id); }}>
                  <div>
                    <strong>{item.title || item.component || item.equipment_type || 'Session'}</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(item.created_at)}</div>
                  </div>
                  <span className={'badge ' + (item.resolved ? 'badge-green' : 'badge-amber')}>{item.resolved ? 'Resolved' : 'Open'}</span>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '0.75rem' }} className="stack-sm">
                    {isEditing ? (
                      <div className="stack-sm">
                        <input className="input" value={editTitle} onChange={function (e) { setEditTitle(e.target.value); }} placeholder="Title" />
                        <textarea className="textarea" value={editNotes} onChange={function (e) { setEditNotes(e.target.value); }} placeholder="Notes" />
                        <div className="row">
                          <button className="btn btn-primary" style={{ flex: 1 }} onClick={function () { saveEdit(item.id, 'troubleshoot'); }}>Save</button>
                          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={function () { setEditId(null); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="row">
                        <button className="btn btn-ghost" onClick={function () { setEditId(item.id); setEditTitle(item.title || ''); setEditNotes(item.notes || ''); }}>Edit</button>
                        {!item.resolved && <button className="btn btn-ghost" style={{ color: '#A855F7' }} onClick={function () { markResolved(item.id); }}>Resolve</button>}
                        <button className="btn btn-ghost text-danger" onClick={function () { deleteItem(item.id, 'troubleshoot'); }}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
