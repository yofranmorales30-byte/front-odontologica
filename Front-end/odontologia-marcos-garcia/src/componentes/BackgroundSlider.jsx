import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";

import cleaning from "../assets/images/backgrounds/cleaning.webp";
import prosthesis from "../assets/images/backgrounds/prosthesis.webp";
import whitening from "../assets/images/backgrounds/whitening.webp";
import surgery from "../assets/images/backgrounds/surgery.webp";
import correctiveOrthodontics from "../assets/images/backgrounds/corrective-orthodontics.webp";

const images = [cleaning, prosthesis, whitening, surgery, correctiveOrthodontics];

const bgFade = keyframes`
    from { opacity: 0; transform: scale(1.08); }
    to { opacity: 1; transform: scale(1); }
`;

const BgContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    overflow: hidden;
`;

const BgSlide = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    ${props => props.$src && css`background-image: url(${props.$src});`}
    background-size: cover;
    background-position: center;
    opacity: ${props => (props.$active ? 1 : 0)};
    animation: ${props => (props.$active ? css`${bgFade} 0.8s ease-out` : 'none')};
    transition: opacity 1.2s ease-out;
`;

const BgOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.35) 0%,
        rgba(0, 0, 0, 0.65) 50%,
        rgba(0, 0, 0, 0.85) 100%
    );
`;

const AUTOPLAY_INTERVAL = 5000;

const BackgroundSlider = () => {
    const [current, setCurrent] = useState(0);
    // Only the photo on screen and the next one are downloaded; the rest arrive as the slideshow advances
    const [lastLoaded, setLastLoaded] = useState(1);

    useEffect(() => {
        const id = setInterval(() => {
            setCurrent(prev => (prev + 1) % images.length);
            setLastLoaded(loaded => Math.min(images.length - 1, loaded + 1));
        }, AUTOPLAY_INTERVAL);
        return () => clearInterval(id);
    }, []);

    return (
        <BgContainer>
            {images.map((img, i) => (
                <BgSlide
                    key={img}
                    $src={i <= lastLoaded ? img : undefined}
                    $active={i === current}
                    aria-hidden={i !== current}
                />
            ))}
            <BgOverlay />
        </BgContainer>
    );
};

export default BackgroundSlider;
