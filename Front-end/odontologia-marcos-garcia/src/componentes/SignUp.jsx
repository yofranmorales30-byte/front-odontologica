import React, { useState, useEffect, lazy, Suspense } from 'react';
import styled from 'styled-components';
import Login from './Login';
import RegistrationWizard from './RegistrationWizard';
import AppointmentForm from './AppointmentForm';
import AppointmentSuccess from './AppointmentSuccess';
import BackgroundSlider from './BackgroundSlider';
import Boton from '../elementos/boton.js';
import { FiUserPlus, FiLogIn } from 'react-icons/fi';
import { apiFetch } from '../api';
import { movil } from '../estilos/medidas';
import EtiquetaEstado from './EtiquetaEstado';
import { fechaHoraCita } from '../utils/formato';

// El panel del personal trae FullCalendar (la mayor parte del bundle): se descarga solo si hace falta
const Dashboard = lazy(() => import('./Dashboard'));

const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 60px;
  position: relative;

  ${movil} {
    padding: 86px 12px 32px;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const BackButton = styled(Boton)`
  margin: 20px auto 0;
  display: flex;
`;

// ─── Card unificada con tabs integradas ───

const AuthCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 720px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
`;

const AuthHeader = styled.div`
  background: linear-gradient(135deg, #5c0e6d, #7b1fa2);
  display: flex;
  padding: 0;
`;

const AuthTab = styled.button`
  flex: 1;
  padding: 20px 24px;
  border: none;
  background: transparent;
  color: ${props => props.$active ? '#ffffff' : 'rgba(255, 255, 255, 0.55)'};
  font-family: 'Poppins', sans-serif;
  font-size: 0.95rem;
  font-weight: ${props => props.$active ? '700' : '500'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.25s ease;
  border-bottom: 3px solid ${props => props.$active ? '#9de03e' : 'transparent'};
  position: relative;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
  }

  ${movil} {
    padding: 16px 10px;
    gap: 8px;
    font-size: 0.9rem;
  }
`;

const AuthBody = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// ─── Patient Dashboard (vista sencilla para pacientes) ───

const PatientDashboardWrapper = styled.div`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 760px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
`;

const PatientHeader = styled.div`
  background: linear-gradient(135deg, #5c0e6d, #7b1fa2);
  padding: 28px 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  ${movil} {
    padding: 20px;
    flex-wrap: wrap;
  }
`;

const PatientInfo = styled.div`
  color: #ffffff;
`;

const PatientName = styled.h2`
  font-family: 'Poppins', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 2px;
`;

const PatientRole = styled.span`
  font-family: 'Poppins', sans-serif;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.15);
  padding: 3px 12px;
  border-radius: 20px;
`;

const PatientBody = styled.div`
  padding: 28px 36px 36px;

  ${movil} {
    padding: 20px 12px 24px;
  }
`;

const SectionTitle = styled.h3`
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CitaCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  ${movil} {
    padding: 14px 16px;
  }
`;

const CitaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CitaFecha = styled.div`
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a2e;
`;

const CitaDesc = styled.div`
  font-family: 'Poppins', sans-serif;
  font-size: 0.82rem;
  color: #6b7280;
`;


const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
`;

const NewAppointmentBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #9de03e, #86c935);
  color: #1a1a2e;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  margin: 0 auto 24px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 16px rgba(157, 224, 62, 0.35);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(157, 224, 62, 0.5);
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 40px;
  color: #dc2626;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
`;

// ─── Componente PatientDashboard ───

function PatientDashboard({ user, onLogout }) {
  const [view, setView] = useState('citas'); // 'citas' | 'nuevo-turno' | 'exito'
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Volver a la lista: el "cargando" se prende acá, no dentro del efecto
  const verCitas = () => {
    setLoading(true);
    setError(null);
    setView('citas');
  };

  useEffect(() => {
    if (view !== 'citas') return;
    let cancelado = false;
    // El servidor filtra por el usuario del token
    apiFetch('/mis-citas')
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar citas');
        return res.json();
      })
      .then((data) => { if (!cancelado) setCitas(data); })
      .catch((err) => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [view]);

  if (view === 'nuevo-turno') {
    return (
      <PatientDashboardWrapper>
        <PatientHeader>
          <PatientInfo>
            <PatientName>Nuevo turno</PatientName>
          </PatientInfo>
          <PatientRole as="button" onClick={verCitas}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', padding: '6px 16px', borderRadius: 20, fontFamily: 'Poppins', fontSize: '0.8rem' }}>
            ← Volver
          </PatientRole>
        </PatientHeader>
        <PatientBody>
          <AppointmentForm user={user} onSuccess={() => setView('exito')} />
        </PatientBody>
      </PatientDashboardWrapper>
    );
  }

  if (view === 'exito') {
    return (
      <PatientDashboardWrapper>
        <PatientBody>
          <AppointmentSuccess />
          <BackButton $verde onClick={verCitas}>
            Ver mis citas
          </BackButton>
        </PatientBody>
      </PatientDashboardWrapper>
    );
  }

  return (
    <PatientDashboardWrapper>
      <PatientHeader>
        <PatientInfo>
          <PatientName>Hola, {user?.name_user || 'Paciente'}</PatientName>
          <PatientRole>Paciente</PatientRole>
        </PatientInfo>
        <Boton $rojo onClick={onLogout} style={{ padding: '6px 18px', fontSize: '0.8rem', margin: 0 }}>
          Cerrar sesión
        </Boton>
      </PatientHeader>

      <PatientBody>
        <NewAppointmentBtn onClick={() => setView('nuevo-turno')}>
          + Agendar nuevo turno
        </NewAppointmentBtn>

        <SectionTitle>📋 Mis citas</SectionTitle>

        {loading && <LoadingState>Cargando tus citas...</LoadingState>}
        {error && <ErrorState>Error: {error}</ErrorState>}

        {!loading && !error && citas.length === 0 && (
          <EmptyState>
            No tenés citas agendadas todavía.<br />
            Hacé clic en "Agendar nuevo turno" para sacar tu primer turno.
          </EmptyState>
        )}

        {!loading && citas.map((c, i) => (
          <CitaCard key={c.id_citas || i}>
            <CitaInfo>
              <CitaFecha>{fechaHoraCita(c.date_cita, c.time_cita)}</CitaFecha>
              <CitaDesc>{c.desc_cita || 'Sin descripción'}</CitaDesc>
            </CitaInfo>
            <EtiquetaEstado estado={c.status_cita || 'PENDIENTE'} />
          </CitaCard>
        ))}
      </PatientBody>
    </PatientDashboardWrapper>
  );
}

// ─── SignUp principal ───

// La sesión la maneja App (token incluido): SignUp solo decide qué pantalla mostrar
export default function SignUp({ isAuthenticated, user, onLogin, onLogout }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  const handleLoginSuccess = (rolAsignado, userData) => onLogin(userData);

  // Auto-login después del registro
  const handleRegisterSuccess = (userData) => onLogin(userData);

  const handleLogout = onLogout;

  const staffRoles = ['Administrador', 'Doctor', 'Asistente'];

  // ─── Staff → Dashboard actual ───
  if (isAuthenticated && user && staffRoles.includes(user.nombre_rol)) {
    return (
      <Suspense fallback={<LoadingState>Cargando panel...</LoadingState>}>
        <Dashboard user={user} onLogout={handleLogout} />
      </Suspense>
    );
  }

  // ─── Paciente autenticado → PatientDashboard ───
  if (isAuthenticated && user) {
    return (
      <PageWrapper>
        <BackgroundSlider />
        <ContentWrapper>
          <PatientDashboard user={user} onLogout={handleLogout} />
        </ContentWrapper>
      </PageWrapper>
    );
  }

  // ─── No autenticado → Login / Registro en card unificada ───
  return (
    <PageWrapper>
      <BackgroundSlider />

      <ContentWrapper>
        <AuthCard>
          <AuthHeader>
            <AuthTab $active={authMode === 'login'} onClick={() => setAuthMode('login')}>
              <FiLogIn size={18} /> Iniciar sesión
            </AuthTab>
            <AuthTab $active={authMode === 'register'} onClick={() => setAuthMode('register')}>
              <FiUserPlus size={18} /> Registrarse
            </AuthTab>
          </AuthHeader>

          <AuthBody>
            {authMode === 'login' ? (
              <Login embedded onLogin={handleLoginSuccess} />
            ) : (
              <RegistrationWizard
                embedded
                onRegister={handleRegisterSuccess}
                onBackToLogin={() => setAuthMode('login')}
              />
            )}
          </AuthBody>
        </AuthCard>
      </ContentWrapper>
    </PageWrapper>
  );
}
