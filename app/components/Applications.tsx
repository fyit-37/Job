// src/app/components/Applications.tsx

"use client";
import { FC, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; 
import { useAuth } from '@/app/page'; // To get the user and db instances
import { db } from '@/app/lib/firebase';

interface ApplicationData {
    id: string;
    jobTitle: string;
    companyName: string;
    status: string;
    appliedAt: Date | { seconds: number; nanoseconds: number }; // Firestore timestamp format
}

export const Applications: FC = () => {
    const { user, setError, clearError } = useAuth();
    const [applications, setApplications] = useState<ApplicationData[]>([]);
    const [loading, setLoading] = useState(true);

    const getStatusClass = (status: string) => {
        if (status.includes('Interview')) return 'bg-success';
        if (status.includes('Reviewed')) return 'bg-info';
        if (status.includes('Submitted')) return 'bg-primary';
        if (status.includes('Rejected')) return 'bg-danger';
        return 'bg-secondary';
    };

    const formatDate = (dateValue: ApplicationData['appliedAt']) => {
        if (dateValue instanceof Date) {
            return dateValue.toLocaleDateString();
        }
        if (typeof dateValue === 'object' && dateValue.seconds) {
            return new Date(dateValue.seconds * 1000).toLocaleDateString();
        }
        return 'N/A';
    };
    
    // --- Data Fetching Logic ---
    const fetchApplications = useCallback(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        clearError();

        try {
            // Query the 'jobApplications' collection where the userId matches the current user
            const applicationsRef = collection(db, 'jobApplications');
            const q = query(
                applicationsRef, 
                where('userId', '==', user.uid),
                orderBy('appliedAt', 'desc') // Show most recent applications first
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedApps: ApplicationData[] = snapshot.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        jobTitle: data.jobTitle || 'N/A',
                        companyName: data.companyName || 'N/A',
                        status: data.status || 'Submitted',
                        appliedAt: data.appliedAt ? data.appliedAt.toDate() : new Date(),
                    } as ApplicationData;
                });
                setApplications(fetchedApps);
                setLoading(false);
            }, (error) => {
                console.error("Firestore fetch error:", error);
                setError("Failed to load applications: " + (error as any).message, true);
                setLoading(false);
            });

            return unsubscribe;
        } catch (e) {
            setError("Error setting up application listener.", true);
            setLoading(false);
        }
    }, [user, setError, clearError]);

    useEffect(() => {
        const unsubscribe = fetchApplications();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchApplications]);


    if (!user) {
        return <p className="text-center py-5 text-danger">Please log in to view your job applications.</p>;
    }
    
    if (loading) {
        return <div className="text-center py-5"><i className="bi bi-arrow-clockwise animate-spin me-2"></i> Loading your application history...</div>;
    }

    return (
        <div className="card shadow-lg p-4">
            <h4 className="text-dark fw-bold mb-4">Your Job Applications ({applications.length})</h4>
            
            {applications.length === 0 ? (
                <div className="alert alert-info">
                    You haven't submitted any applications yet. Find jobs in the Job Search section!
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Job Title</th>
                                <th>Company</th>
                                <th>Date Applied</th>
                                <th>Status</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map(app => (
                                <tr key={app.id}>
                                    <td className="align-middle fw-bold">{app.jobTitle}</td>
                                    <td className="align-middle">{app.companyName}</td>
                                    <td className="align-middle small">{formatDate(app.appliedAt)}</td>
                                    <td className="align-middle">
                                        <span className={`badge ${getStatusClass(app.status)} text-white`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="align-middle">
                                        {/* This button would show a modal with application details */}
                                        <button className="btn btn-sm btn-outline-secondary">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Applications;