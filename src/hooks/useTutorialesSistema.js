import { useEffect, useState } from 'react';
import API from '../services/api';

export default function useTutorialesSistema() {
  const [videos, setVideos] = useState({});

  useEffect(() => {
    let vigente = true;
    API.get('/tutoriales')
      .then(({ data }) => { if (vigente) setVideos(data?.videos || {}); })
      .catch(() => { /* La configuración sigue disponible si falla el tutorial. */ });
    return () => { vigente = false; };
  }, []);

  return videos;
}
