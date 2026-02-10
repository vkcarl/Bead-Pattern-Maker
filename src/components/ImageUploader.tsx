'use client';
import { useRef } from 'react';

interface ImageUploaderProps {
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUploader({ onDrop, onDragOver, onFileSelect }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
    >
      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-sm text-gray-600 mb-1">拖拽图片到这里，或点击选择</p>
      <p className="text-xs text-gray-400">支持 JPG, PNG, GIF, WebP</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
}
