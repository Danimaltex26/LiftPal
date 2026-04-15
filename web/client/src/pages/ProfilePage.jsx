import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPatch } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

var EQUIPMENT_OPTIONS = ['Traction Geared', 'Traction Gearless', 'Hydraulic', 'MRL', 'Escalator', 'Moving Walk', 'Dumbwaiter', 'Freight', 'Residential'];
var CERT_OPTIONS = ['CET (Certified Elevator Technician)', 'QEI (Qualified Elevator Inspector)', 'CAT (Certified Accessibility Technician)', 'OSHA 10', 'OSHA 30', 'Manufacturer Certified', 'Other'];
var SPECIALTY_OPTIONS = ['Traction', 'Hydraulic', 'Controllers/Drives', 'Door Systems', 'Escalators', 'Modernization', 'New Construction', 'Inspection'];

export default function ProfilePage() {
  var { user, signOut } = useAuth();
  var [profile, setProfile] = useState(null);
  var [loading, setLoading] = useState(true);
  var [editName, setEditName] = useState('');
  var [editingName, setEditingName] = useState(false);

  useEffect(function () { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      var data = await apiGet('/profile');
      setProfile(data);
      setEditName(data.display_name || '');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function saveName() {
    await apiPatch('/profile', { display_name: editName });
    setEditingName(false);
    fetchProfile();
  }

  async function toggleArrayItem(field, item) {
    var current = profile[field] || [];
    var updated = current.includes(item) ? current.filter(function (x) { return x !== item; }) : [...current, item];
    await apiPatch('/profile', { [field]: updated });
    setProfile({ ...profile, [field]: updated });
  }

  if (loading) return <LoadingSpinner message="Loading profile..." />;

  var usage = profile?.usage || {};
  var tier = profile?.subscription_tier || 'free';

  return (
    <div className="page stack">
      <h1>Profile</h1>

      <div className="card">
        <div className="row-between">
          <div>
            {editingName ? (
              <div className="row">
                <input className="input" value={editName} onChange={function (e) { setEditName(e.target.value); }} style={{ maxWidth: 200 }} />
                <button className="btn btn-primary" onClick={saveName}>Save</button>
              </div>
            ) : (
              <div>
                <strong>{profile?.display_name || 'Set your name'}</strong>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={function () { setEditingName(true); }}>Edit</button>
              </div>
            )}
            <p className="text-muted" style={{ fontSize: '0.8125rem' }}>{user?.email}</p>
          </div>
          <span className={'badge ' + (tier === 'pro' ? 'badge-purple' : 'badge-gray')}>{tier.toUpperCase()}</span>
        </div>
      </div>

      {tier === 'free' && (
        <div className="card stack-sm">
          <h3>Monthly Usage</h3>
          {[
            { label: 'Inspections', used: usage.analysis_count || 0, limit: 2 },
            { label: 'Troubleshoot', used: usage.troubleshoot_count || 0, limit: 2 },
            { label: 'AI Reference', used: usage.reference_count || 0, limit: 5 },
          ].map(function (u) {
            var pct = Math.min(100, (u.used / u.limit) * 100);
            return (
              <div key={u.label}>
                <div className="row-between" style={{ fontSize: '0.8125rem' }}>
                  <span>{u.label}</span>
                  <span className="text-muted">{u.used}/{u.limit}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 8, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: pct + '%', height: '100%', background: '#A855F7', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card stack-sm">
        <h3>Equipment Types</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {EQUIPMENT_OPTIONS.map(function (item) {
            var active = (profile?.equipment_types || []).includes(item);
            return (
              <button key={item} className={'btn ' + (active ? 'btn-primary' : 'btn-secondary')} style={{ fontSize: '0.75rem', minHeight: 36, padding: '0.375rem 0.75rem' }}
                onClick={function () { toggleArrayItem('equipment_types', item); }}>{item}</button>
            );
          })}
        </div>
      </div>

      <div className="card stack-sm">
        <h3>Certifications</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {CERT_OPTIONS.map(function (item) {
            var active = (profile?.certifications || []).includes(item);
            return (
              <button key={item} className={'btn ' + (active ? 'btn-primary' : 'btn-secondary')} style={{ fontSize: '0.75rem', minHeight: 36, padding: '0.375rem 0.75rem' }}
                onClick={function () { toggleArrayItem('certifications', item); }}>{item}</button>
            );
          })}
        </div>
      </div>

      <div className="card stack-sm">
        <h3>Specialties</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {SPECIALTY_OPTIONS.map(function (item) {
            var active = (profile?.specialties || []).includes(item);
            return (
              <button key={item} className={'btn ' + (active ? 'btn-primary' : 'btn-secondary')} style={{ fontSize: '0.75rem', minHeight: 36, padding: '0.375rem 0.75rem' }}
                onClick={function () { toggleArrayItem('specialties', item); }}>{item}</button>
            );
          })}
        </div>
      </div>

      {tier === 'free' && (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Upgrade to Pro</h3>
          <p className="text-secondary" style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>
            Unlimited photo analyses, troubleshoot sessions, AI reference lookups, full training content, and priority processing.
          </p>
          <a
            href="https://tradepals.net/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-block"
          >
            View Pro Plans
          </a>
        </div>
      )}

      <button className="btn btn-danger btn-block" onClick={signOut}>Sign Out</button>
    </div>
  );
}
