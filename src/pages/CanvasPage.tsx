import { useEffect } from 'react';
import { Canvas } from '../components/canvas/Canvas';
import { useCanvasStore } from '../store/canvasStore';

export function CanvasPage() {
  const initialize = useCanvasStore((state) => state.initialize);
  const isLoading = useCanvasStore((state) => state.isLoading);
  const isInitialized = useCanvasStore((state) => state.isInitialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading canvas...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col -m-6">
      <Canvas />
    </div>
  );
}
