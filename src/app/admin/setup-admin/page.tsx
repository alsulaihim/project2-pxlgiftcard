"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase-config";
import { doc, setDoc } from "firebase/firestore";

// BUG FIX: [2025-01-27] - Admin user document setup page
// Problem: Admin rules check for admin-users collection but document doesn't exist
// Solution: Create a one-time setup page to create admin document
// Impact: Enables admin access to read all users/transactions
export default function SetupAdminPage() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupAdmin = async () => {
      if (!user) {
        setStatus("Not logged in");
        setLoading(false);
        return;
      }

      if (!isAdmin) {
        setStatus("Not authorized - must be logged in as admin user");
        setLoading(false);
        return;
      }

      try {
        // Create admin-users document
        await setDoc(doc(db, "admin-users", user.uid), {
          email: user.email,
          role: "admin",
          createdAt: new Date(),
        });
        setStatus("Admin user document created successfully!");
        setLoading(false);
      } catch (error) {
        console.error("Error creating admin document:", error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    setupAdmin();
  }, [user, isAdmin]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Setup</h1>
        {loading ? (
          <p className="text-gray-400">Setting up admin access...</p>
        ) : (
          <>
            <p className={`${status.includes('Error') || status.includes('Not') ? 'text-red-400' : 'text-green-400'} mb-4`}>
              {status}
            </p>
            {status.includes('successfully') && (
              <a 
                href="/admin" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Admin Dashboard →
              </a>
            )}
            {(status.includes('Not logged in') || status.includes('Not authorized')) && (
              <a 
                href="/auth/signin" 
                className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Sign In →
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
