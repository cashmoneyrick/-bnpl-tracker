import { useCallback, useEffect, useRef } from 'react';
import type { Stage } from 'konva/lib/Stage';
import { useCanvasStore } from '../../../store/canvasStore';
import type { ImageElement } from '../../../types/canvas';

interface UseImageUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_MAX_SIZE = 1920;

export function useImageUpload(
  stageRef: React.RefObject<Stage | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseImageUploadOptions = {}
) {
  const { maxWidth = DEFAULT_MAX_SIZE, maxHeight = DEFAULT_MAX_SIZE, quality = 0.9 } = options;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addElement = useCanvasStore((state) => state.addElement);
  const viewport = useCanvasStore((state) => state.viewport);
  const activeTool = useCanvasStore((state) => state.activeTool);

  // Convert file to base64 data URL with optional resizing
  const fileToDataUrl = useCallback(
    (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;

            // Resize if needed
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            // Create canvas for potential resize and compression
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG for smaller size, or PNG for transparency
            const isTransparent = file.type === 'image/png' || file.type === 'image/gif';
            const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType, quality);

            resolve({ dataUrl, width, height });
          };

          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    [maxWidth, maxHeight, quality]
  );

  // Add image element to canvas
  const addImageToCanvas = useCallback(
    async (file: File, x?: number, y?: number) => {
      try {
        const { dataUrl, width, height } = await fileToDataUrl(file);

        // Calculate position (center of viewport if not specified)
        const stage = stageRef.current;
        let posX = x ?? 100;
        let posY = y ?? 100;

        if (stage && x === undefined && y === undefined) {
          const stageWidth = stage.width();
          const stageHeight = stage.height();
          posX = (stageWidth / 2 - viewport.x) / viewport.scale - width / 2;
          posY = (stageHeight / 2 - viewport.y) / viewport.scale - height / 2;
        } else if (x !== undefined && y !== undefined) {
          // Convert screen coords to canvas coords
          posX = (x - viewport.x) / viewport.scale;
          posY = (y - viewport.y) / viewport.scale;
        }

        const imageElement: Omit<ImageElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
          type: 'image',
          x: posX,
          y: posY,
          width,
          height,
          src: dataUrl,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
        };

        addElement(imageElement);
      } catch (error) {
        console.error('Failed to add image:', error);
      }
    },
    [fileToDataUrl, stageRef, viewport, addElement]
  );

  // Handle file input change
  const handleFileSelect = useCallback(
    (e: Event) => {
      const input = e.target as HTMLInputElement;
      const files = input.files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          addImageToCanvas(file);
        }
      });

      // Reset input
      input.value = '';
    },
    [addImageToCanvas]
  );

  // Create hidden file input
  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    input.addEventListener('change', handleFileSelect);
    document.body.appendChild(input);
    fileInputRef.current = input;

    return () => {
      input.removeEventListener('change', handleFileSelect);
      document.body.removeChild(input);
    };
  }, [handleFileSelect]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            addImageToCanvas(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addImageToCanvas, containerRef]);

  // Handle drag and drop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Get drop position
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          addImageToCanvas(file, x, y);
        }
      });
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [addImageToCanvas, containerRef]);

  return {
    openFilePicker,
    addImageToCanvas,
    isImageToolActive: activeTool === 'image',
  };
}
