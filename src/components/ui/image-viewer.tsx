'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from './button';

interface ImageViewerProps {
  imageUrl: string;
  children: ({
    openImageViewer,
  }: {
    openImageViewer: () => void;
  }) => React.ReactNode;
}

export function ImageViewer({ imageUrl, children }: ImageViewerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div onClick={handleOpen} className="cursor-pointer">
        {children({ openImageViewer: handleOpen })}
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 flex items-center justify-between">
          <DialogTitle>Vista Previa</DialogTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
          <img src={imageUrl} alt="Imagen Ampliada" className="object-contain max-w-full max-h-full" />
      </DialogContent>
    </Dialog>  
    </>
  );
}