'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

  const router = useRouter();

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
    const prediccionesAInsertar = Object.keys(apuestas).map((partidoId) => ({
      usuario_id,
      partido_id: partidoId,
      goles_local_pred: parseInt(apuestas[partidoId].local),
      goles_vis_pred: parseInt(apuestas[partidoId].vis)
    })).filter(p => !isNaN(p.goles_local_pred) && !isNaN(p.goles_vis_pred));

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
      setMensaje('¡Listo! Pronósticos registrados exitosamente.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-20 font-sans">
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
        
        {/* Banner llamativo */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 mb-6 shadow-lg text-white border border-orange-300 relative overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="text-4xl animate-bounce drop-shadow-md">🏆</div>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider drop-shadow-sm">¡Demuestra que eres el mejor!</h3>
              <p className="text-xs font-medium mt-1 leading-snug drop-shadow-sm">
                Acierta a tus pronósticos, compite por la cima del podio y <strong className="text-yellow-100 uppercase">¡gana premios increíbles!</strong> 🎁✨
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-slate-800 font-extrabold text-base uppercase tracking-tight">Partidos de este Sábado</h2>
            <p className="text-slate-500 text-[11px] uppercase tracking-wide mt-0.5">Ingresa tus goles antes del pitazo inicial</p>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-10 text-slate-500 text-sm">Cargando partidos...</div>
        ) : (
          <div className="space-y-4">
            {partidos.map((partido) => {
              const hora = new Date(partido.fecha_inicio).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={partido.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/10 hover:shadow-lg hover:border-emerald-200 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {/* Hora del partido */}
                  <div className="text-center text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">
                    Sábado • {hora}
                  </div>

                  {/* Enfrentamiento y Marcador */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Equipo Local */}
                    <div className="flex-1 text-right font-medium text-slate-800 text-sm">
                      {partido.equipo_local}
                    </div>

                    {/* Controles de Goles (Fáciles de tocar con el dedo) */}
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        placeholder="-"
                        value={apuestas[partido.id]?.local || ''}
                        onChange={(e) => handleCambioGol(partido.id, 'local', e.target.value)}
                        className="w-10 h-10 text-center font-bold text-lg bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-500 text-slate-800"
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        placeholder="-"
                        value={apuestas[partido.id]?.vis || ''}
                        onChange={(e) => handleCambioGol(partido.id, 'vis', e.target.value)}
                        className="w-10 h-10 text-center font-bold text-lg bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-500 text-slate-800"
                      />
                    </div>

                    {/* Equipo Visitante */}
                    <div className="flex-1 text-left font-medium text-slate-800 text-sm">
                      {partido.equipo_vis}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botón flotante al estilo App para guardar apuesta */}
        <div className="mt-6">
          <button
            onClick={guardarPronosticos}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 text-sm uppercase tracking-wide animate-pulse hover:animate-none"
          >
            Guardar mis pronósticos
          </button>
          {mensaje && (
            <p className="text-center text-xs font-medium text-emerald-700 mt-2">{mensaje}</p>
          )}
        </div>
      </div>
    </main>
  );
}