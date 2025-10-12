import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Play, Pause } from 'lucide-react';

const Equalizer = ({ isPlaying }) => {
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(32).fill(0));
  const requestRef = useRef();
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    // Initialize Web Audio API
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      // Reset visualization when not playing
      setFrequencyData(new Uint8Array(32).fill(0));
      return;
    }

    const animate = () => {
      const tempFrequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(tempFrequencyData);
      setFrequencyData(tempFrequencyData);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / 32;
    const barSpacing = 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw bars
    frequencyData.forEach((value, index) => {
      const normalizedValue = value / 255;
      const barHeight = normalizedValue * height;
      const x = index * (barWidth + barSpacing);
      const y = height - barHeight;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, '#60A5FA'); // Blue
      gradient.addColorStop(1, '#3B82F6'); // Darker blue

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [frequencyData]);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 flex items-center gap-2 text-blue-400">
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-sm">Equalizer</span>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={100}
        className="w-full rounded-lg bg-blue-900/20"
      />
    </div>
  );
};

export default Equalizer;