// src/app/company/CreateJobPosting.tsx

"use client";
import { FC, useState, FormEvent, useCallback } from 'react';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import dynamic from 'next/dynamic'; // 🚨 DYNAMIC IMPORT NEEDED FOR MAP

// NOTE: Ensure these imports are correct based on your file structure
import { useAuth } from '@/app/page'; 
import { db } from '@/app/lib/firebase'; 


// ===============================================
// DYNAMIC MAP IMPORT (SSR Fix)
// ===============================================
const DynamicLocationMap = dynamic(
    () => import('./LocationMap' as string), 
    { ssr: false, loading: () => <p className="text-center text-muted p-5">Loading Map...</p> } 
);


// ===============================================
// TYPE DEFINITIONS
// ===============================================

interface JobPost {
    jobTitle: string;
    employmentType: string;
    description: string;
    salary: number | string;
    salaryType: string;
    skillRequirements: string; 
    tags: string; 
    country: string;
    city: string;
    address: string;
    latitude: number; 
    longitude: number;
}

const initialJobPost: JobPost = {
    jobTitle: '',
    employmentType: 'Full-Time',
    description: '',
    salary: '',
    salaryType: 'Yearly',
    skillRequirements: '',
    tags: '',
    country: '',
    city: '',
    address: '',
    latitude: 20.5937, // Default center of India
    longitude: 78.9629,
};


// ===============================================
// UTILITY COMPONENTS
// ===============================================

/**
 * Multi-Step Indicator component
 */
const StepIndicator: FC<{ currentStep: number, labels: string[] }> = ({ currentStep, labels }) => (
    <div className="d-flex justify-content-between mb-4">
        {labels.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isComplete = stepNumber < currentStep;

            return (
                <div key={stepNumber} className="text-center position-relative flex-grow-1 mx-2">
                    <div className={`rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-2 
                        ${isActive ? 'bg-success text-white shadow' : isComplete ? 'bg-success-subtle text-success' : 'bg-light text-muted border'}`}
                        style={{ width: '40px', height: '40px' }}>
                        {isComplete ? <i className="bi bi-check-lg"></i> : stepNumber}
                    </div>
                    <p className={`small fw-bold ${isActive ? 'text-success' : 'text-muted'}`}>{label}</p>
                    {index < labels.length - 1 && (
                        <div className={`position-absolute top-0 end-0 translate-middle-y h-100 border-top ${isComplete || isActive ? 'border-success' : 'border-light'}`} 
                             style={{ width: 'calc(100% + 16px)', left: '50%', zIndex: -1 }}></div>
                    )}
                </div>
            );
        })}
    </div>
);


/**
 * Rich Text Editor Placeholder component
 */
const RichTextEditor: FC<{ value: string, onChange: (value: string) => void }> = ({ value, onChange }) => {
    const [style, setStyle] = useState({ 
        textAlign: 'left', 
        fontWeight: 'normal', 
        fontStyle: 'normal', 
        textDecoration: 'none'
    });

    const toggleStyle = (key: keyof typeof style, value: string) => {
        setStyle(prev => ({ ...prev, [key]: prev[key] === value ? 'normal' : value }));
    };

    const toggleAlignment = (alignment: string) => {
        setStyle(prev => ({ ...prev, textAlign: alignment }));
    };

    const cleanValue = value.replace(/^\[Style:.*\]/, '');

    return (
        <div className="border rounded p-3 bg-white">
            <div className="btn-toolbar mb-3" role="toolbar">
                <div className="btn-group btn-group-sm me-2 shadow-sm" role="group">
                    <button type="button" className={`btn ${style.fontWeight === 'bold' ? 'btn-success' : 'btn-outline-secondary'}`} 
                            onClick={() => toggleStyle('fontWeight', 'bold')}>
                        <i className="bi bi-type-bold"></i>
                    </button>
                    <button type="button" className={`btn ${style.fontStyle === 'italic' ? 'btn-success' : 'btn-outline-secondary'}`} 
                            onClick={() => toggleStyle('fontStyle', 'italic')}>
                        <i className="bi bi-type-italic"></i>
                    </button>
                    <button type="button" className={`btn ${style.textDecoration === 'underline' ? 'btn-success' : 'btn-outline-secondary'}`} 
                            onClick={() => toggleStyle('textDecoration', 'underline')}>
                        <i className="bi bi-type-underline"></i>
                    </button>
                </div>
                <div className="btn-group btn-group-sm shadow-sm" role="group">
                    <button type="button" className={`btn ${style.textAlign === 'left' ? 'btn-success' : 'btn-outline-secondary'}`} 
                            onClick={() => toggleAlignment('left')}>
                        <i className="bi bi-text-left"></i>
                    </button>
                    <button type="button" className={`btn ${style.textAlign === 'center' ? 'btn-success' : 'btn-outline-secondary'}`} 
                            onClick={() => toggleAlignment('center')}>
                        <i className="bi bi-text-center"></i>
                    </button>
                    <button type="button" className={`btn ${style.textAlign === 'right' ? 'btn-success' : 'btn-outline-secondary'}`} 
                            onClick={() => toggleAlignment('right')}>
                        <i className="bi bi-text-right"></i>
                    </button>
                </div>
            </div>
            <textarea
                className="form-control"
                rows={8}
                value={cleanValue} 
                onChange={(e) => {
                    // This now captures the raw text without attempting full-element styling.
                    onChange(e.target.value);
                }}
                placeholder="Write the comprehensive job description here..."
                required
            />
             <small className="form-text text-muted d-block mt-2">Note: Formatting is simulated. For true highlighting, a dedicated library is required.</small>
        </div>
    );
};


