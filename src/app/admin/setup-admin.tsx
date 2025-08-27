"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase-config";
import { doc, setDoc } from "firebase/firestore";

// Temporary page to set up admin user in Firestore
export default function SetupAdminPage() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const setupAdmin = async () => {
      if (user && isAdmin && user.email === "coco1@sample.com") {
        try {
          // Create admin-users document
          await setDoc(doc(db, "admin-users", user.uid), {
            email: user.email,
            role: "admin",
            createdAt: new Date(),
          });
          setStatus("Admin user document created successfully!");
        } catch (error) {
          console.error("Error creating admin document:", error);
          setStatus("Error creating admin document");
        }
      }
    };

    setupAdmin();
  }, [user, isAdmin]);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Not authorized</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Setup</h1>
        <p className="text-gray-400">{status || "Setting up admin access..."}</p>
        {status && (
          <a href="/admin" className="mt-4 inline-block text-blue-400 hover:underline">
            Go to Admin Dashboard
          </a>
        )}
      </div>
    </div>
  );
}
