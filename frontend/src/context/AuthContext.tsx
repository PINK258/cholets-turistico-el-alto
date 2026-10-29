'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { Usuario } from '@/lib/types';

interface AuthContextValor {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (correo: string, password: string) => Promise<void>;
  registrar: (datos: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string;
    correo: string;
    password: string;
    captchaId: string;
    captchaRespuesta: string;
  }) => Promise<string>;
  loginConToken: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValor | undefined>(undefined);
const CLAVE_STORAGE = 'turismo_el_alto_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = async (tok: string) => {
    try {
      const perfil = await api<Usuario>('/auth/perfil', { token: tok });
      setUsuario(perfil);
      setToken(tok);
    } catch {
      localStorage.removeItem(CLAVE_STORAGE);
      setUsuario(null);
      setToken(null);
    }
  };

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    if (guardado) {
      cargarPerfil(guardado).finally(() => setCargando(false));
    } else {
      setCargando(false);
    }
  }, []);

  const guardarSesion = async (accessToken: string) => {
    localStorage.setItem(CLAVE_STORAGE, accessToken);
    await cargarPerfil(accessToken);
  };

  const login = async (correo: string, password: string) => {
    const data = await api<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    });
    await guardarSesion(data.accessToken);
  };

  const registrar = async (datos: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string;
    correo: string;
    password: string;
    captchaId: string;
    captchaRespuesta: string;
  }) => {
    const data = await api<{ accessToken: string }>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
    await guardarSesion(data.accessToken);
    // Se devuelve para usarlo enseguida (subir la foto o el local) sin esperar
    // a que React actualice el estado del contexto.
    return data.accessToken;
  };

  const loginConToken = async (accessToken: string) => {
    await guardarSesion(accessToken);
  };

  const logout = () => {
    localStorage.removeItem(CLAVE_STORAGE);
    setUsuario(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, registrar, loginConToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
