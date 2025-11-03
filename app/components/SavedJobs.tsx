// src/app/components/SavedJobs.tsx

"use client";
import { FC, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore'; 
import { useAuth } from '@/app/page';
import { db } from '@/app/lib/firebase';

interface SavedJobDisplay {
    id: string; // ID of the savedJobs document (NOT the job posting ID)
    jobId: string; // ID of the actual job posting
    jobTitle: string;
    companyName: string;
    city: string;
    salary: number | string;
}

export const SavedJobs: FC = () => {
    const { user, db, setError, clearError } = useAuth();
    const [savedJobs, setSavedJobs] = useState<SavedJobDisplay[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSavedJobs = useCallback(() => {
        if (!user) return;
        setLoading(true);
        clearError();

        // Query the 'userSavedJobs' collection for items belonging to the current user
        const savedJobsRef = collection(db, 'userSavedJobs');
        const q = query(savedJobsRef, where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const jobs: SavedJobDisplay[] = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id, // Document ID in 'userSavedJobs'
                    jobId: data.jobId,
                    jobTitle: data.jobTitle || "Job Title Missing",
                    companyName: data.companyName || "N/A",
                    city: data.city || "N/A",
                    salary: data.salary || "N/A",
                };
            });
            setSavedJobs(jobs);
            setLoading(false);
        }, (error) => {
            setError("Failed to load saved jobs: " + (error as any).message, true);
            setLoading(false);
        });

        return unsubscribe;
    }, [user, setError, clearError]);

    useEffect(() => {
        const unsubscribe = fetchSavedJobs();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchSavedJobs]);

    // ✅ FIX: Handler to remove a job from the user's saved list
    const handleRemoveJob = async (savedJobDocId: string) => {
        if (!user || !confirm("Are you sure you want to remove this job from your saved list?")) return;
        
        clearError();
        try {
            // Delete the document from the user's savedJobs collection
            const docRef = doc(db, 'userSavedJobs', savedJobDocId);
            await deleteDoc(docRef);
            setError("Job successfully removed from saved list.", false);
        } catch (e) {
            setError("Failed to remove job. Please try again.", true);
        }
    };


    if (!user) return <p className="text-center py-5 text-danger">Please log in to view your saved jobs.</p>;
    if (loading) return <div className="text-center py-5"><i className="bi bi-arrow-clockwise animate-spin me-2"></i> Loading saved jobs...</div>;

    return (
        <div className="card shadow-lg p-4">
            <h4 className="text-dark fw-bold mb-4">Your Saved Jobs ({savedJobs.length})</h4>
            {savedJobs.length === 0 ? (
                <div className="alert alert-secondary">
                    You haven't saved any jobs yet. Start browsing in the Job Search section!
                </div>
            ) : (
                <div className="list-group">
                    {savedJobs.map(job => (
                        <div key={job.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="mb-1 fw-bold">{job.jobTitle} at {job.companyName}</h6>
                                <small className="text-muted">{job.city} &middot; ₹{job.salary}</small>
                            </div>
                            <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveJob(job.id)} // Pass the document ID
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedJobs;