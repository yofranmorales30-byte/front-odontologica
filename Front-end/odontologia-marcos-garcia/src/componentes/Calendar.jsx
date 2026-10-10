import React, { useState, useEffect, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import DayGridPlugin from "@fullcalendar/daygrid";
import TimeGridPlugin from "@fullcalendar/timegrid";
import ListPlugin from "@fullcalendar/list";
import InteractionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useMediaQuery } from "../utils/useMediaQuery";
import { movil, ANCHO_MOVIL } from "../estilos/medidas";
import EventModal from "./EventModal";
import BotonesExportar from "./BotonesExportar";
import styled from "styled-components";
import { apiFetch } from "../api";
import { finCita, toFechaCita, BUSINESS_HOURS } from "../utils/agenda";
import { colorEvento } from "../utils/estados";
import { exportarAgendaExcel, exportarAgendaPdf } from "../exportar/citas";

const CalendarWrapper = styled.div`
    padding: 24px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid #f0f0f0;

    .fc {
        font-family: 'Poppins', sans-serif;
    }

    .fc-toolbar-title {
        font-size: 1.2rem !important;
        font-weight: 700 !important;
        color: #1a1a2e;
    }

    .fc-button {
        background: #5c0e6d !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        font-size: 0.85rem !important;
        padding: 6px 14px !important;
        transition: background 0.2s !important;

        &:hover {
            background: #4a0b5a !important;
        }
    }

    .fc-button-active {
        background: #7b1fa2 !important;
    }

    .fc-daygrid-day-number,
    .fc-col-header-cell-cushion {
        color: #1a1a2e;
        text-decoration: none;
    }

    .fc-event {
        border-radius: 6px !important;
        padding: 2px 6px !important;
        font-size: 0.8rem !important;
        font-weight: 500 !important;
        border: none !important;
        cursor: pointer;
    }

    .fc-timegrid-slot {
        height: 40px !important;
    }

    .fc-timegrid-axis {
        font-size: 0.8rem;
    }

    .fc-list-event {
        cursor: pointer;
    }

    ${movil} {
        padding: 12px 8px;
        border-radius: 12px;

        .fc-toolbar.fc-header-toolbar {
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
        }

        .fc-toolbar-title {
            font-size: 1rem !important;
        }

        .fc-button {
            padding: 8px 12px !important;
        }
    }
`;

const LoadingState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
    font-family: 'Poppins', sans-serif;
    font-size: 1rem;
    color: #6b7280;
`;

// Arriba del calendario: descargar la agenda del período que se está viendo
const BarraAgenda = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px 12px;
    margin-bottom: 16px;
    font-family: 'Poppins', sans-serif;
    font-size: 0.85rem;
    color: #6b7280;

    /* En el celular queda "Descargar:", para que entre en un renglón con los botones */
    ${movil} {
        em {
            display: none;
        }
    }

    em {
        font-style: normal;
    }
`;

