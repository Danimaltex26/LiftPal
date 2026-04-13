import { useState } from 'react';

var TOPICS = [
  {
    title: 'Elevator Safety & Codes',
    items: ['ASME A17.1 overview', 'LOTO procedures', 'Pit safety requirements', 'Car top inspection protocol', 'Hoistway entry procedures', 'Emergency evacuation'],
  },
  {
    title: 'Traction Systems',
    items: ['Geared vs gearless machines', 'Rope inspection & replacement', 'Sheave groove wear', 'Brake adjustment', 'Counterweight systems', 'Encoder & drive setup'],
  },
  {
    title: 'Hydraulic Systems',
    items: ['Jack types & operation', 'Valve block troubleshooting', 'Oil level & temperature', 'Pump motor maintenance', 'Jack packing replacement', 'Underground cylinder testing'],
  },
  {
    title: 'Door Systems',
    items: ['Door operator types', 'Interlock adjustment', 'Gate switch & restrictor', 'Hanger & roller maintenance', 'Detector alignment', 'Nudging operation'],
  },
  {
    title: 'Controllers & Drives',
    items: ['Relay logic basics', 'Microprocessor controllers', 'VFD drive parameters', 'Fault code diagnosis', 'Selector systems', 'Group dispatch'],
  },
];

export default function LearnPage() {
  var [expanded, setExpanded] = useState(null);

  return (
    <div className="page stack">
      <h1>Learn</h1>
      <div className="info-box">Training modules are coming soon. Browse topic previews below.</div>

      <div className="stack-sm">
        {TOPICS.map(function (topic, i) {
          var isOpen = expanded === i;
          return (
            <div key={i} className="card">
              <div className="expandable-header" onClick={function () { setExpanded(isOpen ? null : i); }}>
                <h3>{topic.title}</h3>
                <span style={{ color: '#6B6B73', fontSize: '1.25rem' }}>{isOpen ? '−' : '+'}</span>
              </div>
              {isOpen && (
                <div style={{ marginTop: '0.75rem' }}>
                  {topic.items.map(function (item, j) {
                    return (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #2A2A2E' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
