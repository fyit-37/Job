"use client";
import { FC, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore'; 

// NOTE: Ensure these imports are correct based on your file structure
import { useAuth } from '@/app/page';
import { db } from '@/app/lib/firebase';

interface JobData {
    id: string;
    jobTitle: string;
    employmentType: string;
    salary: number | string;
    salaryType: string;
    city: string;
    createdAt: { seconds: number; nanoseconds: number } | Date;
}

export const JobPostingManager: FC = () => {
    const { user, setError, clearError } = useAuth();
    const [jobs, setJobs] = useState<JobData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditingId, setIsEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const companyId = user?.uid;

    const fetchJobs = useCallback(() => {
        if (!companyId) return;

        setLoading(true);
        clearError();

        try {
            // Query jobs where companyId matches the logged-in user's UID
            const jobsCollection = collection(db, 'jobPostings');
            const q = query(jobsCollection, where('companyId', '==', companyId));

            // Use onSnapshot for real-time updates
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedJobs: JobData[] = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data() as Omit<JobData, 'id'>
                }));
                
                // Sort by creation date in memory (avoiding orderBy for security rule simplicity)
                fetchedJobs.sort((a, b) => {
                    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt.seconds;
                    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt.seconds;
                    return dateB - dateA; // Newest first
                });
                
                setJobs(fetchedJobs);
                setLoading(false);
            }, (error) => {
                console.error("Firestore fetch error:", error);
                setError("Failed to load job postings: " + (error as any).message);
                setLoading(false);
            });

            return unsubscribe;
        } catch (e) {
            console.error("Setup error:", e);
            setError("Error setting up job listener.");
            setLoading(false);
        }
    }, [companyId, setError, clearError]);

    useEffect(() => {
        const unsubscribe = fetchJobs();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchJobs]);
    
    // --- Handlers ---

    const handleDelete = async (jobId: string) => {
        if (!confirm("Are you sure you want to delete this job posting?")) return;
        
        clearError();
        try {
            const jobRef = doc(db, 'jobPostings', jobId);
            await deleteDoc(jobRef);
            setError("Job posting deleted successfully.", false);
            
            // NOTE: Reloading company dashboard data to update job count would be ideal here,
            // but that's handled by the parent component (CompanyDashboard).
        } catch (e) {
            console.error("Delete error:", e);
            setError("Failed to delete job posting.");
        }
    };
    
    const handleStartEdit = (job: JobData) => {
        setIsEditingId(job.id);
        setEditTitle(job.jobTitle);
    };

    const handleUpdate = async () => {
        if (!isEditingId || !editTitle.trim()) {
            setError("Job title cannot be empty.");
            return;
        }

        clearError();
        try {
            const jobRef = doc(db, 'jobPostings', isEditingId);
            await updateDoc(jobRef, { jobTitle: editTitle });
            setError("Job title updated successfully.", false);
            setIsEditingId(null);
        } catch (e) {
            console.error("Update error:", e);
            setError("Failed to update job title.");
        }
    };

    const formatDate = (dateValue: JobData['createdAt']) => {
        if (dateValue instanceof Date) {
            return dateValue.toLocaleDateString();
        }
        if (typeof dateValue === 'object' && dateValue.seconds) {
            return new Date(dateValue.seconds * 1000).toLocaleDateString();
        }
        return 'N/A';
    };


    if (!user) return <p className="text-center text-danger">Authentication required to view postings.</p>;

    if (loading) return <p className="text-center text-muted">Loading your job postings...</p>;

    if (jobs.length === 0) {
        return (
            <div className="p-5 text-center bg-light rounded-3">
                <i className="bi bi-info-circle fs-1 text-muted mb-3"></i>
                <h3 className="text-dark">No Active Job Postings</h3>
                <p className="lead text-muted">Use the "Post New Job" link to start hiring!</p>
            </div>
        );
    }

    return (
        <div className="card shadow-lg">
            <div className="card-header bg-white py-3">
                <h4 className="mb-0 text-dark">Your Active Listings ({jobs.length})</h4>
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Job Title</th>
                                <th>Type</th>
                                <th>Location</th>
                                <th>Salary</th>
                                <th>Posted On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map(job => (
                                <tr key={job.id}>
                                    <td className="align-middle">
                                        {isEditingId === job.id ? (
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                            />
                                        ) : (
                                            <span className="fw-bold">{job.jobTitle}</span>
                                        )}
                                    </td>
                                    <td className="align-middle">{job.employmentType}</td>
                                    <td className="align-middle">{job.city}</td>
                                    <td className="align-middle">₹{job.salary} ({job.salaryType})</td>
                                    <td className="align-middle small">{formatDate(job.createdAt)}</td>
                                    <td className="align-middle d-flex gap-2">
                                        {isEditingId === job.id ? (
                                            <>
                                                <button className="btn btn-sm btn-success" onClick={handleUpdate}>Save</button>
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setIsEditingId(null)}>Cancel</button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn btn-sm btn-info text-white" onClick={() => handleStartEdit(job)}>
                                                    <i className="bi bi-pencil-square"></i> Update
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(job.id)}>
                                                    <i className="bi bi-trash"></i> Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};