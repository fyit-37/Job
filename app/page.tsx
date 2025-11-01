// src/app/page.tsx

"use client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously, // Keeping for other potential uses, but logic removed
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import React, { createContext, FC, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// ===============================================
// 1. FIREBASE & UTILITY IMPORTS
// ===============================================
import { auth, db, googleProvider, createInitialUserData } from '@/app/lib/firebase';
import Profile from '@/app/components/Profile'; // Import the new Profile component
import ResumeBuilder from '@/app/components/Resume';
// ===============================================
// 2. AUTH CONTEXT
// ===============================================

// --- Type Definitions ---
interface AuthContextType {
    user: User | null;
    auth: typeof auth;
    db: typeof db;
    loading: boolean;
    error: string | null;
    setError: (message: string, isError?: boolean) => void;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

// src/app/page.tsx (AuthProvider Component)

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
    // State managed by the AuthProvider
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setErrorState] = useState<string | null>(null);

    const setError = useCallback((message: string, isError: boolean = true) => {
        if (isError) {
            console.warn(message); 
        } else {
            console.log(message);
        }
        setErrorState(message);
        if (!isError) {
            setTimeout(() => setErrorState(null), 5000);
        }
    }, []);

    const clearError = useCallback(() => {
        setErrorState(null);
    }, []);
    
    // --- THIS IS THE CORRECTED AUTHENTICATION LOGIC BLOCK ---
    useEffect(() => {
        const initialSignIn = async () => {
            try {
                // Check for custom token, relying on onAuthStateChanged otherwise.
                const initialAuthToken = (window as any).__initial_auth_token;
                if (typeof initialAuthToken !== 'undefined' && initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                }
                // ANONYMOUS SIGN-IN remains removed.
            } catch (err) {
                console.error("Initial sign-in failed. Relying on manual login.", err);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        if(loading) initialSignIn();
        return () => unsubscribe();
    }, [loading]); // Only dependent on 'loading' state

    // --- END AUTHENTICATION LOGIC BLOCK ---

    const contextValue: AuthContextType = {
        user,
        auth,
        db,
        loading,
        error,
        setError,
        clearError,
    };
    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};


// ===============================================
// 3. SHARED CUSTOM ALERT
// ===============================================
export const CustomAlert: FC<{ message: string, onClose: () => void, isError: boolean }> = ({ message, onClose, isError }) => (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-50 transition-all duration-500 transform ${isError ? 'bg-red-600' : 'bg-green-600'}`}>
        <div className="flex justify-between items-center">
            <span>{isError ? 'Error: ' : 'Success: '}{message}</span>
            <button onClick={onClose} className="ml-4 font-bold">×</button>
        </div>
    </div>
);


// ===============================================
// 4. LOGIN CARD
// ===============================================

interface LoginCardProps {
    switchToRegister: () => void;
}

export const LoginCard: FC<LoginCardProps> = ({ switchToRegister }) => {
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
            setError('Login successful! Redirecting to Dashboard.', false);
        } catch (error) {
            console.error('Login Error:', error);
            setError(`Login failed: ${(error as any).message || 'Invalid credentials'}`);
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
            console.error('Google Login Error:', error);
            setError('Google sign-in failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card shadow-xl p-4 p-md-5 transition-transform duration-300 hover:shadow-2xl hover:scale-[1.01]" style={{ maxWidth: '450px', width: '100%' }}>
            <div className="card-body text-center">
                <h2 className="card-title text-primary fw-bold mb-1">Welcome Back</h2>
                <p className="card-subtitle text-muted mb-4">Sign in to continue your job search</p>
            
                <form onSubmit={handleLogin}>
                    <div className="mb-3 text-start">
                        <label htmlFor="loginEmail" className="form-label">Email</label>
                        <input type="email" className="form-control" id="loginEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
                    </div>
                    <div className="mb-4 text-start">
                        <label htmlFor="loginPassword" className="form-label">Password</label>
                        <input type="password" className="form-control" id="loginPassword" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 mb-3 transition-all duration-200 hover:opacity-90" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
                <p className="text-muted small my-3">OR CONTINUE WITH</p>
                <button
                    className="btn btn-outline-secondary w-100 
d-flex align-items-center justify-content-center mb-4 transition-all duration-200 hover:bg-gray-100"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                >
                    <i className="bi bi-google me-2"></i> Google
                </button>
                <p className="small text-muted mb-0">
                    Don't have an account?
                    <a href="#" onClick={(e) => { e.preventDefault(); switchToRegister(); }} className="text-primary fw-bold text-decoration-none hover:text-indigo-600 transition-colors">Sign Up</a>
                </p>
            </div>
        </div>
    );
};


// ===============================================
// 5. REGISTER CARD
// ===============================================

interface RegisterCardProps {
    switchToLogin: () => void;
}

export const RegisterCard: FC<RegisterCardProps> = ({ switchToLogin }) => {
    const { auth, setError, clearError } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
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
            const displayName = `${firstName} ${lastName}`;

            await updateProfile(user, { displayName });
            await createInitialUserData(user.uid, displayName, user.email);
            setError('Account created successfully! You are now logged in.', false);

        } catch (error) {
            console.error('Registration Error:', error);
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
                await createInitialUserData(result.user.uid, result.user.displayName, result.user.email);
                setError('Successfully registered and logged in with Google!', false);
            }
        } catch (error) {
            console.error('Google Registration Error:', error);
            setError('Google sign-up failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card shadow-xl p-4 p-md-5 transition-transform duration-300 hover:shadow-2xl hover:scale-[1.01]" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-body text-center">
                <h2 className="card-title text-primary fw-bold mb-1">Create an Account</h2>
                <p className="card-subtitle text-muted mb-4">Enter your details below to get started</p>
           
                <form onSubmit={handleRegister}>
                    <div className="row mb-3">
                        <div className="col-md-6 text-start">
                            <label htmlFor="firstName" className="form-label">First Name</label>
                            <input type="text" className="form-control" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        </div>
                        <div className="col-md-6 text-start">
                            <label htmlFor="lastName" className="form-label">Last Name</label>
                            <input type="text" className="form-control" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                        </div>
                    </div>
                
                    <div className="mb-3 text-start">
                        <label htmlFor="mobileNumber" className="form-label">Mobile Number</label>
                        <input type="tel" className="form-control" id="mobileNumber" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="e.g., 1234567890" />
                    </div>
         
                    <div className="mb-3 text-start">
                        <label htmlFor="registerEmail" className="form-label">Email</label>
                        <input type="email" className="form-control" id="registerEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
                    </div>
       
                    <div className="mb-3 text-start">
                        <label htmlFor="registerPassword" className="form-label">Password</label>
                        <input type="password" className="form-control" id="registerPassword" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <small className="form-text text-muted">Password must be at least 8 characters.</small>
                    </div>
                    <div className="mb-4 text-start">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                        <input 
                            type="password" className="form-control" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 mb-3 transition-all duration-200 hover:opacity-90" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                <p className="text-muted small my-3">OR CONTINUE WITH</p>
                <button
                    className="btn btn-outline-secondary w-100 
d-flex align-items-center justify-content-center mb-4 transition-all duration-200 hover:bg-gray-100"
                    onClick={handleGoogleRegister}
                    disabled={isSubmitting}
                >
                    <i className="bi bi-google me-2"></i> Google
                </button>
                <p className="small text-muted mb-0">
                    Already have an account?
                    <a href="#" onClick={(e) => { e.preventDefault(); switchToLogin(); }} className="text-primary fw-bold text-decoration-none hover:text-indigo-600 transition-colors">Sign In</a>
                </p>
            </div>
        </div>
    );
};


// ===============================================
// 6. DASHBOARD
// ===============================================

// DUMMY IMPLEMENTATIONS for external functions
const API_KEY = 'DUMMY_API_KEY';
// --- Type Definitions for Dashboard Data ---
interface DashboardJobData {
    jobsApplied: number;
    savedJobs: number;
    interviews: number;
    newMatches: number;
    displayName: string;
    email: string;
    userId: string;
    phone: string;
    location: string;
}

const getInitialUserData = async (uid: string): Promise<DashboardJobData | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';
    const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'data', 'profile');
    try {
        const docSnap = await getDoc(profileRef as any);
        if (docSnap.exists()) {
             // Type casting for robust data access
             const data = docSnap.data() as DashboardJobData & { jobData: Omit<DashboardJobData, 'displayName' | 'email' | 'userId' | 'phone' | 'location'> };
             return { ...data, ...data.jobData } as DashboardJobData;
        } else {
             // Create initial data if not found
             const defaultData: DashboardJobData = {
                jobsApplied: 12, savedJobs: 5, interviews: 2, newMatches: 8,
                displayName: auth.currentUser?.displayName || 'Job Seeker',
                email: auth.currentUser?.email || 'N/A',
                userId: uid, phone: '123-456-7890', location: 'San Francisco, CA',
            };
            await createInitialUserData(uid, defaultData.displayName, defaultData.email);
            return defaultData;
        }
    } catch (e) {
         console.error("Error fetching or creating profile data:", e);
         return {
            jobsApplied: 0, savedJobs: 0, interviews: 0, newMatches: 0,
            displayName: 'Error User', email: 'error@example.com', userId: uid,
            phone: 'N/A', location: 'N/A',
         }
    }
};

const fetchWithRetry = async (url: string, options: any) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
        json: async () => ({
            candidates: [{ content: { parts: [{ text: "Based on your current activity, focus on refining your interview technique. With 2 interviews out of 12 applications, your resume is working, but the conversion rate is low. Consider running mock interviews for the specific roles you're applying for." }] } }]
        })
    };
};


// --- Component: StatCard (Embedded) ---
interface StatCardProps {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ReactNode; 
    colorClass: string;
}

const StatCard: FC<StatCardProps> = ({ title, value, subtitle, icon, colorClass }) => (
    <div className={`col-md-3 mb-4`}>
        <div className="card shadow-md border-0 h-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <p className="card-text text-muted mb-1 small">{title}</p>
                        <h4 className="card-title fw-bold mb-0 text-dark">{value}</h4>
                    </div>
                    <div className={`p-2 rounded ${colorClass}`}>
                        {icon}
                    </div>
                </div>
                <small className="text-muted mt-2 d-block">{subtitle}</small>
            </div>
        </div>
    </div>
);

// --- Component: Sidebar (Embedded) ---
interface SidebarProps {
    currentMenu: string;
    setCurrentMenu: (menu: string) => void;
    userEmail: string | null;
    handleLogout: () => void;
}

const Sidebar: FC<SidebarProps> = ({ currentMenu, setCurrentMenu, userEmail, handleLogout }) => {

    const getInitials = (email: string | null): string => {
        if (!email) return '?';
        // 🐛 NOTE: Changed to safely access the first character
        return email.length > 0 ? email[0].toUpperCase() : '?'; 
    };

    const menuItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <i className="bi bi-grid-fill me-2"></i> },
        { key: 'jobSearch', label: 'Job Search', icon: <i className="bi bi-search me-2"></i> },
        { key: 'mapView', label: 'Map View', icon: <i className="bi bi-geo-alt-fill me-2"></i> },
        { key: 'savedJobs', label: 'Saved Jobs', icon: <i className="bi bi-bookmark-fill me-2"></i> },
        { key: 'applications', label: 'Applications', icon: <i className="bi bi-file-earmark-text-fill me-2"></i> },
        { key: 'profile', label: 'Profile', icon: <i className="bi bi-person-circle me-2"></i> },
        { key: 'resume', label: 'Resume', icon: <i className="bi bi-file-earmark-person me-2"></i> }, 
    ];
    return (
        <div className="d-flex flex-column flex-shrink-0 p-3 text-dark bg-white shadow-md" style={{ width: '250px', borderRight: '1px solid #dee2e6' }}>
            <a href="#" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none text-dark">
                <i className="bi bi-briefcase-fill me-2 fs-4 text-primary"></i>
                <span className="fs-5 fw-bold text-dark">JobMap</span>
            </a>
    
            <hr className="d-none d-md-block" />
            <ul className="nav nav-pills flex-column mb-auto">
                {menuItems.map(item => (
                    <li key={item.key} className="nav-item">
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); setCurrentMenu(item.key); }}
                            className={`nav-link text-dark transition-all duration-150 hover:bg-gray-100 ${currentMenu === item.key ? 'active bg-primary text-white shadow-sm' : ''}`}
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
                <a href="#" className="d-flex align-items-center 
text-dark text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
                        {getInitials(userEmail)}
                    </div>
                  
                    <strong className="text-truncate">{userEmail || 'Guest'}</strong>
                </a>
                <ul className="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdownUser1">
                    <li><a className="dropdown-item" href="Profile.tsx" onClick={(e) => { e.preventDefault();
setCurrentMenu('profile'); }}>Profile</a></li>
                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault();
setCurrentMenu('settings'); }}>Settings</a></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault();
handleLogout(); }}>Sign out</a></li>
                </ul>
            </div>
        </div>
    );
};

export const Dashboard: FC = () => {
    const { auth, user, db, clearError, setError } = useAuth();
    const [currentMenu, setCurrentMenu] = useState('dashboard');
    const [jobData, setJobData] = useState<DashboardJobData | null>(null);
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [geminiRecommendation, setGeminiRecommendation] = useState('');
    const [prompt, setPrompt] = useState('');
    const [editableProfile, setEditableProfile] = useState<{ displayName: string, phone: string, location: string }>({
        displayName: '', phone: '', location: ''
    });

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            clearError();
            setError('You have successfully signed out.', false);
        } catch (err) {
            console.error("Logout failed:", err);
            setError("Failed to sign out. Please try again.");
        }
    };

    const loadUserData = useCallback(async () => {
        if (user) {
            const data = await getInitialUserData(user.uid);
            if (data) {
                setJobData(data);
                setEditableProfile({
                    displayName: data.displayName,
                    phone: data.phone,
                    location: data.location,
                });
            }
        }
    }, [user, setError]);

    useEffect(() => {
        if(user && !user.isAnonymous) loadUserData();
    }, [user, loadUserData]);

    const handleGeminiQuery = async () => {
        // ... (Gemini logic remains the same)
        if (!prompt.trim() || !jobData) return;

        setGeminiLoading(true);
        setGeminiRecommendation('');

        const GEMINI_MODEL = "gemini-2.5-flash-preview-05-20";
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

        const systemPrompt = "You are a friendly, professional career and job search assistant. Provide concise, actionable advice or information based on the user's query and their job application statistics. Do not use markdown headers (#).";
        const userQuery = `My current job application stats are: Jobs Applied: ${jobData.jobsApplied}, Saved Jobs: ${jobData.savedJobs}, Interviews: ${jobData.interviews}, New Matches: ${jobData.newMatches}.
My specific query is: "${prompt}".`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };
        try {
            const response = await fetchWithRetry(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a recommendation right now.";
            setGeminiRecommendation(text);
        } catch (error) {
            console.error('Gemini API call failed:', error);
            setGeminiRecommendation("Failed to connect to the assistant. Please check your network or try again.");
        } finally {
            setGeminiLoading(false);
        }
    };


    const renderDashboardContent = () => (
        <div className="row">
            {/* ... (StatCard and Chart JSX remains the same) */}
            {jobData && (
                <>
                    <StatCard
                        title="Jobs Applied"
                        value={jobData.jobsApplied}
                        subtitle={`${jobData.jobsApplied} submitted this week`}
                        icon={<i className="bi bi-file-earmark-check-fill fs-4 text-primary"></i>}
                        colorClass="bg-primary bg-opacity-10 text-primary"
                    />
                    <StatCard
                        title="Saved Jobs"
                        value={jobData.savedJobs}
                        subtitle={`${jobData.savedJobs} new this week`}
                        icon={<i className="bi bi-bookmark-heart-fill fs-4 text-warning"></i>}
                        colorClass="bg-warning bg-opacity-10 text-warning"
                    />
                    <StatCard
                        title="Interviews"
                        value={jobData.interviews}
                        subtitle={`${jobData.interviews} upcoming this week`}
                        icon={<i className="bi bi-calendar-event-fill fs-4 text-success"></i>}
                        colorClass="bg-success bg-opacity-10 text-success"
                    />
                    <StatCard
                        title="New Matches"
                        value={jobData.newMatches}
                        subtitle={`${jobData.newMatches} based on your profile`}
                        icon={<i className="bi bi-lightning-fill fs-4 text-info"></i>}
                        colorClass="bg-info bg-opacity-10 text-info"
                    />
                </>
            )}

            {/* Application Progress Chart (Mock Data Visualization) */}
            <div 
                className="col-md-6 mb-4">
                <div className="card shadow-lg h-100">
                    <div className="card-header bg-white border-0 py-3">
                        <h5 className="mb-0 text-dark">Application Funnel Progress</h5>
                        <p className="card-subtitle text-muted small">Visualizing movement through your hiring pipeline.</p>
                    </div>
                    <div className="card-body">
                        <div className="mb-4">
                            <h6 className="small text-muted mb-1">Applied (12)</h6>
                            <div className="progress" style={{ height: '10px' }}>
                                <div 
                                    className="progress-bar bg-primary" role="progressbar" style={{ width: '100%' }} aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                        </div>
                        <div className="mb-4">
                            <h6 className="small text-muted mb-1">Screening (5)</h6>
                            <div className="progress" style={{ height: '10px' }}>
                                <div className="progress-bar bg-warning" role="progressbar" style={{ width: '40%' }} aria-valuenow={40} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                        </div>
                        <div className="mb-4">
                            <h6 className="small text-muted mb-1">Interview (2)</h6>
                            <div className="progress" style={{ height: '10px' }}>
                                <div className="progress-bar bg-success" role="progressbar" style={{ width: '16%' }} aria-valuenow={16} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                        </div>
                        <div className="mb-4">
                            <h6 className="small text-muted mb-1">Offer (0)</h6>
                            <div className="progress" style={{ height: '10px' }}>
                                <div className="progress-bar bg-danger" role="progressbar" style={{ width: '0%' }} aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Search Map Placeholder */}
            <div className="col-md-6 mb-4">
                <div className="card shadow-lg h-100">
                    <div className="card-header bg-white border-0 py-3">
                        <h5 className="mb-0 text-dark">Local Job Market Overview</h5>
                        <p className="card-subtitle text-muted small">Concentration of relevant jobs in your area.</p>
                    </div>
                    <div className="card-body p-4" style={{ minHeight: '300px' }}>
                        <div className="bg-gray-100 rounded p-4 h-100 d-flex flex-column align-items-center justify-content-center border border-dashed border-gray-300">
                            <i className="bi bi-pin-map-fill fs-1 text-secondary opacity-75 mb-3"></i>
                            <p className="fw-bold mb-1">Interactive Map Rendering Disabled</p>
                            <p className="small text-muted text-center">Pinpointing 48 new job locations near Mock City, CA.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="col-md-4">
                {/* Recommended Jobs */}
                <div className="card shadow-lg h-100">
                    <div className="card-header bg-white border-0 py-3">
                        <h5 className="mb-0 text-dark">Top Job Matches</h5>
                        <p className="card-subtitle text-muted small">Based on your profile and activity.</p>
                    </div>
                    <ul className="list-group list-group-flush">
                        {[
                            { title: 'Senior Frontend Developer', company: 'Acme Inc.', location: 'San Francisco, CA', remote: true, salary: '140k' },
                            { title: 'UX/UI Designer', company: 'Stark Industries', location: 'New York, NY', remote: false, salary: '110k' },
                            { title: 'Product Manager', company: 'Wayne Enterprises', location: 'Remote', remote: true, salary: '160k' },
                            { title: 'Data Scientist', company: 'Cyberdyne Systems', location: 'Austin, TX', remote: false, salary: '135k' },
                        ].map((job, index) => (
                            <li key={index} className="list-group-item d-flex align-items-center justify-content-between 
transition-colors duration-150 hover:bg-gray-50 cursor-pointer p-3">
                                <div className="d-flex align-items-start">
                                    <div className="bg-gray-200 text-dark rounded-full d-flex align-items-center justify-content-center me-3 fs-6 fw-bold" style={{ width: '40px', height: '40px' }}>
                                        {job.company[0]}
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold text-dark">{job.title}</h6>
                                        <p className="small text-muted mb-1">{job.company} &middot;
{job.location}</p>
                                        <div className="d-flex flex-wrap gap-1">
                                            <span className={`badge text-white ${job.remote ? 'bg-success' : 'bg-secondary'}`}>{job.remote ? 'Remote' : 'On-Site'}</span>
                                            <span className="badge bg-info text-white">${job.salary}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-outline-primary" onClick={(e) => { 
e.stopPropagation(); alert(`Applying for ${job.title}`); }}>Apply</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
            {/* AI Assistant (Gemini) Panel */}
            <div className="col-md-8">
                <div className="card shadow-lg h-100">
                    <div className="card-header bg-white border-0 py-3">
                        <h5 className="mb-0 text-dark">AI Career Assistant (Gemini)</h5>
                        <p className="card-subtitle text-muted small">Get personalized advice based on your current job metrics.</p>
                    </div>
                    <div className="card-body d-flex flex-column">
                        <div className="alert alert-secondary mb-3">
                            <p className="fw-bold mb-1 d-flex align-items-center"><i className="bi bi-robot me-2"></i> Gemini's Advice:</p>
                            {geminiLoading ?
                                (
                                <p className="text-center text-muted"><i className="bi bi-arrow-clockwise animate-spin me-2"></i> Generating recommendation...</p>
                            ) : (
                                <p className="mb-0 small">{geminiRecommendation || "Ask a question about your job search strategy, e.g., 'What roles should I prioritize based on my experience?'"}</p>
                            )}
                        </div>
                        <div 
                            className="mt-auto">
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Ask your career question..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleGeminiQuery();
                                    }}
                                    disabled={geminiLoading}
                                />
                                <button className="btn btn-primary" type="button" onClick={handleGeminiQuery} disabled={geminiLoading}>
                                    Ask <i className="bi bi-send-fill ms-1"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


    const renderContent = () => {
        switch (currentMenu) {
            case 'dashboard':
                return jobData ? renderDashboardContent() : <p className='text-center text-muted'>Loading dashboard data...</p>;
            case 'profile':
                return <Profile />;
            case 'resume':
                return <ResumeBuilder />;
                return (
                    <div className="p-5 text-center bg-light rounded-3">
                        <i className="bi bi-file-earmark-person-fill fs-1 text-secondary mb-3"></i>
                        <h1 className="text-dark">Resume Builder / Viewer</h1>
                        <p className="lead text-muted">This feature is under development.</p>
                    </div>
                );
            default:
                return (
                    <div className="p-5 text-center bg-light rounded-3">
                        <i className="bi bi-tools fs-1 text-secondary mb-3"></i>
                        <h1 className="text-dark">Content for {currentMenu}</h1>
                        <p className="lead text-muted">This area is under construction.</p>
                    </div>
                );
        }
    };

    if (!user || user.isAnonymous) {
        return <AuthComponent />;
    }

    return (
        <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            <Sidebar 
                currentMenu={currentMenu} 
                setCurrentMenu={setCurrentMenu} 
                userEmail={user.email} 
                handleLogout={handleLogout}
            />
            <main className="flex-grow-1 p-4 p-md-5">
                <h1 className="mb-4 text-dark fw-light text-capitalize">{currentMenu} Overview</h1>
                {renderContent()}
            </main>
        </div>
    );
};


// ===============================================
// 7. AUTH COMPONENT (The wrapper for Login/Register)
// ===============================================

const AuthComponent: FC = () => {
  const { user, loading, error, clearError } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Authenticating user...</p>
        </div>
      </div>
    );
  }
  
  // ✅ FIX: Only allow non-anonymous users to proceed to the Dashboard
  if (user && !user.isAnonymous) {
    return <Dashboard />;
  }

  return (
    <>
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#e9ecef' }}>
        <div className="text-center p-3 p-md-5">
          {authView === 'login' ? (
            <LoginCard switchToRegister={() => setAuthView('register')} />
          ) : (
            <RegisterCard switchToLogin={() => setAuthView('login')} />
          )}
        </div>
      </div>
      {error && <CustomAlert 
        message={error} 
        onClose={clearError} 
        isError={error.includes("Error:") || error.includes("failed") || error.includes("Invalid credentials")} 
      />}
    </>
  );
};


// ===============================================
// 8. FINAL APP ROOT & EXPORTED TYPES 
// ===============================================
const FinalApp: FC = () => (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
        
        <AuthProvider>
            <AuthComponent />
        </AuthProvider>
    </div>
);
export default FinalApp;

// EXPORTED INTERFACES (Needed for Profile.tsx)
export interface SocialLinks {
  linkedin: string;
  facebook: string;
  instagram: string;
}
export interface Experience {
  id: number;
  title: string;
  company: string;
  dates: string;
}
export interface Education {
  id: number;
  school: string;
  degree: string;
  dates: string;
}
export interface Skill {
  id: number;
  name: string;
}
export interface Project {
  id: number;
  title: string;
  description: string;
}
export interface ProfileData {
  name: string;
  headline: string;
  location: string;
  about: string;
  profileImageUrl: string;
  coverImageUrl: string;
  socialLinks: SocialLinks;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
}

// DUMMY IMPLEMENTATION FOR IMAGE GENERATORS 
const generateProfilePic = (name: string | null | undefined): string => {
    if (!name) return "https://via.placeholder.com/128/9CA3AF/FFF?text=Profile";
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return `https://via.placeholder.com/128/9CA3AF/FFF?text=${initials}`;
}
const generateCoverPhoto = (name: string | null | undefined): string => {
    if (!name) return "https://via.placeholder.com/1000x200/D1D5DB/FFF?text=Cover+Photo";
    return `https://via.placeholder.com/1000x200/D1D5DB/FFF?text=Cover+Photo`;
}

function setJobData(data: DashboardJobData) {
    throw new Error('Function not implemented.');
}


function setEditableProfile(arg0: {}) {
    throw new Error('Function not implemented.');
}


function initialSignIn() {
    throw new Error('Function not implemented.');
}
