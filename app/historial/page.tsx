'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface HistorialItem {
  goles_local_pred: number;
  goles_vis_pred: number;
  puntos_obtenidos: number;
  partidos: {
    equipo_local: string;
    equipo_vis: string;
    goles_local_real: number;
    goles_vis_real: number;
    partido_finalizado: boolean;
  };
}

export default function Historial() {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function cargarHistorial() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Obtener el ID interno del usuario
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();

      if (!userData) {
        setCargando(false);
        return;
      }

      // Obtener predicciones cruzadas con los partidos
      const { data, error } = await supabase
        .from('predicciones')
        .select(`
          goles_local_pred,
          goles_vis_pred,
          puntos_obtenidos,
          partidos (
            equipo_local,
            equipo_vis,
            goles_local_real,
            goles_vis_real,
            partido_finalizado
          )
        `)
        .eq('usuario_id', userData.id);

      if (data) {
        // Filtrar solo los partidos que ya terminaron (manejando posible array)
        const jugados = data.map((item: any) => {
          const partidoInfo = Array.isArray(item.partidos) ? item.partidos[0] : item.partidos;
          return {
            ...item,
            partidos: partidoInfo
          };
        }).filter((item: any) => item.partidos?.partido_finalizado === true);
        
        // Ordenar por puntos (los de 3 arriba, luego 1, luego 0) para que sea más emocionante
        jugados.sort((a, b) => (b.puntos_obtenidos || 0) - (a.puntos_obtenidos || 0));
        
        setHistorial(jugados as HistorialItem[]);
      }
      setCargando(false);
    }
    cargarHistorial();
  }, [router]);

  return (
    <main className="min-h-screen bg-transparent pb-24 font-sans">
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-500 p-6 shadow-md sticky top-0 z-10 text-white rounded-b-3xl mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <h1 className="font-extrabold text-2xl tracking-tight relative z-10">Tu Historial</h1>
        <p className="text-emerald-100 font-medium text-xs mt-1 uppercase tracking-wider relative z-10">Resultados Finalizados</p>
      </header>

      <div className="max-w-md mx-auto px-4">
        {cargando ? (
          <div className="text-center py-10 text-slate-500 font-medium">Cargando tu historial...</div>
        ) : historial.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-slate-100">
            <div className="text-4xl mb-3 opacity-50">⏳</div>
            <p className="text-slate-500 font-medium text-sm">Aún no hay partidos finalizados en los que hayas pronosticado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historial.map((item, index) => {
              const puntos = item.puntos_obtenidos || 0;
              let borderClass = 'border-slate-200';
              let badgeClass = 'bg-slate-100 text-slate-500';
              
              if (puntos === 3) {
                borderClass = 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                badgeClass = 'bg-emerald-500 text-white animate-pulse';
              } else if (puntos === 1) {
                borderClass = 'border-emerald-300';
                badgeClass = 'bg-emerald-100 text-emerald-700';
              }

              return (
                <div key={index} className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${borderClass} transition-all`}>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Marcador Oficial: {item.partidos.goles_local_real} - {item.partidos.goles_vis_real}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full tracking-wide ${badgeClass}`}>
                      +{puntos} PTS
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-center">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">{item.partidos.equipo_local}</p>
                      <p className="text-lg font-black text-slate-400 mt-1">{item.goles_local_pred}</p>
                    </div>
                    
                    <div className="px-4 text-slate-300 font-black">
                      VS
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">{item.partidos.equipo_vis}</p>
                      <p className="text-lg font-black text-slate-400 mt-1">{item.goles_vis_pred}</p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
