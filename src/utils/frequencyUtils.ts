// src/utils/frequencyUtils.ts

export const calculateFrequency = (baseFrequency: number, multiplier: number): number => {
    return baseFrequency * multiplier;
};

export const isFrequencyInRange = (frequency: number, min: number, max: number): boolean => {
    return frequency >= min && frequency <= max;
};

export const frequencyToWavelength = (frequency: number): number => {
    const speedOfSound = 343; // Speed of sound in air in m/s
    return speedOfSound / frequency;
};

export const wavelengthToFrequency = (wavelength: number): number => {
    const speedOfSound = 343; // Speed of sound in air in m/s
    return speedOfSound / wavelength;
};