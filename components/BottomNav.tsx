'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Ocultar en la página de login o admin
  if (pathname === '/login' || pathname === '/admin') {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        
        {/* Pestaña Partidos */}
        <Link href="/" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium">Partidos</span>
        </Link>

        {/* Pestaña Ranking */}
        <Link href="/ranking" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/ranking' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-medium">Ranking</span>
        </Link>

        {/* Botón Salir */}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px] font-medium">Salir</span>
        </button>

      </div>
    </div>
  );
}
