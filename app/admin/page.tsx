'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Partido {
  id: string;
  jornada: number;
  equipo_local: string;
  equipo_vis: string;
  goles_local_real: number | null;
  goles_vis_real: number | null;
  fecha_inicio: string;
  partido_finalizado: boolean;
}

interface Prediccion {
  id: string;
  usuario_id: string;
  goles_local_pred: number;
  goles_vis_pred: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Guardaremos los inputs del admin: { partido_id: { local: string, vis: string } }
  const [resultados, setResultados] = useState<Record<string, { local: string; vis: string }>>({});
  const [mensaje, setMensaje] = useState('');

  // Verificar admin y cargar partidos
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Verificar si es admin
      const { data: userData } = await supabase
        .from('usuarios')
        .select('es_admin')
        .eq('auth_id', session.user.id)
        .single();

      if (!userData || !userData.es_admin) {
        router.push('/'); // Si no es admin, fuera
        return;
      }

      setIsAdmin(true);

      // Cargar partidos
      const { data: partidosData } = await supabase
        .from('partidos')
        .select('*')
        .order('fecha_inicio', { ascending: true });

      if (partidosData) {
        setPartidos(partidosData);
        // Pre-llenar inputs si ya tienen resultado
        const preResultados: Record<string, { local: string; vis: string }> = {};
        partidosData.forEach(p => {
          if (p.partido_finalizado) {
            preResultados[p.id] = {
              local: p.goles_local_real?.toString() || '0',
              vis: p.goles_vis_real?.toString() || '0'
            };
          }
        });
        setResultados(preResultados);
      }
      setCargando(false);
    }
    init();
  }, [router]);

  const handleCambioGol = (partidoId: string, tipo: 'local' | 'vis', valor: string) => {
    setResultados(prev => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        [tipo]: valor
      }
    }));
  };

  const calcularPuntos = (gLocalReal: number, gVisReal: number, gLocalPred: number, gVisPred: number) => {
    if (gLocalReal === gLocalPred && gVisReal === gVisPred) {
      return 3; // Marcador exacto
    }
    
    const tendenciaReal = gLocalReal > gVisReal ? 'L' : gLocalReal < gVisReal ? 'V' : 'E';
    const tendenciaPred = gLocalPred > gVisPred ? 'L' : gLocalPred < gVisPred ? 'V' : 'E';
    
    if (tendenciaReal === tendenciaPred) {
      return 1; // Acierto de tendencia
    }
    
    return 0; // Fallo
  };

  const procesarPartido = async (partido: Partido) => {
    setMensaje(`Procesando partido ${partido.equipo_local} vs ${partido.equipo_vis}...`);
    
    const result = resultados[partido.id];
    if (!result || result.local === undefined || result.vis === undefined) {
      setMensaje('Error: Ingresa ambos goles.');
      return;
    }

    const glReal = parseInt(result.local);
    const gvReal = parseInt(result.vis);

    if (isNaN(glReal) || isNaN(gvReal)) {
      setMensaje('Error: Los goles deben ser números.');
      return;
    }

    try {
      // 1. Marcar partido como finalizado y guardar el marcador real
      const { error: errPartido } = await supabase
        .from('partidos')
        .update({
          goles_local_real: glReal,
          goles_vis_real: gvReal,
          partido_finalizado: true
        })
        .eq('id', partido.id);

      if (errPartido) throw new Error(`Error al actualizar partido: ${errPartido.message}`);

      // 2. Obtener todas las predicciones para este partido
      const { data: predicciones, error: errPred } = await supabase
        .from('predicciones')
        .select('id, usuario_id, goles_local_pred, goles_vis_pred')
        .eq('partido_id', partido.id);

      if (errPred) throw new Error('Error al obtener predicciones.');

      // 3. Calcular puntos para cada predicción y actualizarlas
      if (predicciones && predicciones.length > 0) {
        for (const pred of predicciones) {
          const puntos = calcularPuntos(glReal, gvReal, pred.goles_local_pred, pred.goles_vis_pred);
          
          await supabase
            .from('predicciones')
            .update({ puntos_ganados: puntos })
            .eq('id', pred.id);
        }

        // 4. Recalcular los puntos_totales de TODOS los usuarios afectados
        const usuariosAfectados = [...new Set(predicciones.map(p => p.usuario_id))];
        
        for (const uId of usuariosAfectados) {
          const { data: userPreds } = await supabase
            .from('predicciones')
            .select('puntos_ganados')
            .eq('usuario_id', uId);
            
          const totalPuntos = userPreds?.reduce((sum, p) => sum + (p.puntos_ganados || 0), 0) || 0;
          
          await supabase
            .from('usuarios')
            .update({ puntos_totales: totalPuntos })
            .eq('id', uId);
        }
      }

      // Actualizar estado local
      setPartidos(prev => prev.map(p => p.id === partido.id ? { ...p, partido_finalizado: true, goles_local_real: glReal, goles_vis_real: gvReal } : p));
      setMensaje(`¡Partido procesado con éxito! Puntos repartidos a ${predicciones?.length || 0} jugadores.`);

    } catch (err: any) {
      console.error(err);
      setMensaje(err.message || 'Error desconocido.');
    }
  };

  if (cargando) return <div className="p-10 text-center text-slate-800">Cargando panel de administrador...</div>;
  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-slate-900 pb-20 font-sans text-white">
      <header className="bg-slate-950 p-4 shadow-md sticky top-0 z-10 border-b border-emerald-500">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg text-emerald-400">Panel de Control</h1>
            <p className="text-xs text-slate-400">Solo Administradores</p>
          </div>
          <button onClick={() => router.push('/')} className="text-xs bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-700 transition">
            Volver a la App
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 mt-6">
        <div className="mb-6">
          <h2 className="font-bold text-xl mb-1">Cargar Resultados Reales</h2>
          <p className="text-slate-400 text-sm">Al "Finalizar Partido", el sistema calculará los puntos y actualizará el ranking.</p>
        </div>

        {mensaje && (
          <div className="bg-slate-800 border border-emerald-500 text-emerald-400 p-3 rounded-lg text-sm mb-6 text-center font-medium">
            {mensaje}
          </div>
        )}

        <div className="space-y-6">
          {partidos.map(partido => (
            <div key={partido.id} className={`bg-slate-800 rounded-xl p-4 border ${partido.partido_finalizado ? 'border-emerald-500/50 opacity-70' : 'border-slate-700'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-semibold bg-slate-700 px-2 py-1 rounded text-slate-300">
                  {partido.partido_finalizado ? 'FINALIZADO' : 'PENDIENTE'}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(partido.fecha_inicio).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex-1 text-right font-medium text-lg">{partido.equipo_local}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    disabled={partido.partido_finalizado}
                    value={resultados[partido.id]?.local || ''}
                    onChange={(e) => handleCambioGol(partido.id, 'local', e.target.value)}
                    className="w-12 h-12 text-center font-bold text-xl bg-slate-900 border border-slate-600 rounded text-white focus:border-emerald-500 focus:outline-none disabled:bg-slate-800 disabled:border-transparent"
                  />
                  <span className="text-slate-500 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    disabled={partido.partido_finalizado}
                    value={resultados[partido.id]?.vis || ''}
                    onChange={(e) => handleCambioGol(partido.id, 'vis', e.target.value)}
                    className="w-12 h-12 text-center font-bold text-xl bg-slate-900 border border-slate-600 rounded text-white focus:border-emerald-500 focus:outline-none disabled:bg-slate-800 disabled:border-transparent"
                  />
                </div>
                <div className="flex-1 text-left font-medium text-lg">{partido.equipo_vis}</div>
              </div>

              {!partido.partido_finalizado && (
                <button
                  onClick={() => procesarPartido(partido)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors mt-2"
                >
                  Finalizar Partido y Calcular Puntos
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
