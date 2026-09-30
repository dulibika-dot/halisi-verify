import { useEffect } from 'react';
import { APP_NAME } from '../services/config';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);
}
