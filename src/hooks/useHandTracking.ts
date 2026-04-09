import { useEffect, useRef, useState } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandTrackingResult {
  results: Results | null;
  isLoading: boolean;
  error: string | null;
}

export function useHandTracking(
  videoElement: HTMLVideoElement | null, 
  facingMode: 'user' | 'environment' = 'user',
  trackingConfidence: number = 0.5
) {
  const [tracking, setTracking] = useState<HandTrackingResult>({
    results: null,
    isLoading: true,
    error: null,
  });
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    if (!videoElement) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: trackingConfidence,
      minTrackingConfidence: trackingConfidence,
    });

    hands.onResults((results) => {
      setTracking({ results, isLoading: false, error: null });
    });

    handsRef.current = hands;

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 1280,
      height: 720,
      facingMode: facingMode,
    });

    camera.start()
      .then(() => {
        console.log('Camera started with facingMode:', facingMode);
      })
      .catch((err) => {
        setTracking(prev => ({ ...prev, isLoading: false, error: 'Failed to start camera' }));
        console.error(err);
      });

    cameraRef.current = camera;

    return () => {
      camera.stop();
      hands.close();
    };
  }, [videoElement, facingMode]);

  // Dynamic update of confidence
  useEffect(() => {
    if (handsRef.current) {
      handsRef.current.setOptions({
        minDetectionConfidence: trackingConfidence,
        minTrackingConfidence: trackingConfidence,
      });
    }
  }, [trackingConfidence]);

  return tracking;
}
