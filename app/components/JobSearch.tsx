// src/app/components/JobSearch.tsx

"use client";
import { FC, useState, useEffect, useCallback } from 'react';
// ✅ IMPORT addDoc for application submission
import { collection, query, onSnapshot, orderBy, where, getDocs, deleteDoc, doc, setDoc, addDoc } from 'firebase/firestore'; 
import { useAuth } from '@/app/page';
import { db } from '@/app/lib/firebase';

interface JobPost {
    id: string;
    jobTitle: string;
    companyName: string;
    employmentType: string;
    salary: number | string;
    salaryType: string;
    city: string;
    description: string;
    tags: string;
    companyId: string; // Ensure companyId is available for application record
    // Status flags are now determined by state within the component below
    isSaved: boolean; 
    isApplied: boolean;
}

// --- Job Card Component (Reusable) ---
interface JobCardProps {
    job: JobPost;
    onSave: (job: JobPost, isSaved: boolean) => void;
    onApply: (job: JobPost) => void; // Change to take the full job object
}

const JobCard: FC<JobCardProps> = ({ job, onSave, onApply }) => (
    <div className="card shadow-sm mb-3 transition-shadow duration-200 hover:shadow-md">
        <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <h5 className="card-title text-dark fw-bold mb-1">{job.jobTitle}</h5>
                    <p className="card-subtitle text-muted small mb-2">{job.companyName} &middot; {job.city}</p>
                    <p className="small mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                        {job.description.substring(0, 100).trim()}...
                    </p>
                </div>
                <div className="d-flex flex-column align-items-end gap-2">
                    <button 
                        className={`btn btn-sm ${job.isSaved ? 'btn-warning' : 'btn-outline-warning'}`} 
                        onClick={() => onSave(job, !job.isSaved)}
                    >
                        <i className={`bi ${job.isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}></i> 
                        {job.isSaved ? ' Saved' : ' Save'}
                    </button>
                    <button 
                        className={`btn btn-sm ${job.isApplied ? 'btn-secondary' : 'btn-primary'}`} 
                        onClick={() => onApply(job)} // Pass the full job object
                        disabled={job.isApplied}
                    >
                        {job.isApplied ? 'Applied' : 'Apply Now'}
                    </button>
                </div>
            </div>
            
            <div className="d-flex flex-wrap gap-2 mt-3">
                <span className="badge bg-info text-dark">{job.employmentType}</span>
                <span className="badge bg-success">₹{job.salary} / {job.salaryType}</span>
                {job.tags.split(',').slice(0, 3).map((tag, index) => (
                    tag.trim() && <span key={index} className="badge bg-light text-muted border">{tag.trim()}</span>
                ))}
            </div>
        </div>
    </div>
);


// --- Main JobSearch Component ---
export const JobSearch: FC = () => {
    const { user, db, setError, clearError } = useAuth();
    const [jobs, setJobs] = useState<JobPost[]>([]);
    const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
    // State to track applied jobs locally for immediate feedback
    const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set()); 
    const [loading, setLoading] = useState(true);

    // --- Fetch Job Postings and Status ---
    const fetchJobs = useCallback(() => {
        setLoading(true);
        clearError();
        if (!user) {
            setLoading(false);
            return;
        }

        const jobsCollectionRef = collection(db, 'jobPostings');
        const savedJobsCollectionRef = collection(db, 'userSavedJobs');
        const applicationsCollectionRef = collection(db, 'jobApplications'); // Ref for applications

        const unsubscribeJobs = onSnapshot(query(jobsCollectionRef, orderBy('createdAt', 'desc')), async (jobSnapshot) => {
            // 1. Get Saved Status
            const savedQuery = query(savedJobsCollectionRef, where('userId', '==', user.uid));
            const savedSnapshot = await getDocs(savedQuery);
            const currentSavedIds = new Set(savedSnapshot.docs.map(doc => doc.data().jobId));
            setSavedJobIds(currentSavedIds);

            // 2. Get Applied Status
            const appliedQuery = query(applicationsCollectionRef, where('userId', '==', user.uid));
            const appliedSnapshot = await getDocs(appliedQuery);
            const currentAppliedIds = new Set(appliedSnapshot.docs.map(doc => doc.data().jobId));
            setAppliedJobIds(currentAppliedIds);

            // 3. Map job postings, merging in both statuses
            const fetchedJobs: JobPost[] = jobSnapshot.docs.map(d => {
                const data = d.data();
                const jobId = d.id;
                return {
                    id: jobId,
                    ...data as Omit<JobPost, 'id' | 'isSaved' | 'isApplied'>,
                    isSaved: currentSavedIds.has(jobId), 
                    isApplied: currentAppliedIds.has(jobId), // Check applied status
                };
            });
            setJobs(fetchedJobs);
            setLoading(false);
        }, (error) => {
            console.error("Firestore fetch error:", error);
            setError("Failed to load jobs: " + (error as any).message);
            setLoading(false);
        });

        return () => unsubscribeJobs();
    }, [user, setError, clearError]);

    useEffect(() => {
        const unsubscribe = fetchJobs();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchJobs]);

    // --- Action Handlers ---
    
    // Handle Save/Unsave (Logic remains the same as it correctly interacts with Firestore)
    const handleSave = async (job: JobPost, isSaved: boolean) => {
        if (!user) {
            setError("Please log in to save jobs.", true);
            return;
        }
        clearError();
        const savedJobId = job.id;

        try {
            if (isSaved) {
                await setDoc(doc(db, 'userSavedJobs', `${user.uid}_${savedJobId}`), {
                    userId: user.uid,
                    jobId: savedJobId,
                    jobTitle: job.jobTitle,
                    companyName: job.companyName,
                    city: job.city,
                    salary: job.salary,
                    savedAt: new Date(),
                });
                // State update will happen automatically via onSnapshot listener, but we can optimistically update:
                setSavedJobIds(prev => new Set(prev).add(savedJobId));
                setError(`${job.jobTitle} saved successfully!`, false);
            } else {
                const savedDocRef = doc(db, 'userSavedJobs', `${user.uid}_${savedJobId}`);
                await deleteDoc(savedDocRef);
                
                setSavedJobIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(savedJobId);
                    return newSet;
                });
                setError(`${job.jobTitle} removed from saved list.`, false);
            }
        } catch (e) {
            console.error("Save/Unsave error:", e);
            setError(`Failed to ${isSaved ? 'save' : 'remove'} job.`, true);
        }
    };

    // ✅ FIX: Implement real application submission logic
    const handleApply = async (job: JobPost) => {
        if (!user) {
            setError("You must be logged in to apply.", true);
            return;
        }

        try {
            clearError();
            // 1. Submit application to Firestore
            await addDoc(collection(db, "jobApplications"), {
                userId: user.uid,
                jobId: job.id,
                jobTitle: job.jobTitle,
                companyName: job.companyName,
                // Ensure companyId is passed for reporting/filtering
                companyId: job.companyId, 
                appliedAt: new Date(),
                status: 'Submitted',
            });
            
            // 2. Update local UI state and show alert
            setAppliedJobIds(prev => new Set(prev).add(job.id));
            setError(`Application submitted for ${job.jobTitle}!`, false); 

        } catch (error) {
            console.error("Application error:", error);
            setError("Failed to submit application. Ensure permissions are set for jobApplications.", true);
        }
    };

    if (loading) return <div className="text-center py-5"><i className="bi bi-arrow-clockwise animate-spin me-2"></i> Loading job listings...</div>;

    return (
        <div className="row">
            <div className="col-lg-4">
                {/* Search/Filter Sidebar Placeholder */}
                <div className="card shadow-sm p-4 sticky-top" style={{ top: '20px' }}>
                    <h5 className="fw-bold">Job Filters</h5>
                    <p className="small text-muted">Filter by title, location, or salary.</p>
                    <input type="text" className="form-control mb-3" placeholder="Search Title/Company" />
                    <select className="form-select mb-3">
                        <option>Location (All)</option>
                        <option>Remote</option>
                    </select>
                    <button className="btn btn-primary">Apply Filters</button>
                </div>
            </div>
            
            <div className="col-lg-8">
                <h4 className="mb-4 text-muted">{jobs.length} Matching Jobs Found</h4>
                {jobs.length === 0 ? (
                    <div className="alert alert-info">No jobs posted yet.</div>
                ) : (
                    jobs.map(job => (
                        <JobCard 
                            key={job.id} 
                            // Pass status flags determined from state
                            job={{ ...job, isApplied: appliedJobIds.has(job.id), isSaved: savedJobIds.has(job.id) }} 
                            onSave={handleSave} 
                            onApply={handleApply}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default JobSearch;