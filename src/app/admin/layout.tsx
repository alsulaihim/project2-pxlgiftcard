// Admin layout with route protection
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, platformUser, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-admin users
    if (!loading && (!user || !platformUser || !isAdmin)) {
      router.replace("/");
    }
  }, [user, platformUser, isAdmin, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  // Don't render anything if not admin
  if (!user || !platformUser || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Admin Header */}
      <div className="border-b border-gray-900 bg-gray-950/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Admin:</span>
              <span className="text-sm text-white">{platformUser.email}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Admin Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </div>
    </div>
  );
}
