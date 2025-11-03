// src/app/company/page.tsx

"use client";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore'; 
import React, { FC, useState, useEffect, useCallback } from 'react';

// NOTE: These are your required imports from the root page and firebase utils
import { useAuth, CustomAlert } from '@/app/page'; 
import { auth, db, googleProvider } from '@/app/lib/firebase'; 

// IMPORTANT: Import the new job posting components
import { CreateJobPosting } from './CreateJobPosting'; 
import { JobPostingManager } from './JobPostingManager'; 
import { ApplicationManager } from './ApplicationManager';

// --- Utility Functions for Company Data ---
/**
 * Creates initial company data in Firestore upon registration.
 */
const createInitialCompanyData = async (uid: string, companyName: string, email: string | null) => {
    const companyRef = doc(db, 'companies', uid);
    const defaultData = {
        companyName: companyName,
        email: email || 'N/A',
        uid: uid,
        contactName: 'N/A',
        website: 'N/A',
        jobPostings: 0,
        applicationsReceived: 0,
        candidatesHired: 0,
        activeSprints: 0,
        accountType: 'Company',
    };
    await setDoc(companyRef, defaultData, { merge: true });
};

// Fetches real company data from Firestore 'companies' collection
const getCompanyData = async (uid: string) => {
    const companyRef = doc(db, 'companies', uid);
    try {
        const docSnap = await getDoc(companyRef as any);
        if (docSnap.exists()) { 
            return docSnap.data() as any; 
        }
        // Fallback for new accounts
        return { companyName: auth.currentUser?.displayName || 'Company', jobPostings: 0, applicationsReceived: 0, candidatesHired: 0, activeSprints: 0 };
    } catch(e) {
        console.error("Error fetching company data:", e);
        return { companyName: 'Error Company', jobPostings: 0, applicationsReceived: 0, candidatesHired: 0, activeSprints: 0, };
    }
};

// ===============================================
// 1. COMPANY LOGIN CARD
// ===============================================

interface CompanyLoginCardProps {
    switchToRegister: () => void;
}

