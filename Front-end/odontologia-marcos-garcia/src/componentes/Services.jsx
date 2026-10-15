import React from "react";
import cleaning from "../assets/images/services/cleaning.webp";
import resin from "../assets/images/services/resin.webp";
import surgery from "../assets/images/services/surgery.webp";
import interceptiveOrthodontics from "../assets/images/services/interceptive-orthodontics.webp";
import correctiveOrthodontics from "../assets/images/services/corrective-orthodontics.webp";
import prosthesis from "../assets/images/services/prosthesis.webp";
import whitening from "../assets/images/services/whitening.webp";
import retainers from "../assets/images/services/retainers.webp";
import andMore from "../assets/images/services/and-more.webp";
import '../styles/services.css';

const services = [
    {
        img: cleaning,
        title: "Limpieza Dental",
        desc: "Remoción y eliminación de cálculo dental, placa bacteriana y manchas de la superficie dental."
    },
    {
        img: resin,
        title: "Restauraciones en Resina",
        desc: "Devuelve la anatomía, estructura y salud perdida por caries o algún trauma."
    },
    {
        img: surgery,
        title: "Cirugía Bucal",
        desc: "Intervención mínimamente invasiva para extraer muelas del juicio o cordales."
    },
    {
        img: interceptiveOrthodontics,
        title: "Ortodoncia Interceptiva",
        desc: "Aparatología en edad temprana para guiar el crecimiento dental y esqueletal."
    },
    {
        img: correctiveOrthodontics,
        title: "Ortodoncia Correctiva",
        desc: "Aparatos fijos para la corrección de maloclusiones."
    },
    {
        img: prosthesis,
        title: "Prótesis Dentales",
        desc: "Reemplaza estructuras dentales perdidas devolviendo función y estética."
    },
    {
        img: whitening,
        title: "Blanqueamiento Dental",
        desc: "Procedimiento para aclarar el tono de los dientes naturales."
    },
    {
        img: retainers,
        title: "Retenedores",
        desc: "Mantienen en correcta posición los dientes post tratamiento de ortodoncia."
    },
    {
        img: andMore,
        title: "¡Y mucho más!",
        desc: "Ofrecemos una amplia gama de tratamientos odontológicos para toda la familia."
    }
];

// The photos are below the fold: they load when the person scrolls near them.
// width/height reserve their space so nothing jumps when they arrive.
const ServiceCard = ({ service }) => (
    <div className="service">
        <div className="serviceImgWrapper">
            <img src={service.img} alt={service.title} width="600" height="400" loading="lazy" decoding="async" />
        </div>
        <div className="serviceBody">
            <h3>{service.title}</h3>
            <p>{service.desc}</p>
        </div>
    </div>
);

const Services = () => {
    return (
        <div className="servicesPage">
            <h1 className="servicesPageTitle">Nuestros Servicios</h1>
            <p className="servicesPageSubtitle">
                Ofrecemos atención odontológica integral para toda la familia
            </p>

            <div className="servicesSlider">
                <div className="servicesTrack">
                    {services.map((service) => (
                        <ServiceCard key={service.title} service={service} />
                    ))}
                    {/* A second copy makes the carousel loop without a gap */}
                    {services.map((service) => (
                        <ServiceCard key={`copy-${service.title}`} service={service} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Services;
