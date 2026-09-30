import { NavLink as Link } from "react-router-dom";
import styled from "styled-components";
import { tablet } from "../estilos/medidas";

export const Nav = styled.nav`
    background: rgba(92, 14, 109, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    height: 70px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 5%;
    box-shadow: 0 2px 12px rgba(92, 14, 109, 0.35);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    transition: background 0.3s ease;

    ${tablet} {
        padding: 0 12px 0 20px;
    }
`;

/* Link de sección con scroll suave: botón (no <a>) para que funcione con teclado */
export const ScrollLink = styled.button`
    color: #ffffff;
    display: flex;
    align-items: center;
    padding: 0 1.2rem;
    height: 100%;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    font-size: 0.95rem;
    letter-spacing: 0.3px;
    transition: color 0.2s ease, background 0.2s ease;
    cursor: pointer;
    position: relative;
    background: none;
    border: none;
    user-select: none;

    &:hover {
        color: #9de03e;
    }

    &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%) scaleX(0);
        width: 60%;
        height: 3px;
        background: #9de03e;
        border-radius: 2px;
        transition: transform 0.25s ease;
    }

    &:hover::after {
        transform: translateX(-50%) scaleX(1);
    }

    ${tablet} {
        height: 48px;
        padding: 0 16px;
        border-radius: 10px;
        font-size: 1rem;

        &:hover {
            background: rgba(255, 255, 255, 0.08);
        }

        &::after {
            display: none;
        }
    }
`;

export const SignNavLink = styled(Link)`
    color: #1a1a2e;
    display: flex;
    align-items: center;
    text-decoration: none;
    padding: 0.5rem 1.4rem;
    height: auto;
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    background: #9de03e;
    border-radius: 8px;
    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(157, 224, 62, 0.3);

    &:hover {
        background: #86c935;
        transform: translateY(-2px);
        box-shadow: 0 4px 14px rgba(157, 224, 62, 0.45);
    }

    &:active {
        transform: scale(0.97);
    }

    &.active {
        background: #86c935;
        color: #1a1a2e;
        border-bottom: none;
    }

    ${tablet} {
        justify-content: center;
        height: 48px;
        margin-top: 8px;
        font-size: 1rem;
    }
`;

// Botón "Instalar app" (solo aparece si el navegador ofrece instalar la PWA)
export const InstallButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
    padding: 0.45rem 1rem;
    border: 1.5px solid rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    background: transparent;
    color: #ffffff;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    ${tablet} {
        justify-content: center;
        height: 48px;
        margin: 8px 0 0;
        font-size: 1rem;
    }
`;

// En pantallas chicas el menú se despliega debajo de la barra
export const NavMenu = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;

    ${tablet} {
        display: ${props => (props.$abierto ? 'flex' : 'none')};
        position: fixed;
        top: 70px;
        left: 0;
        right: 0;
        height: auto;
        flex-direction: column;
        align-items: stretch;
        gap: 4px;
        padding: 12px 16px 20px;
        background: rgba(74, 11, 90, 0.98);
        box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
    }
`;

export const MenuButton = styled.button`
    display: none;

    ${tablet} {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background: transparent;
        color: #ffffff;
        font-size: 1.6rem;
        cursor: pointer;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
        }
    }
`;

export const LogoArea = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    color: #ffffff;
    background: none;
    border: none;
    font-family: 'Dancing Script', cursive;
    font-weight: 700;
    font-size: 1.4rem;
    letter-spacing: 0.5px;
    cursor: pointer;
`;
