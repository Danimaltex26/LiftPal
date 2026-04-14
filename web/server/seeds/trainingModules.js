// LiftPal training module definitions
// Elevator tech certification path: CET → QEI → CAT → SENIOR_TECH

export const MODULES = [
  // ── CET (Certified Elevator Technician) ───────────────────
  {
    cert_level: 'CET', module_number: 1, title: 'Elevator Safety Fundamentals',
    estimated_minutes: 50, exam_domain_weight: 0.20,
    topic_list: ['LOTO procedures for elevators', 'Pit entry safety', 'Car top operation', 'Hoistway entry protocols', 'Fall protection systems', 'Emergency evacuation procedures', 'OSHA requirements', 'Personal protective equipment'],
  },
  {
    cert_level: 'CET', module_number: 2, title: 'Traction Elevator Systems',
    estimated_minutes: 55, exam_domain_weight: 0.25,
    topic_list: ['Geared vs gearless machines', 'Hoist ropes and belts', 'Sheave types and groove wear', 'Counterweight systems', 'Guide rails and brackets', 'Roller guides vs slide guides', 'Machine room layout', 'MRL configurations'],
  },
  {
    cert_level: 'CET', module_number: 3, title: 'Hydraulic Elevator Systems',
    estimated_minutes: 50, exam_domain_weight: 0.20,
    topic_list: ['Hydraulic jack types', 'Pump unit components', 'Valve block operation', 'Oil types and maintenance', 'Underground cylinder testing', 'Jack packing replacement', 'Power unit troubleshooting', 'Temperature compensation'],
  },
  {
    cert_level: 'CET', module_number: 4, title: 'Door Systems and Interlocks',
    estimated_minutes: 50, exam_domain_weight: 0.20,
    topic_list: ['Door operator types', 'Interlock mechanisms', 'Gate switch adjustment', 'Restrictor devices', 'Hanger and roller maintenance', 'Sill and gibs', 'Detector systems', 'Nudging operation'],
  },
  {
    cert_level: 'CET', module_number: 5, title: 'Electrical Fundamentals for Elevators',
    estimated_minutes: 45, exam_domain_weight: 0.15,
    topic_list: ['Relay logic basics', 'Contactor and relay inspection', 'Wiring diagrams', 'Motor types and circuits', 'Brake circuits', 'Safety circuit chain', 'Selector systems', 'Basic troubleshooting'],
  },

  // ── QEI (Qualified Elevator Inspector) ────────────────────
  {
    cert_level: 'QEI', module_number: 1, title: 'ASME A17.1 Code Requirements',
    estimated_minutes: 60, exam_domain_weight: 0.25,
    topic_list: ['Code structure and organization', 'New installation requirements', 'Alteration requirements', 'Maintenance requirements', 'Inspection and testing intervals', 'Safety device requirements', 'Emergency operation', 'Code updates and amendments'],
  },
  {
    cert_level: 'QEI', module_number: 2, title: 'ASME A17.2 Inspection Guide',
    estimated_minutes: 55, exam_domain_weight: 0.25,
    topic_list: ['Inspection categories', 'Periodic testing procedures', 'Acceptance testing', 'Witness testing requirements', 'Documentation and reporting', 'Deficiency classification', 'Violation vs recommendation', 'Authority Having Jurisdiction'],
  },
  {
    cert_level: 'QEI', module_number: 3, title: 'Safety Devices and Testing',
    estimated_minutes: 55, exam_domain_weight: 0.25,
    topic_list: ['Governor operation and testing', 'Safety device types and testing', 'Buffer requirements and testing', 'Door interlock testing', 'Fire service operation', 'Seismic protection', 'Standby power operation', 'Overspeed protection'],
  },
  {
    cert_level: 'QEI', module_number: 4, title: 'Inspection Procedures and Documentation',
    estimated_minutes: 50, exam_domain_weight: 0.15,
    topic_list: ['Pre-inspection preparation', 'Systematic inspection approach', 'Measurement tools and techniques', 'Photo documentation', 'Report writing', 'Violation tracking', 'Re-inspection procedures', 'Record retention requirements'],
  },
  {
    cert_level: 'QEI', module_number: 5, title: 'Escalators and Moving Walks',
    estimated_minutes: 50, exam_domain_weight: 0.10,
    topic_list: ['Step chain and sprocket inspection', 'Comb plate requirements', 'Handrail speed matching', 'Skirt clearances', 'Safety switches and devices', 'Demarcation lines', 'Broken chain device', 'Missing step device'],
  },

  // ── CAT (Certified Accessibility Technician) ──────────────
  {
    cert_level: 'CAT', module_number: 1, title: 'ADA Accessibility Requirements',
    estimated_minutes: 50, exam_domain_weight: 0.30,
    topic_list: ['ADA elevator requirements', 'Door timing requirements', 'Car dimensions and clearances', 'Control panel height and layout', 'Braille and tactile signage', 'Audible signals', 'Two-way communication', 'Destination dispatch accessibility'],
  },
  {
    cert_level: 'CAT', module_number: 2, title: 'ASME A17.1 Accessibility Provisions',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['Code accessibility sections', 'Stretcher-size elevators', 'Emergency evacuation provisions', 'Visual and audible signals', 'Door protective devices', 'Car leveling accuracy', 'Platform lifts and LULA', 'Residential accessibility'],
  },
  {
    cert_level: 'CAT', module_number: 3, title: 'Accessibility Testing and Adjustment',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['Door timing measurement', 'Leveling accuracy verification', 'Signal volume and frequency', 'Control placement verification', 'Communication system testing', 'Emergency operation testing', 'Documentation requirements', 'Remediation procedures'],
  },
  {
    cert_level: 'CAT', module_number: 4, title: 'Platform Lifts and Limited-Use Elevators',
    estimated_minutes: 40, exam_domain_weight: 0.20,
    topic_list: ['LULA requirements', 'Vertical platform lift types', 'Inclined platform lifts', 'Private residence elevators', 'Installation requirements', 'Inspection and testing', 'Maintenance requirements', 'Code differences from standard elevators'],
  },

  // ── SENIOR_TECH (Senior Elevator Technician) ──────────────
  {
    cert_level: 'SENIOR_TECH', module_number: 1, title: 'Advanced Controllers and Drives',
    estimated_minutes: 60, exam_domain_weight: 0.25,
    topic_list: ['Microprocessor controller architecture', 'VFD drive parameters', 'Closed-loop feedback systems', 'Encoder types and calibration', 'Fault code diagnosis', 'Software updates and configuration', 'Group supervisory control', 'Destination dispatch systems'],
  },
  {
    cert_level: 'SENIOR_TECH', module_number: 2, title: 'Modernization and Code Compliance',
    estimated_minutes: 55, exam_domain_weight: 0.25,
    topic_list: ['ASME A17.3 existing installations', 'Modernization scope determination', 'Code trigger requirements', 'Phased modernization planning', 'Component compatibility', 'Testing after modernization', 'Documentation requirements', 'AHJ coordination'],
  },
  {
    cert_level: 'SENIOR_TECH', module_number: 3, title: 'Advanced Troubleshooting',
    estimated_minutes: 55, exam_domain_weight: 0.25,
    topic_list: ['Systematic fault isolation', 'Intermittent fault diagnosis', 'CAN bus communication', 'Motor and drive diagnostics', 'Vibration and ride quality analysis', 'Load weighing calibration', 'Speed profile tuning', 'Multi-car coordination'],
  },
  {
    cert_level: 'SENIOR_TECH', module_number: 4, title: 'Project Management and Leadership',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['Job planning and scheduling', 'Crew supervision', 'Subcontractor coordination', 'Material management', 'Quality assurance', 'Customer communication', 'Safety program management', 'Training and mentoring'],
  },
];