// ===============================================
// CREATE JOB POSTING WIZARD (MAIN EXPORT)
// ===============================================

interface CreateJobPostingProps {
    onPostSuccess: () => void; 
    onPostError: (message: string) => void;
}

export const CreateJobPosting: FC<CreateJobPostingProps> = ({ onPostSuccess, onPostError }) => {
    const { user, db, setError, clearError } = useAuth();
    const [step, setStep] = useState(1);
    const [jobData, setJobData] = useState<JobPost>(initialJobPost);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const steps = ['About', 'Job Details', 'Skills', 'Location', 'Summary'];
    
    const updateField = (name: keyof JobPost, value: string | number) => {
        setJobData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = (e: FormEvent) => {
        e.preventDefault();
        setStep(prev => Math.min(prev + 1, steps.length));
    };

    const prevStep = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleLocationChange = useCallback((lat: number, lng: number) => {
        setJobData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
        }));
        setError(`Map location updated! Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}.`, false);
    }, [setError]);


    const handlePostJob = async () => {
        if (!user) {
            onPostError('You must be logged in to post a job.');
            return;
        }

        setIsSubmitting(true);
        clearError();

        try {
            const jobPostingData = {
                ...jobData,
                companyId: user.uid,
                companyName: user.displayName || 'Anonymous Company',
                status: 'Active',
                createdAt: serverTimestamp(),
            };
            
            const jobsCollectionRef = collection(db, 'jobPostings');
            await addDoc(jobsCollectionRef, jobPostingData);

            const companyRef = doc(db, 'companies', user.uid);
            await setDoc(companyRef, { jobPostings: (prev => prev + 1)(0) }, { merge: true }); 

            // SUCCESS HANDLER: Notify parent, now safely called
            if (typeof onPostSuccess === 'function') {
                 onPostSuccess(); 
            } else {
                 setError('Job posted successfully! (Navigation handler missing)', false);
            }

        } catch (error) {
            console.error('Error posting job:', error);
            // ERROR HANDLER: Notify parent, now safely called
            if (typeof onPostError === 'function') {
                 onPostError(`Failed to post job: ${(error as any).message || 'An unknown error occurred'}`);
            } else {
                 setError(`Failed to post job: ${(error as any).message || 'An unknown error occurred'}`, true);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1: // About (Job Title and Employment Type)
                return (
                    <form onSubmit={nextStep}>
                        <h5 className="mb-4 text-dark">1. Basic Information (About)</h5>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Job Title</label>
                            <input type="text" className="form-control" value={jobData.jobTitle} onChange={(e) => updateField('jobTitle', e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-bold">Employment Type</label>
                            <select className="form-select" value={jobData.employmentType} onChange={(e) => updateField('employmentType', e.target.value)} required>
                                {['Full-Time', 'Part-Time', 'Hybrid', 'Contract', 'Internship', 'Temporary'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="d-flex justify-content-end">
                            <button type="submit" className="btn btn-success px-4">Next: Job Details</button>
                        </div>
                    </form>
                );
            case 2: // Job Details (Description and Salary)
                return (
                    <form onSubmit={nextStep}>
                        <h5 className="mb-4 text-dark">2. Job Description & Salary (Job Details)</h5>
                        {/* Job Description Field (Restored) */}
                        <div className="mb-4">
                            <label className="form-label fw-bold">Job Description</label>
                            <RichTextEditor value={jobData.description} onChange={(val) => updateField('description', val)} />
                        </div>
                        <div className="row mb-4">
                            <div className="col-8">
                                <label className="form-label fw-bold">Salary Amount</label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    value={jobData.salary === '' ? '' : String(jobData.salary)} 
                                    onChange={(e) => {
                                        const newValue = e.target.value === '' ? '' : parseFloat(e.target.value);
                                        updateField('salary', newValue);
                                    }} 
                                    placeholder="e.g., 120000" 
                                    required 
                                />
                            </div>
                            <div className="col-4">
                                <label className="form-label fw-bold">Salary Type</label>
                                <select className="form-select" value={jobData.salaryType} onChange={(e) => updateField('salaryType', e.target.value)} required>
                                    {['Yearly', 'Monthly', 'Hourly', 'Fixed'].map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="d-flex justify-content-between">
                            <button type="button" className="btn btn-outline-secondary px-4" onClick={prevStep}>Back</button>
                            <button type="submit" className="btn btn-success px-4">Next: Skills</button>
                        </div>
                    </form>
                );
            case 3: // Skills (Requirements and Tags)
                return (
                    <form onSubmit={nextStep}>
                        <h5 className="mb-4 text-dark">3. Required Skills & Tags (Skills)</h5>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Skill Requirements (e.g., React, TypeScript, GraphQL)</label>
                            <textarea className="form-control" rows={3} value={jobData.skillRequirements} onChange={(e) => updateField('skillRequirements', e.target.value)} placeholder="List core skills, separated by commas." required />
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-bold">Relevant Tags</label>
                            <input type="text" className="form-control" value={jobData.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="e.g., #frontend #developer #remote" />
                        </div>
                        <div className="d-flex justify-content-between">
                            <button type="button" className="btn btn-outline-secondary px-4" onClick={prevStep}>Back</button>
                            <button type="submit" className="btn btn-success px-4">Next: Location</button>
                        </div>
                    </form>
                );
            case 4: // Location (Address and Map)
                return (
                    <form onSubmit={nextStep}>
                        <h5 className="mb-4 text-dark">4. Job Location (Location)</h5>
                        <div className="row">
                            <div className="col-md-6 mb-4">
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Country</label>
                                    <input type="text" className="form-control" value={jobData.country} onChange={(e) => updateField('country', e.target.value)} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">City / State</label>
                                    <input type="text" className="form-control" value={jobData.city} onChange={(e) => updateField('city', e.target.value)} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Street Address</label>
                                    <input type="text" className="form-control" value={jobData.address} onChange={(e) => updateField('address', e.target.value)} required />
                                </div>
                                <p className="small text-muted mt-3">
                                    Current Coordinates: **Lat: {jobData.latitude.toFixed(6)}, Lng: {jobData.longitude.toFixed(6)}**
                                </p>
                            </div>
                            <div className="col-md-6 mb-4">
                                <label className="form-label fw-bold">Select Location on Map (Click/Drag Pin)</label>
                                
                                {/* 🚨 USE DYNAMICALLY IMPORTED MAP HERE */}
                                <div style={{ height: '350px', width: '100%' }}>
                                    <DynamicLocationMap
                                        // initialPosition uses the latitude and longitude from jobData state
                                        initialPosition={[jobData.latitude, jobData.longitude]}
                                        onLocationChange={handleLocationChange}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="d-flex justify-content-between">
                            <button type="button" className="btn btn-outline-secondary px-4" onClick={prevStep}>Back</button>
                            <button type="submit" className="btn btn-success px-4">Next: Review Summary</button>
                        </div>
                    </form>
                );
            case 5: // Summary & Post
                const cleanDescription = jobData.description.startsWith('[Style:') 
                    ? jobData.description.substring(jobData.description.indexOf(']') + 1).trim()
                    : jobData.description;

                return (
                    <div>
                        <h5 className="mb-4 text-dark">5. Review and Post Job (Summary)</h5>
                        <div className="row g-4 mb-4">
                            <div className="col-md-6">
                                <div className="card shadow-sm p-3 h-100 bg-light">
                                    <h6 className="fw-bold text-success">Basic & Salary</h6>
                                    <ul className="list-unstyled small mb-0">
                                        <li><span className="fw-medium">Title:</span> {jobData.jobTitle}</li>
                                        <li><span className="fw-medium">Type:</span> {jobData.employmentType}</li>
                                        <li><span className="fw-medium">Salary:</span> ₹{jobData.salary} ({jobData.salaryType})</li> 
                                    </ul>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card shadow-sm p-3 h-100 bg-light">
                                    <h6 className="fw-bold text-success">Location & Skills</h6>
                                    <ul className="list-unstyled small mb-0">
                                        <li><span className="fw-medium">Location:</span> {jobData.city}, {jobData.country}</li>
                                        <li><span className="fw-medium">Address:</span> {jobData.address}</li>
                                        <li><span className="fw-medium">Skills:</span> {jobData.skillRequirements || 'N/A'}</li>
                                        <li><span className="fw-medium">Tags:</span> {jobData.tags || 'N/A'}</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="card shadow-sm p-3 bg-white">
                                    <h6 className="fw-bold text-success">Description</h6>
                                    <p className="small mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                        {cleanDescription || 'No description provided.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between mt-4">
                            <button type="button" className="btn btn-outline-secondary px-4" onClick={prevStep}>Back to Location</button>
                            <button type="button" className="btn btn-success btn-lg px-5" onClick={handlePostJob} disabled={isSubmitting}>
                                {isSubmitting ? 'Posting...' : 'Post Job Now'}
                            </button>
                        </div>
                    </div>
                );
            default:
                return <p>Invalid step.</p>;
        }
    };

    return (
        <div className="card shadow-lg p-4 mb-5">
            <h3 className="card-title fw-bold text-success mb-4">New Job Posting Wizard</h3>
            <StepIndicator currentStep={step} labels={steps} />
            <div className="card-body">
                {renderStepContent()}
            </div>
        </div>
    );
};