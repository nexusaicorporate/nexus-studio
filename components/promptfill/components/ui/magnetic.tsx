"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface MagneticProps {
    children: React.ReactElement;
    className?: string;
    strength?: number; // Distance factor, default 0.2
}

export const Magnetic = ({ children, strength = 0.2 }: MagneticProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };

        const xPos = clientX - (left + width / 2);
        const yPos = clientY - (top + height / 2);

        x.set(xPos * strength);
        y.set(yPos * strength);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: mouseX, y: mouseY }}
        >
            {React.cloneElement(children, {
                style: { ...children.props.style }, // Preserve exist styles if any, though motion div wraps it. 
                // Actually simple wrap is enough.
            })}
        </motion.div>
    );
};
