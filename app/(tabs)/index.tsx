import { formatDateLocal } from '@/src/models/dates';
import { SessionDayScreen } from '@/src/ui/SessionDayScreen';

export default function TodayScreen() {
  const today = formatDateLocal(new Date());
  return <SessionDayScreen date={today} title="Today" subtitle={today} />;
}
