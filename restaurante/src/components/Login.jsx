// src/components/Login.jsx

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function Login({ onLogin }) {
  const [modo, setModo]       = useState('login'); // 'login' | 'registro'
  const [usuario, setUsuario] = useState('');
  const [password, setPass]   = useState('');
  const [nombre, setNombre]   = useState('');
  const [error, setError]     = useState('');
  const [verPass, setVerPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Manejar el inicio de sesión
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!usuario.trim() || !password) {
      setError('Por favor ingresa tu usuario y contraseña.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('usuario', usuario.trim())
        .eq('password', password)
        .single();

      if (dbError || !data) {
        setError('Usuario o contraseña incorrectos.');
        setLoading(false);
      } else {
        setLoading(false);
        onLogin({ 
          nombre: data.nombre, 
          usuario: data.usuario, 
          rol: data.rol 
        });
      }
    } catch (err) {
      setError('Ocurrió un error al conectar con el servidor.');
      setLoading(false);
    }
  };

  // Manejar el registro de nuevos usuarios directamente en la base de datos
  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!nombre.trim() || !usuario.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Insertar el nuevo usuario en la tabla 'usuarios'
      const { error: regError } = await supabase
        .from('usuarios')
        .insert([
          { 
            usuario: usuario.trim(), 
            password: password, 
            nombre: nombre.trim(), 
            rol: 'cajero' 
          }
        ]);

      if (regError) {
        if (regError.code === '23505') {
          setError('El nombre de usuario ya está en uso. Elige otro.');
        } else {
          setError('Error al registrar el usuario: ' + regError.message);
        }
        setLoading(false);
      } else {
        setLoading(false);
        setError('');
        setModo('login');
        setPass('');
        alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
      }
    } catch (err) {
      setError('Error inesperado al registrar.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1C1A17 0%, #2C1A0E 50%, #1C1A17 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Fondo decorativo */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 30% 50%, rgba(196,116,42,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(196,116,42,0.08) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '400px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'rgba(196,116,42,0.15)',
            border: '2px solid rgba(196,116,42,0.4)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 16px',
          }}>🍽</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#C4742A', letterSpacing: '2px' }}>
            La Bahía
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '4px' }}>
            Sistema de Gestión
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(30,29,28,0.95)',
          border: '1px solid rgba(196,116,42,0.2)',
          borderRadius: '20px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>

          {/* Tabs login/registro */}
          <div style={{
            display: 'flex', gap: '2px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px', padding: '3px',
            marginBottom: '24px',
          }}>
            {[
              { id: 'login',    label: 'Iniciar sesión' },
              { id: 'registro', label: 'Registrarse'    },
            ].map(t => (
              <button key={t.id}
                onClick={() => { setModo(t.id); setError(''); }}
                style={{
                  flex: 1, padding: '8px',
                  border: 'none', borderRadius: '8px',
                  background: modo === t.id ? '#C4742A' : 'transparent',
                  color: modo === t.id ? 'white' : 'rgba(255,255,255,0.4)',
                  fontSize: '13px', fontWeight: modo === t.id ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>

            {/* Nombre — solo en registro */}
            {modo === 'registro' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: María García"
                  autoFocus
                  style={inputStyle}
                />
              </div>
            )}

            {/* Usuario */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Usuario
              </label>
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="Ej: cajero1"
                autoFocus={modo === 'login'}
                style={inputStyle}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={verPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                />
                <button type="button"
                  onClick={() => setVerPass(!verPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px',
                  }}>
                  {verPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(184,48,48,0.15)',
                border: '1px solid rgba(184,48,48,0.4)',
                borderRadius: '8px', padding: '10px 12px',
                fontSize: '12px', color: '#E05858',
                marginBottom: '16px',
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Botón */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #C4742A, #A85E1E)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.2s',
              letterSpacing: '0.3px',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Procesando...' : (modo === 'login' ? '→ Ingresar al sistema' : '✓ Crear cuenta')}
            </button>

          </form>

          {/* Credenciales por defecto — solo en login */}
          {modo === 'login' && (
            <div style={{
              marginTop: '20px', padding: '12px',
              background: 'rgba(196,116,42,0.08)',
              border: '1px solid rgba(196,116,42,0.15)',
              borderRadius: '8px', fontSize: '11px',
              color: 'rgba(255,255,255,0.35)', textAlign: 'center',
              lineHeight: 1.6,
            }}>
              Acceso inicial: <span style={{ color: 'rgba(196,116,42,0.7)' }}>admin</span>
              {' / '}
              <span style={{ color: 'rgba(196,116,42,0.7)' }}>labahia2026</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          RestoPOS · Restaurante La Bahía · Bogotá D.C.
        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: 'white',
  fontSize: '14px', outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, sans-serif',
};

export default Login;