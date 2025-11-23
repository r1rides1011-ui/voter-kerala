"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float, Stars, Points, PointMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
// @ts-ignore
import * as random from "maath/random/dist/maath-random.esm";

function ParticleField(props: any) {
    const ref = useRef<any>();
    const sphere = useMemo(() => {
        const data = new Float32Array(5000 * 3);
        return random.inSphere(data, { radius: 1.5 });
    }, []);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10;
            ref.current.rotation.y -= delta / 15;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#8b5cf6"
                    size={0.005}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
}

function AnimatedSphere() {
    const meshRef = useRef<any>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
        }
    });

    return (
        <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
            <Sphere args={[1, 100, 200]} scale={2.2} ref={meshRef}>
                <MeshDistortMaterial
                    color="#4338ca"
                    attach="material"
                    distort={0.4}
                    speed={2}
                    roughness={0.1}
                    metalness={0.9}
                    emissive="#312e81"
                    emissiveIntensity={0.2}
                />
            </Sphere>
        </Float>
    );
}

export function Hero3D() {
    return (
        <div className="relative h-[500px] w-full overflow-hidden rounded-3xl border border-white/5 bg-black/40 shadow-2xl">
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 5] }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#818cf8" />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />
                    <ParticleField />
                    <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                    <AnimatedSphere />
                </Canvas>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-6xl font-bold tracking-tighter text-white sm:text-8xl drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                        Voter Census <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 animate-gradient-x">
                            Management System
                        </span>
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="mt-6 max-w-2xl text-xl text-gray-300 font-light tracking-wide"
                >
                    Next-generation data visualization and management for modern democracy.
                </motion.p>
            </div>
        </div>
    );
}
