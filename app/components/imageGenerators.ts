// src/utils/imageGenerators.ts

export const generateProfilePic = (name: string): string => {
    // ... (Your implementation here, using initials for placeholder)
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2); 
    const text = initials.length > 0 ? initials : 'P';
    return `https://via.placeholder.com/128/4C4D4F/FFFFFF?text=${text}`; 
};

export const generateCoverPhoto = (name: string): string => {
    // ... (Your implementation here for a cover photo placeholder)
    return `https://via.placeholder.com/1000x200/5C6BC0/FFFFFF?text=JobMap+Profile+Header`;
};