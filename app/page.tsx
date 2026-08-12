'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

// Definimos la estructura del partido según tu tabla de Supabase
interface Partido {
  id: string;
  jornada: number;
  equipo_local: string;
  equipo_vis: string;
  fecha_inicio: string;
}

export default function Home() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);
  // Almacenamos lo que el usuario digita en los inputs: { partido_id: { local: number, vis: number } }
  const [apuestas, setApuestas] = useState<Record<string, { local: string; vis: string }>>({});
  const [mensaje, setMensaje] = useState('');
  const [ahora, setAhora] = useState(new Date());
  const [guardados, setGuardados] = useState<Set<string>>(new Set());
  const [tabActivo, setTabActivo] = useState<'masculino' | 'femenino'>('femenino');

  const router = useRouter();

  useEffect(() => {
    // Actualizar la hora cada minuto para bloquear partidos en tiempo real
    const timer = setInterval(() => setAhora(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. Verificar sesión y cargar partidos
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Si hay sesión, cargar partidos
      const { data, error } = await supabase
        .from('partidos')
        .select('*')
        .order('fecha_inicio', { ascending: true });

      if (error) {
        console.error('Error cargando partidos:', error);
      } else if (data) {
        setPartidos(data);
      }

      // Cargar predicciones guardadas del usuario
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();
        
      if (userData) {
        const { data: prediccionesData } = await supabase
          .from('predicciones')
          .select('partido_id, goles_local_pred, goles_vis_pred')
          .eq('usuario_id', userData.id);

        if (prediccionesData) {
          const yaGuardados = new Set<string>();
          const apuestasIniciales: Record<string, {local: string, vis: string}> = {};
          
          prediccionesData.forEach((pred: any) => {
            yaGuardados.add(pred.partido_id);
            apuestasIniciales[pred.partido_id] = {
              local: pred.goles_local_pred.toString(),
              vis: pred.goles_vis_pred.toString()
            };
          });
          
          setGuardados(yaGuardados);
          setApuestas(apuestasIniciales);
        }
      }

      setCargando(false);
    }
    init();
  }, [router]);

  // Manejar cambios en las cajas de goles
  const handleCambioGol = (partidoId: string, tipo: 'local' | 'vis', valor: string) => {
    setApuestas((prev) => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        [tipo]: valor,
      },
    }));
  };

  // 2. Guardar pronósticos
  const guardarPronosticos = async () => {
    setMensaje('Guardando tus pronósticos...');

    // 1. Obtener la sesión actual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMensaje('Error: Debes iniciar sesión.');
      return;
    }

    // 2. Obtener el ID interno del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', session.user.id)
      .single();

    if (userError || !userData) {
      setMensaje('Error: No se encontró tu perfil.');
      return;
    }

    const usuario_id = userData.id;

    // 3. Preparar las predicciones a insertar
    const prediccionesAInsertar = Object.keys(apuestas).map((partidoId) => {
      // Validar que el partido no haya empezado y que no esté ya guardado
      const partido = partidos.find((p) => p.id === partidoId);
      if ((partido && ahora >= new Date(partido.fecha_inicio)) || guardados.has(partidoId)) {
        return null; // Ignorar apuestas en partidos que ya comenzaron o ya están guardadas
      }

      return {
        usuario_id,
        partido_id: partidoId,
        goles_local_pred: parseInt(apuestas[partidoId].local),
        goles_vis_pred: parseInt(apuestas[partidoId].vis)
      };
    }).filter((p: any) => p !== null && !isNaN(p.goles_local_pred) && !isNaN(p.goles_vis_pred)) as any[];

    if (prediccionesAInsertar.length === 0) {
      setMensaje('Por favor, ingresa al menos un pronóstico.');
      return;
    }

    // 4. Insertar en Supabase (upsert para actualizar si ya existe)
    const { error: upsertError } = await supabase
      .from('predicciones')
      .upsert(prediccionesAInsertar, { onConflict: 'usuario_id, partido_id' });

    if (upsertError) {
      console.error(upsertError);
      setMensaje('Error al guardar pronósticos.');
    } else {
      // Actualizar el estado de guardados localmente
      setGuardados(prev => {
        const nuevos = new Set(prev);
        prediccionesAInsertar.forEach(p => nuevos.add(p.partido_id));
        return nuevos;
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setMensaje('¡TUS RESULTADOS HAN SIDO GUARDADOS Y ESTÁN LISTOS PARA LA POLLA INTERFARMACÉUTICA! 🏆🍀');
      
      // Limpiar mensaje después de 4 segundos
      setTimeout(() => {
        setMensaje('');
      }, 4000);
    }
  };

  return (
    <main className="min-h-screen bg-transparent pb-20 font-sans">
      {/* Barra superior estilo App Móvil */}
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-500 p-4 md:p-6 shadow-md sticky top-0 z-10 text-white rounded-b-3xl mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="max-w-md mx-auto flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <img src="/mascota.png" alt="Mascota" className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-white object-cover shadow-md bg-white" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <div>
              <h1 className="font-extrabold text-lg md:text-xl tracking-tight drop-shadow-sm leading-tight">Torneo Interfarmacéutico<br />Clarel 2026</h1>
              <p className="text-[10px] md:text-xs text-emerald-100 font-medium uppercase tracking-wider mt-0.5">Polla Interfarmacéutica</p>
            </div>
          </div>
          <img src="/logo.png" alt="M&P Eventos" className="h-12 md:h-16 object-contain mix-blend-multiply opacity-95" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
      </header>

      {/* Contenedor adaptado 100% a celular (máximo ancho del móvil centrado en PC) */}
      <div className="max-w-md mx-auto px-4 mt-6">

        {/* Banner llamativo pero elegante */}
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-md border-l-4 border-emerald-500 relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-50 opacity-80 rounded-full blur-2xl"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="text-4xl animate-bounce drop-shadow-sm mt-1">🏆</div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-emerald-800">¿Cómo ganar puntos?</h3>
              <ul className="text-xs font-medium mt-2 text-slate-600 space-y-1.5">
                <li className="flex items-center gap-1.5">🎯 <span><strong className="text-emerald-700">Acierta el marcador exacto:</strong> Ganas 3 pts.</span></li>
                <li className="flex items-center gap-1.5">⚽ <span><strong className="text-emerald-700">Acierta quién gana/empata:</strong> Ganas 1 pt.</span></li>
              </ul>
              <p className="text-[10px] mt-2.5 text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 inline-block px-2 py-1 rounded-md border border-emerald-100">
                ¡Suma puntos y gana premios increíbles! 🎁
              </p>
              <p className="text-[10px] mt-2 text-red-600 font-extrabold uppercase tracking-wider bg-red-50 inline-block px-2 py-1 rounded-md border border-red-200 animate-pulse">
                ⚠️ ¡NO OLVIDES GUARDAR TUS PRONÓSTICOS!
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Torneo (Tabs) */}
        <div className="flex bg-slate-100 rounded-xl p-1.5 mb-6 shadow-inner border border-slate-200">
          <button
            onClick={() => setTabActivo('femenino')}
            className={`flex-1 py-2.5 text-sm font-extrabold rounded-lg transition-all duration-300 ${tabActivo === 'femenino' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            Femenino 🏅
          </button>
          <button
            onClick={() => setTabActivo('masculino')}
            className={`flex-1 py-2.5 text-sm font-extrabold rounded-lg transition-all duration-300 ${tabActivo === 'masculino' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            Masculino ⚽
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-slate-800 font-extrabold text-base uppercase tracking-tight">Partidos de este Sábado</h2>
            <p className="text-slate-500 text-[11px] uppercase tracking-wide mt-0.5">Ingresa tus goles antes del pitazo inicial</p>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-10 text-slate-500 text-sm font-bold flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Cargando partidos...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Función para renderizar los grupos de partidos */}
            {(() => {
              const partidosFemenino = partidos.filter(p => p.jornada === 21);
              const partidosMasculino = partidos
                .filter(p => p.jornada === 22 || p.jornada === 23)
                .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());

              const obtenerDetallesCruce = (local: string, vis: string) => {
                const cruces: Record<string, string> = {
                  'FARMAENLACE-BOEHRINGER': '1A vs 1C',
                  'LIFE-INPEL QUALITY': '1B vs 2C',
                  'JAMES BROWN-FARBIOPHARMA': '3A vs 3C',
                  'ROCHE-MEGALABS': '2A vs 2B',
                  'LIFE-SIEGFRIED': 'Grupo B',
                  'JAMES BROWN-GRUPO FARMA': 'Grupo C',
                  'ROCHE-BOEHRINGER': 'Grupo A',
                  'B BRAUN-NAOS': 'Grupo C',
                  'CLAREL TRADE-BAGO': 'Grupo A',
                  'FARMAENLACE-FARBIOPHARMA': 'Grupo B',
                  'MEGALABS-ADIUM': 'Grupo A',
                  'QUALIPHARM-PHYTOCHEMIE': 'Grupo C',
                  'ASO. QUIMICOS-GRUNENTHAL': 'Grupo B'
                };
                return cruces[`${local}-${vis}`] || '';
              };

              const renderPartidos = (lista: Partido[], titulo: string, bgGradient: string) => (
                <div key={titulo} className="animate-fade-in-up">
                  <h3 className={`text-xs font-extrabold uppercase tracking-widest text-white px-4 py-2 rounded-t-xl mb-0 ${bgGradient}`}>
                    {titulo}
                  </h3>
                  <div className="bg-white border-x border-b border-slate-200 rounded-b-xl shadow-sm p-2 space-y-2">
                    {lista.length === 0 ? <p className="text-xs text-slate-500 text-center py-2">No hay partidos cargados.</p> : lista.map((partido) => {
                      const fechaInicio = new Date(partido.fecha_inicio);
                      const estaEnJuego = ahora >= fechaInicio;
                      const estaGuardado = guardados.has(partido.id);
                      const estaBloqueado = estaEnJuego || estaGuardado;

                      const hora = fechaInicio.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const detalleExtra = obtenerDetallesCruce(partido.equipo_local, partido.equipo_vis);
                      const canchaInfo = partido.jornada === 22 ? 'Cancha 1' : partido.jornada === 23 ? 'Cancha 2' : null;

                      return (
                        <div
                          key={partido.id}
                          className={`bg-slate-50 rounded-xl shadow-sm border p-2.5 transition-all duration-300 relative overflow-hidden group ${estaBloqueado ? 'border-slate-200 opacity-90' : 'border-slate-300 hover:scale-[1.02] hover:shadow-emerald-500/10 hover:shadow-lg hover:border-emerald-300'}`}
                        >
                          {!estaBloqueado && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                          
                          {/* Hora y Detalle */}
                          <div className="text-center text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wide flex justify-between items-center gap-1">
                            <span className="bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> 
                              {hora}
                            </span>
                            
                            <div className="flex gap-1 flex-wrap justify-end">
                              {detalleExtra && (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                  {detalleExtra}
                                </span>
                              )}
                              
                              {canchaInfo && (
                                <span className="text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                  {canchaInfo}
                                </span>
                              )}

                              {estaEnJuego ? (
                                <span className="bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-md animate-pulse whitespace-nowrap">CERRADO</span>
                              ) : estaGuardado ? (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">GUARDADO</span>
                              ) : null}
                            </div>
                          </div>

                          {/* Enfrentamiento y Marcador */}
                          <div className="flex items-center justify-between gap-1">
                            {/* Equipo Local */}
                            <div className="flex-1 text-right font-extrabold text-slate-800 text-xs md:text-sm leading-tight">
                              {partido.equipo_local}
                            </div>

                            {/* Controles de Goles */}
                            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border-2 shadow-inner mx-1 ${estaBloqueado ? 'bg-slate-100 border-slate-200' : 'bg-white border-emerald-100'}`}>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                placeholder="-"
                                disabled={estaBloqueado}
                                value={apuestas[partido.id]?.local || ''}
                                onChange={(e) => handleCambioGol(partido.id, 'local', e.target.value)}
                                className={`w-8 h-8 md:w-10 md:h-10 text-center font-black text-base md:text-lg rounded-md focus:outline-none transition-colors ${estaBloqueado ? 'bg-transparent text-slate-400 cursor-not-allowed' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-emerald-500 focus:bg-white shadow-sm'}`}
                              />
                              <span className="text-slate-300 font-black text-base md:text-lg">:</span>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                placeholder="-"
                                disabled={estaBloqueado}
                                value={apuestas[partido.id]?.vis || ''}
                                onChange={(e) => handleCambioGol(partido.id, 'vis', e.target.value)}
                                className={`w-8 h-8 md:w-10 md:h-10 text-center font-black text-base md:text-lg rounded-md focus:outline-none transition-colors ${estaBloqueado ? 'bg-transparent text-slate-400 cursor-not-allowed' : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-emerald-500 focus:bg-white shadow-sm'}`}
                              />
                            </div>

                            {/* Equipo Visitante */}
                            <div className="flex-1 text-left font-extrabold text-slate-800 text-xs md:text-sm leading-tight">
                              {partido.equipo_vis}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

              if (tabActivo === 'femenino') {
                return (
                  <div className="space-y-6">
                    {renderPartidos(partidosFemenino, 'Segunda Fecha - Femenino', 'bg-gradient-to-r from-amber-500 to-amber-400')}
                  </div>
                );
              } else {
                return (
                  <div className="space-y-6">
                    {renderPartidos(partidosMasculino, 'Primera Fecha - Masculino', 'bg-gradient-to-r from-blue-600 to-indigo-500')}
                  </div>
                );
              }
            })()}
          </div>
        )}

        <div className="mt-8 relative">
          <button
            onClick={guardarPronosticos}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 text-sm uppercase tracking-wide animate-pulse hover:animate-none"
          >
            Guardar mis pronósticos
          </button>
          
          {/* Mensaje Flotante Mejorado */}
          {mensaje && (
            <div className="absolute -top-16 left-0 right-0 animate-fade-in-up">
              <div className="bg-emerald-800 text-white text-xs font-bold p-3 rounded-lg shadow-xl border border-emerald-500 text-center uppercase tracking-wide">
                {mensaje}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}