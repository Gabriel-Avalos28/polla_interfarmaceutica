'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Usuario {
  id: string;
  auth_id: string;
  nombre: string;
  empresa: string;
  puntos_totales: number;
}

export default function RankingPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [miAuthId, setMiAuthId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      setMiAuthId(session.user.id);

      // Cargar ranking
      const { data: usuariosData, error } = await supabase
        .from('usuarios')
        .select('id, auth_id, nombre, empresa, puntos_totales')
        .order('puntos_totales', { ascending: false });

      if (usuariosData) {
        setUsuarios(usuariosData);
      } else {
        console.error('Error cargando ranking:', error);
      }
      
      setCargando(false);
    }
    
    init();
  }, [router]);

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 font-sans">
      {/* Encabezado */}
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-500 p-6 shadow-md rounded-b-3xl mb-6 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <img src="/mascota.jpg" alt="Mascota" className="absolute top-4 right-4 w-12 h-12 rounded-full border-2 border-white object-cover opacity-80" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <h1 className="font-extrabold text-2xl tracking-tight mt-2 drop-shadow-sm">Ranking Interfarmacéutico</h1>
        <p className="text-emerald-100 font-medium mt-1 text-sm">Polla Interfarmacéutica 2026</p>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-3">
        {usuarios.length === 0 ? (
          <p className="text-center text-slate-500 py-10">Aún no hay jugadores registrados.</p>
        ) : (
          usuarios.map((user, index) => {
            const esMio = user.auth_id === miAuthId;
            let estiloPosicion = "bg-white text-slate-700 shadow-sm border-slate-200";
            let trofeo = null;

            if (index === 0) {
              estiloPosicion = "bg-gradient-to-r from-yellow-200 to-yellow-400 shadow-lg border-yellow-500 scale-105 transform z-10 my-4";
              trofeo = "🥇";
            } else if (index === 1) {
              estiloPosicion = "bg-gradient-to-r from-slate-200 to-slate-300 shadow-md border-slate-400";
              trofeo = "🥈";
            } else if (index === 2) {
              estiloPosicion = "bg-gradient-to-r from-orange-200 to-orange-300 shadow-md border-orange-400";
              trofeo = "🥉";
            }

            let delayClass = "";
            if (index === 0) delayClass = "animate-fade-in-up";
            if (index === 1) delayClass = "animate-fade-in-up animation-delay-100";
            if (index === 2) delayClass = "animate-fade-in-up animation-delay-200";

            return (
              <div 
                key={user.id} 
                className={`flex items-center p-4 rounded-2xl border transition-all hover:scale-[1.01] ${estiloPosicion} ${esMio && index > 2 ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''} ${delayClass}`}
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-bold text-lg mr-4">
                  {trofeo ? (
                    <span className="text-2xl drop-shadow-sm">{trofeo}</span>
                  ) : (
                    <span className="text-slate-400">#{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${index < 3 ? 'text-slate-900' : 'text-slate-800'}`}>
                    {user.nombre} {esMio && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full ml-1 align-middle">TÚ</span>}
                  </h3>
                  <p className={`text-xs ${index < 3 ? 'text-slate-700' : 'text-slate-500'}`}>{user.empresa}</p>
                </div>
                
                <div className="flex flex-col items-end justify-center pl-2">
                  <span className={`text-2xl font-black ${index < 3 ? 'text-slate-900 drop-shadow-sm' : 'text-emerald-600'}`}>
                    {user.puntos_totales}
                  </span>
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${index < 3 ? 'text-slate-700' : 'text-slate-400'}`}>
                    PTS
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 mb-12 flex justify-center opacity-70">
        <img src="/logo.jpg" alt="M&P Eventos" className="h-10 mix-blend-multiply" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      </div>
    </main>
  );
}
