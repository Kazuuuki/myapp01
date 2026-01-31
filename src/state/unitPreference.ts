import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { WeightUnit } from '@/src/models/types';

const STORAGE_KEY = 'unit_preference';

export function useUnitPreference() {
  const [unit, setUnitState] = useState<WeightUnit>('kg');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (mounted && (value === 'kg' || value === 'lb')) {
          setUnitState(value);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setUnit = useCallback((nextUnit: WeightUnit) => {
    setUnitState(nextUnit);
    AsyncStorage.setItem(STORAGE_KEY, nextUnit).catch(() => undefined);
  }, []);

  return { unit, setUnit, loaded };
}