// rol: { rol: 'secreto' } (puede mover y estirar turnos) o { rol: 'doctor' } (solo los ve)
// alVerHistorial(idPaciente): abre el historial del paciente de un turno
const CalendarioDoctorSemana = ({ rol, alVerHistorial }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [Citado, setCitado] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const openModal = () => setIsOpen(true);
  // Estable: el modal la usa en un efecto (Escape) y no debe re-suscribirse en cada render
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setCitado(null);
  }, []);
  const shootTrigger = () => {
    setRefreshKey(prev => prev + 1);
  };

  const isEditable = rol?.rol === 'secreto';

  // En celular una semana no entra: se muestra un día por vez (o la lista de la semana)
  const esMovil = useMediaQuery(`(max-width: ${ANCHO_MOVIL}px)`);
  const calendarRef = useRef(null);
  useEffect(() => {
    calendarRef.current?.getApi().changeView(esMovil ? 'timeGridDay' : 'timeGridWeek');
  }, [esMovil]);

  const fetchCitasCompletas = useCallback(async () => {
    try {
      const response = await apiFetch('/citaCompleta');
      const citas = await response.json();
      const returning = citas.map(cita => {
        // date_cita es hora local sin zona: se pasa tal cual a FullCalendar (sin toISOString)
        const fechaInicio = cita.date_cita;
        const fechaFinal = finCita(cita.date_cita, cita.time_cita);
        // El servidor pasa a COMPLETADA las citas terminadas (las canceladas quedan canceladas)
        const status = cita.status_cita;
        const color = colorEvento(status);

        return {
          id: cita.id_citas,
          title: cita.name_paciente, 
          start: fechaInicio, 
          end: fechaFinal,
          description: cita.desc_cita,
          editable: isEditable,
          color: color,
          extendedProps: {
              sexo: cita.genre_paciente,
              nacimiento: cita.birth_paciente,
              direccion: cita.dir_paciente,
              telefono: cita.telf_paciente,
              email: cita.email_user,
              idPaciente: cita.id_paciente,
              estatus: status,
              start: fechaInicio, 
              end: fechaFinal,
              id: cita.id_citas
            }
          };

      });

      return returning;
    } catch (error) {
      console.error('No se pudieron cargar las citas:', error);
    }
  }, [isEditable]);

  function openCita(info) {
    setCitado(info.event);
    openModal();
  }

  // Solo la primera carga muestra "Cargando turnos...". Las recargas (tras confirmar,
  // mover o estirar una cita) actualizan los eventos sin desmontar FullCalendar,
  // así no vuelve a la semana actual.
  useEffect(() => {
    const load = async () => {
      const data = await fetchCitasCompletas();
      if (data) {
        setLista(data);
      }
      setIsLoading(false);
    };
    load();
  }, [refreshKey, fetchCitasCompletas]);

  // Guarda en el servidor un cambio hecho arrastrando o estirando una cita.
  // Si el servidor lo rechaza (p. ej. 409: se superpone con otra), la cita vuelve a su lugar.
  async function guardarCambio(info, ruta, body, mensajeError) {
    try {
      const response = await apiFetch(ruta, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        info.revert();
        window.alert(data.error || mensajeError);
        return;
      }
    } catch {
      info.revert();
      window.alert('Error de conexión con el servidor.');
      return;
    }
    shootTrigger();
  }

  // Descarga, como agenda, los turnos del período que se está viendo (la semana o el día)
  function descargarAgenda(exportar) {
    const { currentStart, currentEnd, title } = calendarRef.current.getApi().view;
    const [desde, hasta] = [toFechaCita(currentStart), toFechaCita(currentEnd)];
    const turnos = lista
      .filter((evento) => evento.start >= desde && evento.start < hasta)
      .map((evento) => ({
        inicio: evento.start,
        fin: evento.end,
        paciente: evento.title,
        telefono: evento.extendedProps.telefono,
        motivo: evento.description,
        estado: evento.extendedProps.estatus,
      }));
    if (turnos.length === 0) {
      window.alert('No hay turnos en este período para descargar.');
      return;
    }
    exportar(turnos, { titulo: title, desde: desde.slice(0, 10) });
  }

  if (isLoading) {
    return <LoadingState>Cargando turnos...</LoadingState>;
  }

  return (
    <CalendarWrapper>
      {/*console.log(lista)*/}
      <EventModal
        isOpen={isOpen}
        onClose={closeModal}
        info={Citado}
        trigger={shootTrigger}
        onVerHistorial={alVerHistorial && ((idPaciente) => { closeModal(); alVerHistorial(idPaciente); })}
      />

      <BarraAgenda>
        <span>Descargar<em> esta agenda</em>:</span>
        <BotonesExportar
          que="la agenda"
          alExcel={() => descargarAgenda(exportarAgendaExcel)}
          alPdf={() => descargarAgenda(exportarAgendaPdf)}
        />
      </BarraAgenda>

      <FullCalendar
        ref={calendarRef}
        plugins={[DayGridPlugin, TimeGridPlugin, ListPlugin, InteractionPlugin]}
        locale={esLocale}
        initialView={esMovil ? "timeGridDay" : "timeGridWeek"}
        // Alto según el contenido: sin una caja con scroll propio dentro de la página
        height="auto"
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="19:00:00"
        // Lunes a sábado; el domingo la clínica está cerrada
        hiddenDays={[0]}
        // Sombrea las horas fuera de atención y no deja arrastrar citas ahí
        businessHours={BUSINESS_HOURS}
        eventConstraint="businessHours"
        headerToolbar={esMovil
          ? { start: "prev,next", center: "title", end: "timeGridDay,listWeek" }
          : { start: "prev,next today", center: "title", end: "timeGridWeek,listWeek" }}
        views={{
          timeGridDay: { titleFormat: { weekday: "short", day: "numeric", month: "short" } },
        }}
        eventDisplay="list-item"
        editable={isEditable}
        events={lista}
        eventClick={openCita}
        eventDrop={(info) =>
          guardarCambio(info, `/citaCompletaDate/${info.event.id}`,
            { date_cita: toFechaCita(info.event.start) }, 'No se pudo mover la cita.')
        }
        eventResize={(info) => {
          // La duración se guarda en horas enteras; el calendario estira de a 30 min
          const horas = (info.event.end - info.event.start) / 3600000;
          if (!Number.isInteger(horas)) {
            info.revert();
            window.alert('La duración tiene que ser de horas enteras (1 h, 2 h, ...).');
            return;
          }
          guardarCambio(info, `/citaCompletaDuracion/${info.event.id}`,
            { time_cita: String(horas) }, 'No se pudo cambiar la duración.');
        }}
      />
    </CalendarWrapper>
  );
};

export default CalendarioDoctorSemana;
