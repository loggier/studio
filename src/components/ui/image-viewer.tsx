'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from './button';

interface ImageViewerProps {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewer({ imageUrl, open, onOpenChange }: ImageViewerProps) {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className='p-4 flex items-center justify-between'>
          <DialogTitle>Vista Previa</DialogTitle>
          <Button variant='ghost' size='icon' onClick={() => onOpenChange(false)}><X className="w-4 h-4" /></Button>
        </DialogHeader>
        <div className={`w-full h-full flex justify-center items-center ${isFullScreen ? 'fixed top-0 left-0 z-50 bg-black' : ''}`}>
          <img
            src={imageUrl}
            alt="Imagen Ampliada"
            className={`object-contain max-w-full max-h-full ${isFullScreen ? 'w-screen h-screen' : ''}`}
            onClick={toggleFullScreen}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}