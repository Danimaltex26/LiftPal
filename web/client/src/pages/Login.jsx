import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  var [email, setEmail] = useState('');
  var [password, setPassword] = useState('');
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);
  var [magicSent, setMagicSent] = useState(false);
  var navigate = useNavigate();
  var { signIn, signInWithMagicLink } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return; }
    setError('');
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setMagicSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh' }}>
      <form onSubmit={handleSubmit} className="stack" style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <img src="/logo.png" alt="LiftPal" style={{ width: 260, marginBottom: '0.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
        <p className="text-center text-secondary" style={{ marginBottom: '1rem' }}>AI field companion for elevator &amp; lift technicians</p>

        {error && <div className="error-banner">{error}</div>}
        {magicSent && <div className="info-box">Check your email for a sign-in link.</div>}

        <div className="form-group">
          <label>Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={function (e) { setEmail(e.target.value); }} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input className="input" type="password" placeholder="Your password" value={password} onChange={function (e) { setPassword(e.target.value); }} />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={handleMagicLink} disabled={loading}>
          Send Magic Link
        </button>

        <p className="text-center text-secondary" style={{ fontSize: '0.875rem' }}>
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>

        <a href="https://tradepals.net" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: '2rem', opacity: 0.5 }}>
          <img src="https://tradepals.net/tradepals-logo.png" alt="TradePals" style={{ height: 28, display: 'inline-block' }} />
        </a>
      </form>
    </div>
  );
}
