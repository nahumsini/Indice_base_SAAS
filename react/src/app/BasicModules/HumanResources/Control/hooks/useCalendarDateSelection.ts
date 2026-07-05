import {
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AttendanceCalendarDay } from '../../../../api/humanResources';

interface UseCalendarDateSelectionParams {
  isSelectionMode: boolean;
  setControlDate: Dispatch<SetStateAction<string>>;
  setSelectedCalendarDay: Dispatch<SetStateAction<AttendanceCalendarDay | null>>;
}

export function useCalendarDateSelection({
  isSelectionMode,
  setControlDate,
  setSelectedCalendarDay,
}: UseCalendarDateSelectionParams) {
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<string[]>([]);
  const isCalendarDateSelectionActive = useRef(false);
  const didDragCalendarDateSelection = useRef(false);
  const calendarDateSelectionLastDate = useRef<string | null>(null);
  const calendarDateSelectionLastDay = useRef<AttendanceCalendarDay | null>(null);
  const suppressCalendarDateClick = useRef(false);
  const selectedCalendarDatesRef = useRef<string[]>([]);

  useEffect(() => {
    selectedCalendarDatesRef.current = selectedCalendarDates;
  }, [selectedCalendarDates]);

  const selectedCalendarDateSet = useMemo(
    () => new Set(selectedCalendarDates),
    [selectedCalendarDates],
  );

  const startCalendarDateSelection = useCallback((
    date: string,
    event: PointerEvent<HTMLButtonElement>,
    day: AttendanceCalendarDay | null,
  ) => {
    if (!isSelectionMode) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    isCalendarDateSelectionActive.current = true;
    didDragCalendarDateSelection.current = false;
    calendarDateSelectionLastDate.current = date;
    calendarDateSelectionLastDay.current = day;
    setSelectedCalendarDay(null);
    setControlDate(date);
    selectedCalendarDatesRef.current = [date];
    setSelectedCalendarDates([date]);
  }, [isSelectionMode, setControlDate, setSelectedCalendarDay]);

  const extendCalendarDateSelection = useCallback((date: string, day: AttendanceCalendarDay | null) => {
    if (!isCalendarDateSelectionActive.current) {
      return;
    }

    calendarDateSelectionLastDate.current = date;
    calendarDateSelectionLastDay.current = day;
    setSelectedCalendarDates((current) => {
      if (current.includes(date)) {
        selectedCalendarDatesRef.current = current;
        return current;
      }

      const nextDates = [...current, date];
      selectedCalendarDatesRef.current = nextDates;
      didDragCalendarDateSelection.current = true;
      return nextDates;
    });
  }, []);

  const finishCalendarDateSelection = useCallback(() => {
    if (!isCalendarDateSelectionActive.current) {
      return;
    }

    const date = calendarDateSelectionLastDate.current;
    const day = calendarDateSelectionLastDay.current;
    const shouldKeepMultiSelection = didDragCalendarDateSelection.current || selectedCalendarDatesRef.current.length > 1;
    isCalendarDateSelectionActive.current = false;
    didDragCalendarDateSelection.current = false;
    calendarDateSelectionLastDate.current = null;
    calendarDateSelectionLastDay.current = null;

    if (date) {
      setControlDate(date);
    }

    if (shouldKeepMultiSelection) {
      suppressCalendarDateClick.current = true;
      setSelectedCalendarDay(null);
      return;
    }

    selectedCalendarDatesRef.current = [];
    setSelectedCalendarDates([]);
    if (day) {
      setSelectedCalendarDay(day);
    }
  }, [setControlDate, setSelectedCalendarDay]);

  useEffect(() => {
    window.addEventListener('pointerup', finishCalendarDateSelection);
    window.addEventListener('pointercancel', finishCalendarDateSelection);

    return () => {
      window.removeEventListener('pointerup', finishCalendarDateSelection);
      window.removeEventListener('pointercancel', finishCalendarDateSelection);
    };
  }, [finishCalendarDateSelection]);

  const clearCalendarDateSelection = useCallback(() => {
    isCalendarDateSelectionActive.current = false;
    didDragCalendarDateSelection.current = false;
    calendarDateSelectionLastDate.current = null;
    calendarDateSelectionLastDay.current = null;
    selectedCalendarDatesRef.current = [];
    setSelectedCalendarDates([]);
  }, []);

  useEffect(() => {
    if (!isSelectionMode) {
      clearCalendarDateSelection();
    }
  }, [clearCalendarDateSelection, isSelectionMode]);

  const selectCalendarDay = useCallback((dateKey: string, day: AttendanceCalendarDay | null) => {
    if (suppressCalendarDateClick.current) {
      suppressCalendarDateClick.current = false;
      return;
    }
    if (isSelectionMode) {
      setControlDate(dateKey);
      setSelectedCalendarDay(null);
      setSelectedCalendarDates((current) => {
        const nextDates = current.includes(dateKey)
          ? current.filter((date) => date !== dateKey)
          : [...current, dateKey].sort();
        selectedCalendarDatesRef.current = nextDates;
        return nextDates;
      });
      return;
    }
    if (!selectedCalendarDatesRef.current.includes(dateKey)) {
      setControlDate(dateKey);
    }
    if (day && selectedCalendarDatesRef.current.length <= 1) {
      setSelectedCalendarDay(day);
    }
  }, [isSelectionMode, setControlDate, setSelectedCalendarDay]);

  return {
    selectedCalendarDates,
    selectedCalendarDateSet,
    startCalendarDateSelection,
    extendCalendarDateSelection,
    clearCalendarDateSelection,
    selectCalendarDay,
  };
}
