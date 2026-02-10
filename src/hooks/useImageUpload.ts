'use client';
import { useCallback } from 'react';
import type { PatternAction } from '@/types';

export function useImageUpload(dispatch: React.Dispatch<PatternAction>) {
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        dispatch({ type: 'SET_IMAGE', payload: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  }, [dispatch]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return { onDrop, onDragOver, onFileSelect };
}
