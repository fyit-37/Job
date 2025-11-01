import React, { useState, useMemo } from 'react';

// --- Bootstrap 5 CDN Injection (CSS only) ---
if (typeof window !== 'undefined' && !document.getElementById('bootstrap-css')) {
  const link = document.createElement('link');
  link.id = 'bootstrap-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
  document.head.appendChild(link);
}

// --- TYPE DEFINITIONS (TypeScript Interfaces) ---
interface Experience {
  title: string;
  company: string;
  years: string;
  bullets: string;
}

interface Education {
  degree: string;
  institution: string;
  years: string;
  notes?: string; 
}

interface Skills {
  technical: string;
  soft: string;
}

interface ResumeData {
  jobTitle: string;
  name: string;
  phone: string;
  email: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skills;
}

interface Template {
  id: string;
  name: string;
  columns: number;
  description: string;
  colorClass: string;
  bgColorClass: string;
}

interface TemplateProps {
    data: ResumeData;
    accentColor: string;
}

// --- INITIAL DATA & STRUCTURES ---

const initialResumeData: ResumeData = {
  jobTitle: 'Senior Software Engineer',
  name: 'Jane Doe',
  phone: '555-123-4567',
  email: 'jane.doe@example.com',
  linkedin: 'linkedin.com/in/janedoe',
  summary: 'Highly analytical and results-driven professional with 5+ years of experience in project management, specializing in developing efficiency-focused solutions. Proven ability to manage cross-functional teams and achieve key performance indicators (KPIs).',
  experience: [
    { title: 'Senior Project Manager', company: 'Tech Innovators Co.', years: '2020 - Present', bullets: '• Managed a portfolio of 5+ projects simultaneously, increasing team efficiency by 20%.\n• Developed and implemented a new tracking system that reduced reporting time by 3 hours per week.\n• Achieved 100% on-time project delivery for Q4 2024.' },
  ],
  education: [
    { degree: 'M.S. Computer Science', institution: 'University of Engineering', years: '2018 - 2020', notes: 'GPA: 3.9/4.0' },
    { degree: 'B.A. Business Administration', institution: 'State College', years: '2014 - 2018' },
  ],
  skills: {
    technical: 'Project Management, Scrum, Agile, SQL, Python, Data Analysis, Cloud Services (AWS)',
    soft: 'Leadership, Communication, Problem-Solving, Team Collaboration',
  },
};

const templates: Template[] = [
  { id: 'professional', name: 'Standard (ATS Optimized)', columns: 1, description: 'Single-column, clean, highly ATS-friendly format.', colorClass: 'border-primary', bgColorClass: 'bg-light' },
  { id: 'creative', name: 'Modern (Visual Impact)', columns: 2, description: 'Visually distinct, focused on human appeal.', colorClass: 'border-danger', bgColorClass: 'bg-light' },
  { id: 'classic', name: 'Classic (RenderCV Style)', columns: 1, description: 'Academic and technical focused with clear hierarchy.', colorClass: 'border-success', bgColorClass: 'bg-light' },
  { id: 'executive', name: 'Executive (Deedy Style)', columns: 2, description: 'Strong, modern two-column layout focusing on experience.', colorClass: 'border-info', bgColorClass: 'bg-light' },
  { id: 'minimalist', name: 'Creative Minimalist (AltaCV)', columns: 2, description: 'Bold sidebar, ideal for visual presentation and style.', colorClass: 'border-warning', bgColorClass: 'bg-light' },
  { id: 'anti', name: 'Anti-CV (Unique Focus)', columns: 1, description: 'Unique layout focusing on lessons learned and growth.', colorClass: 'border-secondary', bgColorClass: 'bg-light' },
];

// --- ATS SCORING LOGIC (Using TypeScript) ---

const calculateATSScore = (data: ResumeData, templateId: string): number => {
  let score = 50;
  
  // Logic remains the same (keywords, completeness, formatting bonus/penalty)
  const requiredFields = [data.jobTitle, data.name, data.email, data.summary];
  if (requiredFields.every(field => field.trim().length > 0)) { score += 5; }
  if (data.experience.length > 0 && data.experience[0].bullets.length > 30) { score += 10; }
  if (data.education.length > 0 && data.education[0].institution.length > 0) { score += 5; }

  const content = (
    data.summary +
    data.experience.map(exp => exp.bullets).join(' ') +
    data.skills.technical +
    data.skills.soft
  ).toLowerCase();

  const actionVerbs = ['managed', 'developed', 'achieved', 'implemented', 'led', 'created', 'optimized'];
  let verbCount = 0;
  actionVerbs.forEach(verb => {
    if (content.includes(verb)) verbCount++;
  });
  score += Math.min(verbCount * 2, 15);

  const numberCount = (content.match(/\d+(\+|\%|x|k|\s+)/g) || []).length;
  score += Math.min(numberCount * 2, 10);

  if (templateId === 'professional' || templateId === 'classic') {
    score += 5;
  } else if (templateId === 'anti') {
    score -= 10; // Penalize highly non-traditional format
  }

  return Math.min(100, Math.max(0, Math.round(score)));
};


