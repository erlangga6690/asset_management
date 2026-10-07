'use client';

import { Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import "./globals.css";
import SidebarLayout from "@/components/SidebarLayout";
import { AuthProvider, useAuth } from '@/context/AuthContext';

const inter = Inter({ subsets: ["latin"] });

// List of public routes that don't require auth
const publicRoutes = ['/login', '/register'];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading) {
      if (!token && !isPublic) {
        router.push('/login');
      } else if (token && isPublic) {
        router.push('/');
      }
    }
  }, [loading, token, isPublic, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Public routes — render without sidebar
  if (isPublic) return <>{children}</>;

  // Authenticated — render with sidebar
  return <SidebarLayout>{children}</SidebarLayout>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}>
            <AuthGate>{children}</AuthGate>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