export const CompanyLoginCard: FC<CompanyLoginCardProps> = ({ switchToRegister }) => {
    const { auth, setError, clearError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setIsSubmitting(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setError('Company Login successful! Redirecting to Dashboard.', false);
        } catch (error) {
            setError(`Company login failed: ${(error as any).message || 'Invalid credentials'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        clearError();
        setIsSubmitting(true);
        try {
            await signInWithPopup(auth, googleProvider);
            setError('Successfully logged in with Google!', false);
        } catch (error) {
            setError('Google sign-in failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card shadow-xl p-4 p-md-5 transition-transform duration-300 hover:shadow-2xl hover:scale-[1.01]" style={{ maxWidth: '450px', width: '100%' }}>
            <div className="card-body text-center">
                <h2 className="card-title text-success fw-bold mb-1">Welcome Back (Company Portal)</h2>
                <p className="card-subtitle text-muted mb-4">Sign in to manage your job listings</p>
            
                <form onSubmit={handleLogin}>
                    <div className="mb-3 text-start">
                        <label htmlFor="companyLoginEmail" className="form-label">Email</label>
                        <input type="email" className="form-control" id="companyLoginEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@company.com" required />
                    </div>
                    <div className="mb-4 text-start">
                        <label htmlFor="companyLoginPassword" className="form-label">Password</label>
                        <input type="password" className="form-control" id="companyLoginPassword" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-success w-100 mb-3 transition-all duration-200 hover:opacity-90" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing In...' : 'Company Sign In'}
                    </button>
                </form>
                <p className="text-muted small my-3">OR CONTINUE WITH</p>
                <button
                    className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center mb-4 transition-all duration-200 hover:bg-gray-100"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                >
                    <i className="bi bi-google me-2"></i> Google
                </button>
                <p className="small text-muted mb-0">
                    Don't have a company account?
                    <a href="#" onClick={(e) => { e.preventDefault(); switchToRegister(); }} className="text-success fw-bold text-decoration-none hover:text-green-600 transition-colors">Register Company</a>
                </p>
            </div>
        </div>
    );
};

// ===============================================
// 2. COMPANY REGISTER CARD
// ===============================================

interface CompanyRegisterCardProps {
    switchToLogin: () => void;
}

export const CompanyRegisterCard: FC<CompanyRegisterCardProps> = ({ switchToLogin }) => {
    const { auth, setError, clearError } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setIsSubmitting(true);

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            setIsSubmitting(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setIsSubmitting(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: companyName }); 
            await createInitialCompanyData(user.uid, companyName, user.email);
            
            setError('Company Account created successfully! You are now logged in.', false);

        } catch (error) {
            setError(`Registration failed: ${(error as any).message || 'An unknown error occurred'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleGoogleRegister = async () => {
        clearError();
        setIsSubmitting(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            if (result.user) {
                const name = result.user.displayName || 'New Company';
                await createInitialCompanyData(result.user.uid, name, result.user.email);
                setError('Successfully registered and logged in with Google!', false);
            }
        } catch (error) {
            setError('Google sign-up failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card shadow-xl p-4 p-md-5 transition-transform duration-300 hover:shadow-2xl hover:scale-[1.01]" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-body text-center">
                <h2 className="card-title text-success fw-bold mb-1">Create Company Account</h2>
                <p className="card-subtitle text-muted mb-4">Post jobs and find candidates instantly</p>
               
                <form onSubmit={handleRegister}>
                    <div className="mb-3 text-start">
                        <label htmlFor="companyName" className="form-label">Company Name</label>
                        <input type="text" className="form-control" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    </div>
                    
                    <div className="mb-3 text-start">
                        <label htmlFor="companyRegisterEmail" className="form-label">Company Email</label>
                        <input type="email" className="form-control" id="companyRegisterEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@company.com" required />
                    </div>
       
                    <div className="mb-3 text-start">
                        <label htmlFor="companyRegisterPassword" className="form-label">Password</label>
                        <input type="password" className="form-control" id="companyRegisterPassword" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <small className="form-text text-muted">Password must be at least 8 characters.</small>
                    </div>
                    <div className="mb-4 text-start">
                        <label htmlFor="companyConfirmPassword" className="form-label">Confirm Password</label>
                        <input type="password" className="form-control" id="companyConfirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-success w-100 mb-3 transition-all duration-200 hover:opacity-90" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating Account...' : 'Register Company'}
                    </button>
                </form>
                <p className="text-muted small my-3">OR CONTINUE WITH</p>
                <button
                    className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center mb-4 transition-all duration-200 hover:bg-gray-100"
                    onClick={handleGoogleRegister}
                    disabled={isSubmitting}
                >
                    <i className="bi bi-google me-2"></i> Google
                </button>
                <p className="small text-muted mb-0">
                    Already have an account?
                    <a href="#" onClick={(e) => { e.preventDefault(); switchToLogin(); }} className="text-success fw-bold text-decoration-none hover:text-green-600 transition-colors">Sign In</a>
                </p>
            </div>
        </div>
    );
};

// ===============================================
// 3. COMPANY DASHBOARD
// ===============================================

const CompanyStatCard: FC<{ title: string, value: number, subtitle: string, iconClass: string }> = ({ title, value, subtitle, iconClass }) => (
    <div className={`col-md-3 mb-4`}>
        <div className="card shadow-md border-0 h-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <p className="card-text text-muted mb-1 small">{title}</p>
                        <h4 className="card-title fw-bold mb-0 text-dark">{value}</h4>
                    </div>
                    <div className={`p-2 rounded bg-success bg-opacity-10 text-success`}>
                        <i className={`${iconClass} fs-4 text-success`}></i>
                    </div>
                </div>
                <small className="text-muted mt-2 d-block">{subtitle}</small>
            </div>
        </div>
    </div>
);


export const CompanyDashboard: FC = () => {
    const { user, clearError, setError } = useAuth();
    const [companyData, setCompanyData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentMenu, setCurrentMenu] = useState('dashboard');

    // Load Company-specific data
    const loadCompanyData = useCallback(async () => {
        if (user) {
            setLoading(true);
            const data = await getCompanyData(user.uid);
            setCompanyData(data);
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) loadCompanyData();
    }, [user, loadCompanyData]);

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            localStorage.removeItem('activePortal'); // Fix for refresh issue
            clearError();
            setError('You have successfully signed out of the Company Portal.', false);
        } catch (err) {
            console.error("Logout failed:", err);
            setError("Failed to sign out. Please try again.");
        }
    };
    
    // --- Navigation Callbacks for Job Posting Success/Error ---
    const handleJobPostSuccess = () => {
        // ✅ FIX: Navigate back to the Job Postings list view
        setCurrentMenu('jobPostings'); 
        // 2. Reload data to reflect the new job posting count
        loadCompanyData();
    };

    const handleJobPostError = (message: string) => {
        // 1. Set the global error alert
        setError(message, true);
        // 2. Stay on the 'newJob' screen so the user can fix the form
    };
    // --- End Navigation Callbacks ---

    
    // --- Content Switcher (Renders CreateJobPosting on 'newJob') ---
    const renderContent = () => {
        switch (currentMenu) {
            case 'newJob':
                // Pass the success and error handlers to the wizard
                return (
                    <CreateJobPosting 
                        onPostSuccess={handleJobPostSuccess} 
                        onPostError={handleJobPostError}
                    />
                );
            case 'jobPostings':
                // RENDER THE JOB POSTING MANAGER
                return <JobPostingManager />;
                
            case 'candidates':
                return <ApplicationManager />;
            case 'settings':
                return (
                    <div className="p-5 text-center bg-white rounded-3 shadow-sm">
                        <i className="bi bi-gear-fill fs-1 text-success mb-3"></i>
                        <h1 className="text-dark">Company Settings</h1>
                        <p className="lead text-muted">Update company profile, branding, and billing details.</p>
                    </div>
                );
            default: // 'dashboard'
                if (loading) {
                    return <p className='text-center text-muted'>Loading company dashboard...</p>;
                }
                
                return (
                    <div className="row">
                        <CompanyStatCard
                            title="Active Postings"
                            value={companyData?.jobPostings || 0}
                            subtitle="Currently visible jobs"
                            iconClass="bi bi-briefcase"
                        />
                        <CompanyStatCard
                            title="Applications Received"
                            value={companyData?.applicationsReceived || 0}
                            subtitle="Total applications this month"
                            iconClass="bi bi-person-badge"
                        />
                        <CompanyStatCard
                            title="Candidates Hired"
                            value={companyData?.candidatesHired || 0}
                            subtitle="Hired in the last 90 days"
                            iconClass="bi bi-check2-circle"
                        />
                         <CompanyStatCard
                            title="Active Sprints/Projects"
                            value={companyData?.activeSprints || 0}
                            subtitle="Current internal projects"
                            iconClass="bi bi-card-checklist"
                        />
                        
                        {/* Link to Job Postings Manager */}
                        <div className="col-12 mt-4">
                            <div className="card shadow-lg">
                                <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 text-dark">Job Overview Summary</h5>
                                    <button className="btn btn-sm btn-success" onClick={() => setCurrentMenu('jobPostings')}>View All Postings</button>
                                </div>
                                <div className="card-body">
                                   <p className="text-muted mb-0">You have {companyData?.jobPostings || 0} active job listings. Review your pipeline and manage existing posts in the Job Postings section.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };
    
    // --- Sidebar for Company Dashboard (Simplified) ---
    const CompanySidebar: FC<{ currentMenu: string; setCurrentMenu: (menu: string) => void; userEmail: string | null; handleLogout: () => void; }> = ({ currentMenu, setCurrentMenu, userEmail, handleLogout }) => {
        const getInitials = (email: string | null): string => user?.displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || '?';
        const menuItems = [
            { key: 'dashboard', label: 'Dashboard', icon: <i className="bi bi-grid-fill me-2"></i> },
            { key: 'jobPostings', label: 'Job', icon: <i className="bi bi-briefcase-fill me-2"></i> }, // <-- List view
            { key: 'newJob', label: 'Post New Job', icon: <i className="bi bi-plus-circle-fill me-2"></i> }, // <-- Wizard view
            { key: 'candidates', label: 'Candidates', icon: <i className="bi bi-person-lines-fill me-2"></i> },
            { key: 'settings', label: 'Settings', icon: <i className="bi bi-gear-fill me-2"></i> },
        ];
        return (
            <div className="d-flex flex-column flex-shrink-0 p-3 text-dark bg-white shadow-md" style={{ width: '250px', borderRight: '1px solid #dee2e6' }}>
                <a href="#" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none text-dark">
                    <i className="bi bi-building-fill me-2 fs-4 text-success"></i>
                    <span className="fs-5 fw-bold text-dark">Company Portal</span>
                </a>
                <hr className="d-none d-md-block" />
                <ul className="nav nav-pills flex-column mb-auto">
                    {menuItems.map(item => (
                        <li key={item.key} className="nav-item">
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); setCurrentMenu(item.key); }}
                                className={`nav-link text-dark transition-all duration-150 hover:bg-gray-100 ${currentMenu === item.key ? 'active bg-success text-white shadow-sm' : ''}`}
                                aria-current={currentMenu === item.key ? 'page' : undefined}
                            >
                                {item.icon}
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
                <hr />
                <div className="dropdown">
                    <a href="#" className="d-flex align-items-center text-dark text-decoration-none dropdown-toggle" id="dropdownUser2" data-bs-toggle="dropdown" aria-expanded="false">
                        <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
                            {getInitials(userEmail)}
                        </div>
                        <strong className="text-truncate">{user?.displayName || 'Company User'}</strong>
                    </a>
                    <ul className="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdownUser2">
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setCurrentMenu('settings'); }}>Settings</a></li>
                        <li><hr className="dropdown-divider" /></li>
                        <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Sign out</a></li>
                    </ul>
                </div>
            </div>
        );
    };

    if (!user || user.isAnonymous) {
        return <p className='text-center text-muted'>Please log in to access the Company Dashboard.</p>;
    }


    return (
        <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            <CompanySidebar 
                currentMenu={currentMenu} 
                setCurrentMenu={setCurrentMenu} 
                userEmail={user.email} 
                handleLogout={handleLogout}
            />
            <main className="flex-grow-1 p-4 p-md-5">
                <h1 className="mb-4 text-dark fw-light text-capitalize">{companyData?.companyName || 'Company'} {currentMenu}</h1>
                {renderContent()}
            </main>
        </div>
    );
};