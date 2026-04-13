import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  var [name, setName] = useState('');
  var [email, setEmail] = useState('');
  var [password, setPassword] = useState('');
  var [confirm, setConfirm] = useState('');
  var [agreedToTerms, setAgreedToTerms] = useState(false);
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);
  var [success, setSuccess] = useState(false);
  var { signUp } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await signUp(email, password, name || undefined);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh' }}>
        <div className="stack" style={{ maxWidth: 400, margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <img src="/logo.png" alt="LiftPal" style={{ width: 260, margin: '0 auto 1rem' }} />
          <div className="info-box">Check your email to confirm your account, then sign in.</div>
          <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh' }}>
      <form onSubmit={handleSubmit} className="stack" style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <img src="/logo.png" alt="LiftPal" style={{ width: 260, marginBottom: '0.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
        <p className="text-center text-secondary" style={{ marginBottom: '1rem' }}>Create your LiftPal account</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-group">
          <label>Name</label>
          <input className="input" type="text" placeholder="Your name" value={name} onChange={function (e) { setName(e.target.value); }} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={function (e) { setEmail(e.target.value); }} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input className="input" type="password" placeholder="Min 6 characters" value={password} onChange={function (e) { setPassword(e.target.value); }} required />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input className="input" type="password" placeholder="Re-enter password" value={confirm} onChange={function (e) { setConfirm(e.target.value); }} required />
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#A0A0A8', cursor: 'pointer', lineHeight: 1.5 }}>
          <input type="checkbox" checked={agreedToTerms} onChange={function (e) { setAgreedToTerms(e.target.checked); }} style={{ marginTop: 3, flexShrink: 0, accentColor: '#A855F7' }} />
          <span>
            I agree to the <a href="https://tradepals.net/liftpal/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#A855F7' }}>Terms of Service</a>{' '}
            and <a href="https://tradepals.net/liftpal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#A855F7' }}>Privacy Policy</a>.
          </span>
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading || !agreedToTerms}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <p className="text-center text-secondary" style={{ fontSize: '0.875rem' }}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
