
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// FIX: Import Dispatch and SetStateAction from react and use them to fix namespace errors.
function useLocalStorage<T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // This effect is not strictly necessary with the current setup, but good for syncing across tabs in more complex scenarios.
    // For this app, the direct `setValue` is sufficient.
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;