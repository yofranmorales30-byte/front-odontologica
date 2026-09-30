// Estilos compartidos por los formularios de turnos (AppointmentForm y RegistrationWizard)
import styled from 'styled-components';
import { movil, sinZoomAlEscribir } from '../../estilos/medidas';

export const WizardCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 720px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
`;

export const WizardHeader = styled.div`
  background: linear-gradient(135deg, #5c0e6d, #7b1fa2);
  padding: 28px 36px 24px;
  text-align: center;

  ${movil} {
    padding: 20px 20px 18px;
  }
`;

export const WizardTitle = styled.h2`
  font-family: 'Poppins', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px;
`;

export const WizardSubtitle = styled.p`
  font-family: 'Poppins', sans-serif;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
`;

export const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 28px 36px 8px;
  gap: 0;

  ${movil} {
    padding: 20px 16px 4px;
  }
`;

export const StepCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  background: ${props =>
    props.$status === 'completed' ? '#9de03e' :
    props.$status === 'active' ? '#5c0e6d' :
    '#e5e7eb'};
  color: ${props =>
    props.$status === 'completed' ? '#1a1a2e' :
    props.$status === 'active' ? '#ffffff' :
    '#9ca3af'};
  box-shadow: ${props =>
    props.$status === 'active' ? '0 0 0 4px rgba(92, 14, 109, 0.2)' :
    'none'};

  ${movil} {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

export const StepConnector = styled.div`
  flex: 1;
  height: 3px;
  background: ${props => props.$completed ? '#9de03e' : '#e5e7eb'};
  transition: background 0.3s ease;
  margin: 0 4px;
  min-width: 30px;

  ${movil} {
    min-width: 16px;
  }
`;

export const StepLabels = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 6px 36px 20px;
  gap: 0;

  ${movil} {
    padding: 6px 12px 14px;
  }
`;

export const StepLabel = styled.div`
  flex: 1;
  text-align: center;
  font-family: 'Poppins', sans-serif;
  font-size: 0.7rem;
  font-weight: ${props => props.$active ? '700' : '500'};
  color: ${props =>
    props.$status === 'completed' ? '#9de03e' :
    props.$status === 'active' ? '#5c0e6d' :
    '#9ca3af'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.3s ease;

  ${movil} {
    font-size: 0.62rem;
    letter-spacing: 0.3px;
  }
`;

export const FormBody = styled.div`
  width: 100%;
  padding: 8px 36px 36px;

  ${movil} {
    padding: 8px 16px 24px;
  }
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$twoCol ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  gap: 16px;

  ${movil} {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
`;

export const FieldGroup = styled.div`
  margin-bottom: 6px;
`;

export const FieldLabel = styled.label`
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
`;

const campo = `
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.25s ease;
  background: #fafafa;
  color: #1a1a2e;
  box-sizing: border-box;
  ${sinZoomAlEscribir}

  &:focus {
    border-color: #5c0e6d;
    box-shadow: 0 0 0 4px rgba(92, 14, 109, 0.1);
    background: #ffffff;
  }
`;

export const FieldInput = styled.input`
  ${campo}

  &::placeholder {
    color: #9ca3af;
  }
`;

export const FieldSelect = styled.select`
  ${campo}
`;

export const FieldTextarea = styled.textarea`
  ${campo}
  min-height: 100px;
  resize: vertical;

  &::placeholder {
    color: #9ca3af;
  }
`;

export const StepTitle = styled.h3`
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 4px;
`;

export const StepDescription = styled.p`
  font-family: 'Poppins', sans-serif;
  font-size: 0.82rem;
  color: #6b7280;
  margin: 0 0 20px;
`;

export const NavButtons = styled.div`
  display: flex;
  justify-content: ${props => props.$single ? 'flex-end' : 'space-between'};
  margin-top: 28px;
  gap: 12px;

  ${movil} {
    & > button {
      flex: 1;
      justify-content: center;
      padding-left: 16px;
      padding-right: 16px;
    }
  }
`;

export const BtnPrimary = styled.button`
  padding: 12px 32px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #9de03e, #86c935);
  color: #1a1a2e;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 16px rgba(157, 224, 62, 0.35);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(157, 224, 62, 0.5);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const BtnSecondary = styled.button`
  padding: 12px 24px;
  border: 1.5px solid #d1d5db;
  border-radius: 12px;
  background: #ffffff;
  color: #374151;
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #5c0e6d;
    color: #5c0e6d;
    background: #faf5ff;
  }
`;

export const ErrorText = styled.p`
  font-family: 'Poppins', sans-serif;
  font-size: 0.82rem;
  color: #dc2626;
  margin: 8px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

// Como ErrorText, pero para buenas noticias (p. ej. todos los horarios libres)
export const OkText = styled(ErrorText)`
  font-size: 0.8rem;
  color: #15803d;
`;

export const WarningBox = styled.div`
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.82rem;
  color: #92400e;
`;

export const ReviewBox = styled.div`
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
`;

export const ReviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  font-family: 'Poppins', sans-serif;
  font-size: 0.88rem;
  gap: 12px;

  &:last-child {
    border-bottom: none;
  }
`;

export const ReviewLabel = styled.span`
  color: #6b7280;
  font-weight: 500;
`;

export const ReviewValue = styled.span`
  color: #1a1a2e;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
`;

export const InfoText = styled.p`
  font-family: 'Poppins', sans-serif;
  font-size: 0.8rem;
  color: #6b7280;
  margin: 4px 0 0;
`;
