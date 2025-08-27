// Admin layout with route protection
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, TrendingUp, Package, Shield, Settings } from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'PXL Config', href: '/admin/pxl-config', icon: TrendingUp },
  { name: 'Suppliers', href: '/admin/suppliers', icon: Package },
  { name: 'Security', href: '/admin/security', icon: Shield },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, platformUser, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-gray-950 border-r border-gray-900 min-h-[calc(100vh-65px)]">
          <div className="p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
        {/* Admin Content */}
        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
