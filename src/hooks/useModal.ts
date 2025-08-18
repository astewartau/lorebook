import { useState } from 'react';

export function useModal<T = any>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);
  
  const open = (modalData?: T) => {
    setData(modalData || null);
    setIsOpen(true);
  };
  
  const close = () => {
    setIsOpen(false);
    setData(null);
  };
  
  return { isOpen, data, open, close };
}