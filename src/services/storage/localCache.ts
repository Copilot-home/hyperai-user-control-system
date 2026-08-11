import { useEffect, useState } from 'react';

const LOCAL_CACHE_KEY = 'hyperai_local_cache';

export const useLocalCache = () => {
    const [cache, setCache] = useState(() => {
        const storedCache = localStorage.getItem(LOCAL_CACHE_KEY);
        return storedCache ? JSON.parse(storedCache) : {};
    });

    useEffect(() => {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
    }, [cache]);

    const setItem = (key, value) => {
        setCache((prevCache) => ({
            ...prevCache,
            [key]: value,
        }));
    };

    const getItem = (key) => {
        return cache[key];
    };

    const removeItem = (key) => {
        setCache((prevCache) => {
            const newCache = { ...prevCache };
            delete newCache[key];
            return newCache;
        });
    };

    const clearCache = () => {
        setCache({});
    };

    return {
        setItem,
        getItem,
        removeItem,
        clearCache,
    };
};