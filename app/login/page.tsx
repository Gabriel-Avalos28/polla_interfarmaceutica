'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        // Inicio de sesión
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      } else {
        // Registro
        if (!nombre || !empresa) {
          throw new Error('Por favor completa tu nombre y empresa.');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Insertar perfil del usuario en la tabla pública con el esquema del usuario
          const { error: profileError } = await supabase.from('usuarios').insert([
            {
              auth_id: authData.user.id,
              nombre: nombre,
              empresa: empresa,
              email: email,
              es_admin: false,
            }
          ]);

          if (profileError) {
            console.error('Error creando perfil:', JSON.stringify(profileError));
            throw new Error('Cuenta creada, pero hubo un error al guardar tu perfil.');
          }

          setMessage('¡Registro exitoso! Revisa tu correo (si activaste confirmación) o inicia sesión.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 pt-16 font-sans relative">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl relative z-10">
        {/* Mascota asomándose */}
        <div className="flex justify-center -mt-12 relative z-10">
          <img
            src="/mascota.png"
            alt="Mascota Clarel"
            className="w-24 h-24 rounded-full border-4 border-white shadow-xl animate-float object-cover bg-white"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Cabecera */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 p-6 pt-10 -mt-12 text-center text-white relative rounded-t-2xl">
          <h1 className="font-extrabold text-2xl tracking-tight drop-shadow-md">Torneo Interfarmacéutico Clarel 2026</h1>
          <p className="text-emerald-100 mt-1 font-medium">Polla Interfarmacéutica</p>
        </div>

        {/* Formulario */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm mb-4 border border-emerald-200">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Farmacéutica</label>
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. Pfizer, AstraZeneca..."
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:scale-[1.02] active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 relative overflow-hidden group"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12"></div>
              <span className="relative">{loading ? 'Cargando...' : isLogin ? 'Entrar a la Polla' : 'Registrarme'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              {isLogin
                ? '¿No tienes cuenta? Regístrate aquí'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Logo */}
      <div className="absolute bottom-6 w-full flex justify-center opacity-80 animate-fade-in-up animation-delay-300">
        <img
          src="/logo.png"
          alt="M&P Eventos"
          className="h-14 object-contain drop-shadow-md mix-blend-multiply"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </div>
    </main>
  );
}
