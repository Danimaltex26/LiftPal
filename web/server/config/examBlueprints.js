export const EXAM_BLUEPRINTS = {
  CET: {
    totalQuestions: 50, timeMinutes: 75, passPercent: 70,
    domains: [
      { moduleNumber: 1, name: 'Elevator Safety Fundamentals', weight: 0.20, questions: 10 },
      { moduleNumber: 2, name: 'Traction Elevator Systems', weight: 0.25, questions: 13 },
      { moduleNumber: 3, name: 'Hydraulic Elevator Systems', weight: 0.20, questions: 10 },
      { moduleNumber: 4, name: 'Door Systems and Interlocks', weight: 0.20, questions: 10 },
      { moduleNumber: 5, name: 'Electrical Fundamentals for Elevators', weight: 0.15, questions: 7 },
    ]
  },
  QEI: {
    totalQuestions: 80, timeMinutes: 120, passPercent: 72,
    domains: [
      { moduleNumber: 1, name: 'ASME A17.1 Code Requirements', weight: 0.25, questions: 20 },
      { moduleNumber: 2, name: 'ASME A17.2 Inspection Guide', weight: 0.25, questions: 20 },
      { moduleNumber: 3, name: 'Safety Devices and Testing', weight: 0.25, questions: 20 },
      { moduleNumber: 4, name: 'Inspection Procedures and Documentation', weight: 0.15, questions: 12 },
      { moduleNumber: 5, name: 'Escalators and Moving Walks', weight: 0.10, questions: 8 },
    ]
  },
  CAT: {
    totalQuestions: 50, timeMinutes: 75, passPercent: 70,
    domains: [
      { moduleNumber: 1, name: 'ADA Accessibility Requirements', weight: 0.30, questions: 15 },
      { moduleNumber: 2, name: 'ASME A17.1 Accessibility Provisions', weight: 0.25, questions: 13 },
      { moduleNumber: 3, name: 'Accessibility Testing and Adjustment', weight: 0.25, questions: 12 },
      { moduleNumber: 4, name: 'Platform Lifts and Limited-Use Elevators', weight: 0.20, questions: 10 },
    ]
  },
  SENIOR_TECH: {
    totalQuestions: 100, timeMinutes: 150, passPercent: 75,
    domains: [
      { moduleNumber: 1, name: 'Advanced Controllers and Drives', weight: 0.25, questions: 25 },
      { moduleNumber: 2, name: 'Modernization and Code Compliance', weight: 0.25, questions: 25 },
      { moduleNumber: 3, name: 'Advanced Troubleshooting', weight: 0.25, questions: 25 },
      { moduleNumber: 4, name: 'Project Management and Leadership', weight: 0.25, questions: 25 },
    ]
  },
};
