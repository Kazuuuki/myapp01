import { Stack, useLocalSearchParams } from 'expo-router';

import { formatDateLocal } from '@/src/models/dates';
import { SessionDayScreen } from '@/src/ui/SessionDayScreen';

export default function HistoryDateEditScreen() {
  const params = useLocalSearchParams();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const date = typeof rawDate === 'string' ? rawDate : formatDateLocal(new Date());

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SessionDayScreen date={date} title="Edit" subtitle={date} showBack />
    </>
  );
}
