import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'chat_include_profile';

export function useChatProfileAttachmentPreference() {
  const [includeProfile, setIncludeProfileState] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted) {
          return;
        }
        if (value === 'true') {
          setIncludeProfileState(true);
        }
        if (value === 'false') {
          setIncludeProfileState(false);
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

  const setIncludeProfile = useCallback((next: boolean) => {
    setIncludeProfileState(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? 'true' : 'false').catch(() => undefined);
  }, []);

  return { includeProfile, setIncludeProfile, loaded };
}

