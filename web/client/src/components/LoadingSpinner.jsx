import { useEffect, useState } from 'react';

export default function LoadingSpinner({ message, messages }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const cycleMessages = messages && messages.length > 1;

  useEffect(() => {
    if (!cycleMessages) return;
    const interval = setInterval(() => { setMsgIndex((i) => (i + 1) % messages.length); }, 2500);
    return () => clearInterval(interval);
  }, [cycleMessages, messages]);

  const displayMessage = cycleMessages ? messages[msgIndex] : message || 'Loading...';

  return (
    <div className="spinner-container">
      <div className="spinner" />
      <p className="spinner-message" key={displayMessage}>{displayMessage}</p>
    </div>
  );
}
