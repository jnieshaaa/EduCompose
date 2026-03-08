import { useState, useEffect } from 'react';
import { fetchAcademicSettings, type AcademicSettings } from '../services/academicService';

export function useAcademicContext() {
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchAcademicSettings();
      setAcademicSettings(data);
      setIsLoading(false);
    }
    load();
  }, []);

  const currentAY = academicSettings 
    ? `${academicSettings.ay_start}-${academicSettings.ay_end}` 
    : '';
  
  const currentSemester = academicSettings?.current_semester || '';

  return {
    academicSettings,
    currentAY,
    currentSemester,
    isLoading
  };
}