// --- UTILITY COMPONENTS ---

const SectionTitle: React.FC<{ children: React.ReactNode, accentClass?: string, underlineStyle?: string }> = ({ children, accentClass = 'border-secondary', underlineStyle = 'border-bottom' }) => (
  <h2 className={`fs-5 fw-bold ${underlineStyle} ${accentClass} pt-3 mb-4 text-uppercase text-dark`}>
    {children}
  </h2>
);

// --- RESUME TEMPLATES (RENDERING with Bootstrap) ---

// --- 1. Standard (ATS Optimized) Template ---
const ProfessionalTemplate: React.FC<TemplateProps> = ({ data }) => (
    <div className="p-5 bg-white shadow-lg min-vh-100 font-sans">
      <header className="text-center pb-3 border-bottom border-dark border-4 mb-4">
        <h1 className="display-6 fw-bolder text-uppercase mb-1">{data.name}</h1>
        <h2 className="fs-4 fw-semibold pb-1 text-primary">{data.jobTitle || "Your Professional Title"}</h2>
        <div className="fs-6 mt-2 text-dark d-flex justify-content-center flex-wrap gap-3">
          <span className="fw-medium">{data.phone}</span>
          <a href={`mailto:${data.email}`} className="text-primary text-decoration-none fw-medium">{data.email}</a>
          <span className="d-inline-block text-truncate fw-medium" style={{maxWidth: '200px'}}>{data.linkedin}</span>
        </div>
      </header>
      <SectionTitle>Summary</SectionTitle>
      <p className="fs-6 mb-4">{data.summary}</p>
      <SectionTitle>Work Experience</SectionTitle>
      {data.experience.map((exp, index) => (
        <div key={index} className="mb-4">
          <div className="d-flex justify-content-between align-items-baseline">
            <h3 className="fs-5 fw-bold mb-0">{exp.title} - {exp.company}</h3>
            <span className="fs-6 fw-medium text-muted">{exp.years}</span>
          </div>
          <ul className="ms-4 mt-2 list-unstyled">
            {exp.bullets.split('\n').map((bullet, i) => (
              bullet.trim() && <li key={i} className="fs-6 position-relative ps-3 mb-1"><span className="position-absolute start-0 text-primary" style={{fontSize: '0.9rem'}}>&#8227;</span>{bullet.replace(/•/g, '').trim()}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className="row g-4 pt-2">
          <div className="col-12">
              <SectionTitle>Skills</SectionTitle>
              <p className="fs-6 mb-1"><span className="fw-bold">Technical:</span> {data.skills.technical}</p>
              <p className="fs-6"><span className="fw-bold">Soft:</span> {data.skills.soft}</p>
          </div>
          <div className="col-12">
              <SectionTitle>Education</SectionTitle>
              {data.education.map((edu, index) => (
              <div key={index} className="d-flex justify-content-between flex-wrap fs-6 mb-2">
                  <p className="fw-bold mb-0">{edu.institution}</p>
                  <div className="text-end">
                    <p className="text-muted mb-0">{edu.degree}, {edu.years}</p>
                    {edu.notes && <p className="text-secondary fst-italic mb-0" style={{fontSize: '0.85rem'}}>{edu.notes}</p>}
                  </div>
              </div>
              ))}
          </div>
      </div>
    </div>
);

// --- 2. Modern (Visual Impact) Template ---
const CreativeTemplate: React.FC<TemplateProps> = ({ data }) => (
    <div className="p-5 bg-white shadow-lg min-vh-100 font-sans">
      <div className="bg-danger text-white p-3 mb-4 rounded-3">
        <h1 className="fs-2 fw-bold text-uppercase">{data.name.toUpperCase()}</h1>
        <h2 className="fs-5 fw-light mt-1">{data.jobTitle || "Creative Professional"}</h2>
      </div>
      <div className="row g-4">
        <div className="col-md-4 border-end border-danger border-opacity-50 border-dashed pe-4">
          
          <h3 className="fs-5 fw-bold text-danger border-bottom pb-1 mb-3">Contact</h3>
          <p className="fs-6 mb-1">Phone: {data.phone}</p>
          <p className="fs-6 mb-1">Email: <a href={`mailto:${data.email}`} className="text-danger">{data.email}</a></p>
          <p className="fs-6 mb-3">LinkedIn: {data.linkedin.split('/').pop()}</p>

          <h3 className="fs-5 fw-bold text-danger border-bottom pb-1 mt-4 mb-3">Skills</h3>
          <p className="fs-6 fw-bold mt-2">TECHNICAL SUITE:</p>
          <div className="d-flex flex-wrap mb-3">
            {data.skills.technical.split(',').map(s => (
              <span key={s} className="badge bg-light text-dark border border-secondary m-1 p-2 rounded-pill fw-normal fs-6">{s.trim()}</span>
            ))}
          </div>
          <p className="fs-6 fw-bold mt-4">SOFT SKILLS:</p>
          <div className="d-flex flex-wrap mb-4">
            {data.skills.soft.split(',').map(s => (
              <span key={s} className="badge bg-light text-dark border border-secondary m-1 p-2 rounded-pill fw-normal fs-6">{s.trim()}</span>
            ))}
          </div>

          <h3 className="fs-5 fw-bold text-danger border-bottom pb-1 mb-3">Education</h3>
          {data.education.map((edu, index) => (
            <div key={index} className="mb-3 fs-6">
              <p className="fw-bold mb-0">{edu.degree}</p>
              <p className="text-muted mb-0">{edu.institution} ({edu.years})</p>
              {edu.notes && <p className="text-secondary fst-italic mb-0" style={{fontSize: '0.8rem'}}>{edu.notes}</p>}
            </div>
          ))}
        </div>

        <div className="col-md-8">
          <h3 className="fs-5 fw-bold text-danger border-bottom pb-1 mb-3">Summary</h3>
          <p className="fs-6 mb-4">{data.summary}</p>

          <h3 className="fs-5 fw-bold text-danger border-bottom pb-1 mb-3">Experience</h3>
          {data.experience.map((exp, index) => (
            <div key={index} className="mb-4 position-relative ps-4 border-start border-danger border-2">
              <span className="position-absolute start-0 translate-middle-x top-0 bg-danger rounded-circle" style={{width: '10px', height: '10px'}}></span>
              <div className="d-flex justify-content-between align-items-start">
                <h4 className="fs-6 fw-bold mb-0">{exp.title}</h4>
                <span className="fs-6 text-muted">{exp.years}</span>
              </div>
              <p className="fs-6 fst-italic mb-2">{exp.company}</p>
              <ul className="list-unstyled mb-0 ms-3">
                {exp.bullets.split('\n').map((bullet, i) => (
                  bullet.trim() && <li key={i} className="fs-6 position-relative ps-3 mb-1"><span className="position-absolute start-0 text-danger" style={{fontSize: '0.8rem'}}>&#10033;</span>{bullet.replace(/•/g, '').trim()}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
);

// --- 3. Classic (RenderCV Style) Template ---
const ClassicTemplate: React.FC<TemplateProps> = ({ data }) => (
    <div className="p-5 bg-white shadow-lg min-vh-100 font-serif">
        <header className="text-center pb-3 border-bottom border-dark border-2 mb-4">
            <h1 className="display-6 fw-bolder mb-1">{data.name}</h1>
            <p className="fs-6 text-muted mb-0">
                {data.phone} | {data.email} | {data.linkedin.split('/').pop()}
            </p>
        </header>

        <SectionTitle accentClass='border-dark' underlineStyle='border-bottom border-1'>PROFESSIONAL SUMMARY</SectionTitle>
        <p className="fs-6 mb-4">{data.summary}</p>

        <SectionTitle accentClass='border-dark' underlineStyle='border-bottom border-1'>EXPERIENCE</SectionTitle>
        {data.experience.map((exp, index) => (
            <div key={index} className="mb-4">
                <div className="d-flex justify-content-between">
                    <h3 className="fs-5 fw-bold mb-0 text-uppercase">{exp.title}, {exp.company}</h3>
                    <span className="fs-6 fw-medium text-muted">{exp.years}</span>
                </div>
                <ul className="ms-4 mt-2 list-unstyled">
                    {exp.bullets.split('\n').map((bullet, i) => (
                        bullet.trim() && <li key={i} className="fs-6 position-relative ps-3 mb-1"><span className="position-absolute start-0 text-dark" style={{fontSize: '0.9rem'}}>&#8227;</span>{bullet.replace(/•/g, '').trim()}</li>
                    ))}
                </ul>
            </div>
        ))}
        
        <SectionTitle accentClass='border-dark' underlineStyle='border-bottom border-1'>EDUCATION</SectionTitle>
        {data.education.map((edu, index) => (
            <div key={index} className="d-flex justify-content-between flex-wrap fs-6 mb-2">
                <p className="fw-bold mb-0">{edu.degree}, {edu.institution}</p>
                <div className="text-end">
                    <p className="text-muted mb-0">{edu.years}</p>
                    {edu.notes && <p className="text-secondary fst-italic mb-0" style={{fontSize: '0.85rem'}}>{edu.notes}</p>}
                </div>
            </div>
        ))}
        
        <SectionTitle accentClass='border-dark' underlineStyle='border-bottom border-1'>SKILLS & TECHNOLOGIES</SectionTitle>
        <p className="fs-6 mb-1"><span className="fw-bold">Languages:</span> {data.skills.technical}</p>
        <p className="fs-6"><span className="fw-bold">Soft Skills:</span> {data.skills.soft}</p>
    </div>
);

// --- 4. Executive (Deedy Style) Template ---
const ExecutiveTemplate: React.FC<TemplateProps> = ({ data }) => (
    <div className="p-5 bg-white shadow-lg min-vh-100 font-sans">
      <header className="pb-3 mb-4">
        <h1 className="fs-2 fw-bolder text-info mb-1">{data.name.toUpperCase()}</h1>
        <p className="fs-6 text-dark mb-0">{data.email} | {data.phone}</p>
        {data.linkedin && <p className="fs-6 text-dark mb-0">{data.linkedin}</p>}
      </header>

      <div className="row g-4">
        {/* Left Column (Main Content) - col-md-8 */}
        <div className="col-md-8 border-end border-light pe-4">
            <h2 className="fs-4 fw-bolder text-info border-bottom border-info border-2 pb-1 mb-3">EXPERIENCE</h2>
            {data.experience.map((exp, index) => (
                <div key={index} className="mb-4">
                    <div className="d-flex justify-content-between align-items-baseline">
                        <h3 className="fs-5 fw-bold mb-0 text-dark">{exp.company} - {exp.title}</h3>
                        <span className="fs-6 fw-medium text-muted">{exp.years}</span>
                    </div>
                    
                    <ul className="ms-4 mt-2 list-unstyled">
                        {exp.bullets.split('\n').map((bullet, i) => (
                            bullet.trim() && <li key={i} className="fs-6 position-relative ps-3 mb-1"><span className="position-absolute start-0 text-info" style={{fontSize: '0.9rem'}}>&#8227;</span>{bullet.replace(/•/g, '').trim()}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>

        {/* Right Column (Sidebar) - col-md-4 */}
        <div className="col-md-4 ps-4">
            <h2 className="fs-4 fw-bolder text-info border-bottom border-info border-2 pb-1 mb-3">EDUCATION</h2>
            {data.education.map((edu, index) => (
                <div key={index} className="mb-3 fs-6">
                    <p className="fw-bold mb-0">{edu.institution}</p>
                    <p className="text-muted mb-0">{edu.degree}</p>
                    {edu.notes && <p className="fst-italic mb-0" style={{fontSize: '0.85rem'}}>{edu.notes}</p>}
                    <p className="text-secondary mb-2">{edu.years}</p>
                </div>
            ))}

            <h2 className="fs-4 fw-bolder text-info border-bottom border-info border-2 pb-1 mb-3">SKILLS</h2>
            <p className="fs-6 fw-bold mb-1 text-dark">Programming</p>
            <p className="fs-6 mb-3">{data.skills.technical.split(',').slice(0, 3).join(' • ')}</p>

            <p className="fs-6 fw-bold mb-1 text-dark">Technology</p>
            <p className="fs-6 mb-3">{data.skills.technical.split(',').slice(3).join(' • ')}</p>

            <h2 className="fs-4 fw-bolder text-info border-bottom border-info border-2 pb-1 mb-3">SUMMARY</h2>
            <p className="fs-6 text-dark">{data.summary.substring(0, 250)}...</p>
        </div>
      </div>
    </div>
);

// --- 5. Creative Minimalist (AltaCV Style) Template ---
const MinimalistTemplate: React.FC<TemplateProps> = ({ data }) => (
    <div className="p-0 bg-white shadow-lg min-vh-100">
        <div className="row g-0">
            {/* Left Sidebar - col-md-4 */}
            <div className="col-md-4 bg-dark text-white p-4 shadow-sm" style={{ minHeight: '100vh' }}>
                <h1 className="display-5 fw-bolder text-uppercase text-warning mb-2">{data.name}</h1>
                <p className="fs-6 fw-bold mb-4 text-light">{data.jobTitle}</p>

                <h3 className="fs-5 fw-bold text-warning border-bottom border-warning pb-1 mb-3">Contact</h3>
                <p className="fs-6 mb-1">{data.email}</p>
                <p className="fs-6 mb-1">{data.phone}</p>
                <p className="fs-6 mb-4">{data.linkedin.split('/').pop()}</p>

                <h3 className="fs-5 fw-bold text-warning border-bottom border-warning pb-1 mb-3">Education</h3>
                {data.education.map((edu, index) => (
                    <div key={index} className="mb-3 fs-6">
                        <p className="fw-bold mb-0">{edu.degree}</p>
                        <p className="text-light mb-0">{edu.institution} ({edu.years})</p>
                        {edu.notes && <p className="fst-italic mb-2" style={{fontSize: '0.8rem'}}>{edu.notes}</p>}
                    </div>
                ))}
                
                <h3 className="fs-5 fw-bold text-warning border-bottom border-warning pb-1 mt-4 mb-3">Skills</h3>
                <div className="d-flex flex-wrap gap-2">
                    {data.skills.technical.split(',').concat(data.skills.soft.split(',')).map(s => (
                      s.trim() && <span key={s} className="badge bg-warning text-dark p-2 rounded-pill fw-normal">{s.trim()}</span>
                    ))}
                </div>
            </div>

            {/* Right Main Content - col-md-8 */}
            <div className="col-md-8 p-5">
                <h3 className="fs-5 fw-bold text-dark border-bottom border-secondary pb-1 mb-3">Summary</h3>
                <p className="fs-6 mb-4">{data.summary}</p>

                <h3 className="fs-5 fw-bold text-dark border-bottom border-secondary pb-1 mb-3">Experience</h3>
                {data.experience.map((exp, index) => (
                    <div key={index} className="mb-4">
                        <div className="d-flex justify-content-between align-items-start">
                            <h4 className="fs-5 fw-bold text-dark mb-0">{exp.title}</h4>
                            <span className="fs-6 text-muted">{exp.years}</span>
                        </div>
                        <p className="fs-6 fst-italic mb-2 text-secondary">{exp.company}</p>
                        <ul className="ms-3 list-unstyled">
                            {exp.bullets.split('\n').map((bullet, i) => (
                                bullet.trim() && <li key={i} className="fs-6 position-relative ps-3 mb-1"><span className="position-absolute start-0 text-secondary" style={{fontSize: '0.9rem'}}>&#9679;</span>{bullet.replace(/•/g, '').trim()}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    </div>
);


// --- 6. Anti-CV (Unique Focus) Template ---
const AntiCVTemplate: React.FC<TemplateProps> = ({ data }) => (
    <div className="p-5 bg-white shadow-lg min-vh-100 font-sans">
      <header className="pb-3 mb-4 border-bottom border-dark border-2">
        <h1 className="fs-2 fw-bolder text-dark mb-1">{data.name}</h1>
        <p className="fs-6 text-muted mb-0">{data.email} | {data.phone} | {data.linkedin.split('/').pop()}</p>
        <h2 className="fs-5 fw-light mt-2 fst-italic text-danger">Anti Curriculum Vitae (Lessons Learned)</h2>
      </header>

      <SectionTitle accentClass='border-danger' underlineStyle='border-bottom border-1'>LESSONS & MISTAKES (WORK EXPERIENCE)</SectionTitle>
      {data.experience.map((exp, index) => (
        <div key={index} className="mb-4">
          <h3 className="fs-5 fw-bold mb-2 text-dark">Mistake: {exp.title} at {exp.company}</h3>
          <p className="fs-6 mb-1 fw-bold text-danger">The Lesson Learned:</p>
          <ul className="ms-4 list-unstyled">
            {exp.bullets.split('\n').map((bullet, i) => (
              bullet.trim() && <li key={i} className="fs-6 position-relative ps-3 mb-1"><span className="position-absolute start-0 text-danger" style={{fontSize: '0.9rem'}}>&#10007;</span>{bullet.replace(/•/g, '').trim()}</li>
            ))}
          </ul>
        </div>
      ))}

      <SectionTitle accentClass='border-danger' underlineStyle='border-bottom border-1'>GROWTH (SKILLS & EDUCATION)</SectionTitle>
      <div className="row g-4">
        <div className="col-md-6">
            <h4 className="fs-6 fw-bold mb-2 text-dark">Skills I need to develop:</h4>
            <p className="fs-6 mb-1 text-muted">Technical: {data.skills.technical}</p>
            <p className="fs-6 text-muted">Soft: {data.skills.soft}</p>
        </div>
        <div className="col-md-6">
            <h4 className="fs-6 fw-bold mb-2 text-dark">Educational Gaps:</h4>
            {data.education.map((edu, index) => (
                <div key={index} className="mb-2 fs-6">
                    <p className="fw-bold mb-0">{edu.degree}</p>
                    <p className="text-muted mb-0">{edu.institution} ({edu.years})</p>
                </div>
            ))}
        </div>
      </div>
    </div>
);

const templateMap: { [key: string]: React.FC<TemplateProps> } = {
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
  classic: ClassicTemplate,
  executive: ExecutiveTemplate,
  minimalist: MinimalistTemplate,
  anti: AntiCVTemplate,
};

// --- HANDLERS AND MAIN COMPONENT LOGIC ---

// Function to handle browser Print to PDF (Preserves Visual Style)
const handlePrintPDF = () => {
    const resumeElement = document.getElementById('resume-preview');
    // FIX: Add check for printWindow being null/undefined before using it
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (printWindow) {
        // Use a blank title to prevent it from showing up in the PDF header/footer
        printWindow.document.write('<html><head><title></title>'); 
        
        // Inject Bootstrap CSS for styling in the print view
        printWindow.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">');
        
        // Inject essential print styles
        printWindow.document.write(`
            <style>
                @media print {
                    /* Suppress default browser header/footer text entirely */
                    @page { 
                        margin: 0.5in; 
                        size: letter; 
                        /* Important: these two properties suppress header/footer text */
                        marks: none; 
                        @top-center { content: ""; } 
                        @bottom-center { content: ""; }
                    } 
                    
                    body { margin: 0; padding: 0; }
                    .shadow-lg { box-shadow: none !important; }
                    
                    /* Ensures column layout is maintained if applicable */
                    .col-md-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
                    .col-md-8 { flex: 0 0 66.666667%; max-width: 66.666667%; }
                    
                    /* Force background colors/accents to print for color consistency */
                    .bg-danger { background-color: #dc3545 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .bg-light { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .bg-dark { background-color: #212529 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* For minimalist sidebar */


                    /* Fix padding for print */
                    .p-5 { padding: 0.5in !important; }

                    /* Ensure list items don't break across columns/pages poorly */
                    ul { page-break-inside: avoid; }
                    
                }
            </style>
        `);
        
        printWindow.document.write('</head><body>');
        // FIX: Only write innerHTML if resumeElement is found
        if (resumeElement) {
             printWindow.document.write(resumeElement.innerHTML);
        } else {
             printWindow.document.write('<div>Could not find resume preview content.</div>');
        }
       
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        // Wait for styles to render, then print
        printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    } else {
        const messageBox = document.getElementById('messageBox');
        if (messageBox) {
             messageBox.innerHTML = 'Error: Could not open print window.';
            setTimeout(() => messageBox.innerHTML = '', 3000);
        }
    }
};

interface ResumeFormProps {
    data: ResumeData;
    setData: React.Dispatch<React.SetStateAction<ResumeData>>;
    goNext: () => void;
}

// Defining types for safe array handling
type ExperienceKey = keyof Experience;
type EducationKey = keyof Education;
type ResumeArraySection = 'experience' | 'education';

const ResumeForm: React.FC<ResumeFormProps> = ({ data, setData, goNext }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, subKey] = name.split('.');
      setData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof ResumeData] as Skills),
          [subKey]: value,
        } as Skills, 
      }));
    } else {
      setData(prev => ({ ...prev, [name]: value } as ResumeData));
    }
  };

  // Generic handler for Experience and Education array fields
  const handleArrayChange = (section: ResumeArraySection, index: number, key: ExperienceKey | EducationKey, value: string) => {
    setData(prev => {
        const currentArray = prev[section];

        const updatedArray = currentArray.map((item, i) => {
            if (i === index) {
                // Ensure correct key access based on section type
                if (section === 'experience') {
                    return { ...item as Experience, [key as ExperienceKey]: value };
                }
                if (section === 'education') {
                    return { ...item as Education, [key as EducationKey]: value };
                }
            }
            return item;
        }) as any; // Cast to 'any' for the final array assignment to satisfy TypeScript compiler

        return {
            ...prev,
            [section]: updatedArray,
        } as ResumeData;
    });
  };
  
  const addItem = (section: ResumeArraySection) => {
    const newItem = section === 'experience'
        ? { title: '', company: '', years: '', bullets: '' } as Experience
        : { degree: '', institution: '', years: '', notes: '' } as Education;
        
    setData(prev => ({
        ...prev,
        [section]: [...prev[section], newItem] as any,
    }) as ResumeData);
  };

  const removeItem = (section: ResumeArraySection, index: number) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index) as any,
    }));
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-3">
      {/* Basic Info */}
      <fieldset className="border p-3 rounded-3 mb-4">
        <legend className="fs-6 fw-semibold px-2 text-primary">Personal & Target Info</legend>
        <div className="row g-3">
          <div className="col-md-6"><input type="text" name="name" value={data.name} onChange={handleChange} placeholder="Full Name" className="form-control" /></div>
          <div className="col-md-6"><input type="text" name="jobTitle" value={data.jobTitle} onChange={handleChange} placeholder="Target Job Title (e.g., Senior Developer)" className="form-control" /></div>
          <div className="col-md-6"><input type="email" name="email" value={data.email} onChange={handleChange} placeholder="Email Address" className="form-control" /></div>
          <div className="col-md-6"><input type="tel" name="phone" value={data.phone} onChange={handleChange} placeholder="Phone Number" className="form-control" /></div>
          <div className="col-12"><input type="url" name="linkedin" value={data.linkedin} onChange={handleChange} placeholder="LinkedIn URL" className="form-control" /></div>
        </div>
      </fieldset>

      {/* Summary */}
      <fieldset className="border p-3 rounded-3 mb-4">
        <legend className="fs-6 fw-semibold px-2 text-primary">Professional Summary</legend>
        <textarea name="summary" value={data.summary} onChange={handleChange} rows={4} placeholder="Write a concise summary highlighting your best achievements and skills. Use numbers!" className="form-control"></textarea>
      </fieldset>

      {/* Experience */}
      <fieldset className="border p-3 rounded-3 mb-4">
        <legend className="fs-6 fw-semibold px-2 text-primary">Work Experience (Start bullets with action verbs!)</legend>
        {data.experience.map((exp, index) => (
          <div key={index} className="p-3 mb-3 border rounded-3 bg-light">
            <div className="row g-2 mb-2">
              <div className="col-sm-6"><input type="text" value={exp.title} onChange={(e) => handleArrayChange('experience', index, 'title', e.target.value)} placeholder="Job Title" className="form-control form-control-sm" /></div>
              <div className="col-sm-3"><input type="text" value={exp.company} onChange={(e) => handleArrayChange('experience', index, 'company', e.target.value)} placeholder="Company" className="form-control form-control-sm" /></div>
              <div className="col-sm-3"><input type="text" value={exp.years} onChange={(e) => handleArrayChange('experience', index, 'years', e.target.value)} placeholder="Years" className="form-control form-control-sm" /></div>
            </div>
            <textarea value={exp.bullets} onChange={(e) => handleArrayChange('experience', index, 'bullets', e.target.value)} rows={3} placeholder="Bullet Points (one per line, use '•' or '–' at the start)" className="form-control form-control-sm"></textarea>
            <div className="d-flex justify-content-end mt-2">
              <button type="button" onClick={() => removeItem('experience', index)} className="btn btn-sm text-danger p-0">Remove Entry</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addItem('experience')} className="btn btn-success w-100 mt-2">
          + Add Experience
        </button>
      </fieldset>

      {/* Education */}
      <fieldset className="border p-3 rounded-3 mb-4">
        <legend className="fs-6 fw-semibold px-2 text-primary">Education</legend>
        {data.education.map((edu, index) => (
          <div key={index} className="p-3 mb-3 border rounded-3 bg-light row g-2">
            <div className="col-sm-4"><input type="text" value={edu.degree} onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)} placeholder="Degree/Major" className="form-control form-control-sm" /></div>
            <div className="col-sm-4"><input type="text" value={edu.institution} onChange={(e) => handleArrayChange('education', index, 'institution', e.target.value)} placeholder="Institution Name" className="form-control form-control-sm" /></div>
            <div className="col-sm-2"><input type="text" value={edu.years} onChange={(e) => handleArrayChange('education', index, 'years', e.target.value)} placeholder="Years" className="form-control form-control-sm" /></div>
            <div className="col-sm-2"><input type="text" value={edu.notes || ''} onChange={(e) => handleArrayChange('education', index, 'notes', e.target.value)} placeholder="Notes/GPA" className="form-control form-control-sm" /></div>
            <div className="col-12 d-flex justify-content-end">
              <button type="button" onClick={() => removeItem('education', index)} className="btn btn-sm text-danger p-0">Remove Entry</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addItem('education')} className="btn btn-success w-100 mt-2">
          + Add Education
        </button>
      </fieldset>

      {/* Skills */}
      <fieldset className="border p-3 rounded-3 mb-4">
        <legend className="fs-6 fw-semibold px-2 text-primary">Skills</legend>
        <p className="fs-6 text-muted mb-1">List skills separated by commas (e.g., Python, SQL, AWS)</p>
        <input type="text" name="skills.technical" value={data.skills.technical} onChange={handleChange} placeholder="Technical/Hard Skills" className="form-control mb-2" />
        <input type="text" name="skills.soft" value={data.skills.soft} onChange={handleChange} placeholder="Soft Skills" className="form-control" />
      </fieldset>

      <button onClick={goNext} className="btn btn-primary btn-lg w-100 shadow-lg">
        4. Check ATS Score & Download Resume
      </button>
    </div>
  );
};


// --- MAIN RESUME BUILDER COMPONENT ---

const ResumeBuilder: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0].id);
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);

  const currentTemplate = useMemo(() => templates.find(t => t.id === selectedTemplate) || templates[0], [selectedTemplate]);
  const ResumeComponent = useMemo(() => templateMap[selectedTemplate], [selectedTemplate]);

  const atsScore = useMemo(() => calculateATSScore(resumeData, selectedTemplate), [resumeData, selectedTemplate]);

  // --- Step Handlers ---
  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    setStep(2);
  };

  // --- Render Dynamic Builder Content (Steps 1 & 2) ---
  const renderBuilderContent = (): React.ReactNode => {
    switch (step) {
      case 1:
        return (
          <div className="p-4 bg-white shadow-lg rounded-3">
            <h1 className="fs-4 fw-bolder text-dark mb-4 border-bottom border-primary border-4 pb-2">Select Template</h1>
            <div className="row g-4 w-100 justify-content-center">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleTemplateSelect(t.id)}
                  className={`col-12 card p-4 border border-4 cursor-pointer shadow-lg transition-transform ${t.colorClass} ${t.bgColorClass} ${selectedTemplate === t.id ? 'border-success' : ''} h-100`}
                  style={{cursor: 'pointer'}}
                >
                  <h2 className="fs-5 fw-bold text-dark">{t.name}</h2>
                  <p className="fs-6 text-muted mt-2">{t.description}</p>
                  <div className="fs-6 mt-3 text-secondary">
                    <span className="fw-semibold">Format:</span> {t.columns}-Column
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
            <div className="mt-4">
                {/* Title is rendered inside ResumeForm */}
                <ResumeForm data={resumeData} setData={setResumeData} goNext={() => setStep(3)} />
            </div>
        );
      default:
        return null;
    }
  };

  // --- Render Dynamic Review Content (Step 3) ---
  const renderReviewContent = (): React.ReactNode => {
    if (step !== 3) return null;
    
    return (
      <div className="p-4 bg-white shadow-lg rounded-3 text-center">
        <h1 className="fs-3 fw-bolder text-dark mb-4">3. Check Score & Download</h1>

        {/* ATS Score Display */}
        <div className={`p-4 rounded-3 d-inline-block mb-4 shadow-lg ${atsScore >= 80 ? 'bg-success-subtle border border-success' : atsScore >= 60 ? 'bg-warning-subtle border border-warning' : 'bg-danger-subtle border border-danger'}`}>
          <p className="fs-1 fw-bolder mb-0">
            {atsScore}<span className="fs-4">%</span>
          </p>
          <p className="fs-5 fw-semibold mt-1">
            ATS Score Match
          </p>
          <p className="fs-6 mt-1 text-muted">
            {atsScore >= 80 ? "Excellent! Your resume is highly parsable and optimized for keywords." : atsScore >= 60 ? "Good. Review your bullet points for more action verbs and numbers." : "Needs Attention. Use clearer headings and ensure all sections are complete."}
          </p>
        </div>

        <div className="d-flex justify-content-center gap-3 mb-3">
          <button
            onClick={() => setStep(2)}
            className="btn btn-secondary shadow-sm"
          >
            ← Go Back to Edit Details
          </button>
          <button
            onClick={handlePrintPDF}
            className="btn btn-danger btn-lg fw-bold shadow-lg"
          >
            Print/Save as PDF (Preserves Visual Style)
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-light min-vh-100 p-4">
      {/* Custom Message Box for Feedback */}
      <div id="messageBox" className="position-fixed top-0 end-0 m-3 bg-info text-white p-3 rounded-3 shadow-lg z-3"></div>

      <div className="container-fluid">
        <div className="row g-4">

          {/* Left Side: Controls & Score (The Sidebar) */}
          <div className="col-lg-4">
            
            {/* ---------------------------------------------------- */}
            {/* FIRST SECTION: STEP NAVIGATION (Always Visible)      */}
            {/* ---------------------------------------------------- */}
            <div className="bg-white p-4 rounded-3 shadow-lg mb-4">
              <h1 className="fs-4 fw-bold mb-3 text-primary">Resume Builder Steps</h1>
              <ol className="list-unstyled">
                <li className={`p-3 rounded-3 border-start border-4 mb-2 ${step === 1 ? 'bg-light border-primary fw-semibold' : 'text-muted'}`} onClick={() => setStep(1)} style={{cursor: 'pointer'}}>
                  1. Select Template (Current: <span className="text-primary">{currentTemplate.name}</span>)
                </li>
                <li className={`p-3 rounded-3 border-start border-4 mb-2 ${step === 2 ? 'bg-light border-primary fw-semibold' : 'text-muted'}`} onClick={() => setStep(2)} style={{cursor: 'pointer'}}>
                  2. Fill Resume Content
                </li>
                <li className={`p-3 rounded-3 border-start border-4 ${step === 3 ? 'bg-light border-primary fw-semibold' : 'text-muted'}`} onClick={() => setStep(3)} style={{cursor: 'pointer'}}>
                  3. Check Score & Download
                </li>
              </ol>
            </div>
            
            {/* ---------------------------------------------------- */}
            {/* SECOND SECTION: BUILDER CONTENT (Steps 1 & 2)      */}
            {/* ---------------------------------------------------- */}
            {step < 3 && (
                <div className="mb-4">
                    {renderBuilderContent()}
                </div>
            )}
            
            {/* ---------------------------------------------------- */}
            {/* THIRD SECTION: REVIEW CONTENT (Step 3)             */}
            {/* ---------------------------------------------------- */}
            {step === 3 && (
                <div className="mb-4">
                    {renderReviewContent()}
                </div>
            )}

          </div>

          {/* Right Side: Resume Preview */}
          <div className="col-lg-8">
            <h2 className="fs-4 fw-bold text-dark mb-3 border-bottom pb-2">Live Resume Preview: {currentTemplate.name}</h2>
            <div className="bg-white rounded-3 overflow-hidden" id="resume-preview">
              <ResumeComponent data={resumeData} accentColor={currentTemplate.colorClass} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
