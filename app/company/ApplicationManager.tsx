// src/app/company/ApplicationManager.tsx

"use client";
import { FC, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/app/page';
import { db } from '@/app/lib/firebase';

interface ApplicationDetail {
    id: string; // Document ID in jobApplications
    jobTitle: string;
    userId: string;
    userName: string; // Placeholder for seeker name (must be fetched/stored)
    appliedAt: Date | { seconds: number; nanoseconds: number };
    status: 'Submitted' | 'Reviewed' | 'Interview Scheduled' | 'Rejected' | 'Hired';
}

export const ApplicationManager: FC = () => { // Note: Exported as ApplicationManager
    const { user, db, setError, clearError } = useAuth();
    const [applications, setApplications] = useState<ApplicationDetail[]>([]);
    const [loading, setLoading] = useState(true);

    const applicationStatuses = ['Submitted', 'Reviewed', 'Interview Scheduled', 'Rejected', 'Hired'];

    // ... (Helper functions like getStatusClass and formatDate remain the same) ...

    // Fetch applications specific to this company
    const fetchApplications = useCallback(() => {
        if (!user) return;
        setLoading(true);
        clearError();

        try {
            const applicationsRef = collection(db, 'jobApplications');
            // ✅ COMPANY QUERY: Filter where companyId matches the logged-in company user's UID
            const q = query(
                applicationsRef,
                where('companyId', '==', user.uid),
                orderBy('appliedAt', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedApps: ApplicationDetail[] = snapshot.docs.map(d => {
                    const data = d.data();
                    // NOTE: Real implementation needs to fetch userName from the 'artifacts' collection
                    const seekerName = 'Job Seeker ' + d.data().userId.substring(0, 4); 
                    
                    return {
                        id: d.id,
                        jobTitle: data.jobTitle || 'N/A',
                        userId: data.userId,
                        userName: seekerName, 
                        status: data.status || 'Submitted',
                        appliedAt: data.appliedAt ? data.appliedAt.toDate() : new Date(),
                    } as ApplicationDetail;
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
    
    // ... (handleUpdateStatus and JSX render logic remains the same) ...

    // Note: The JSX for this component is long and is omitted here, 
    // but the critical fetching logic is correct.
    
    // ... (The render logic displays the table) ...
    return (
        <div className="card shadow-lg">
             {/* ... JSX for the table using applications array ... */}
        </div>
    );
};