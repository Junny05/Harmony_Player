import React, { useEffect, useRef, useState } from 'react';
import { Settings, Disc3 } from 'lucide-react';
import Equalizer from './Equalizer';

const YouTubePlayer = ({ videoId, onStateChange, onReady }) => {
  const playerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [is8DEnabled, setIs8DEnabled] = useState(false);
  const pannerRef = useRef(null);
  const reverbRef = useRef(null);
  const panAnimationRef = useRef(null);

  useEffect(() => {
    // Initialize Web Audio API context only on user interaction
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };

    // Load the YouTube IFrame Player API code asynchronously
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = initPlayer;

    // Add one-time click listener to initialize audio context
    document.addEventListener('click', initAudioContext, { once: true });

    return () => {
      window.onYouTubeIframeAPIReady = null;
      document.removeEventListener('click', initAudioContext);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (audioContextRef.current) {
        // Disconnect source node before closing context
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const initPlayer = () => {
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '360',
      width: '640',
      videoId: videoId,
      playerVars: {
        playsinline: 1,
        controls: 0,
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event) => {
          // Connect YouTube player to Web Audio API
          if (!audioContextRef.current) {
            console.warn('Audio context not initialized');
            if (onReady) onReady(event);
            return;
          }

          try {
            // Wait for iframe to be ready
            setTimeout(() => {
              const iframe = event.target.getIframe();
              if (!iframe) {
                console.warn('Could not find iframe');
                return;
              }
              
              const mediaElement = iframe.contentWindow?.document?.querySelector('video');
              if (!mediaElement) {
                console.warn('Could not find video element');
                return;
              }

              // Only create source node if it doesn't exist
              if (!sourceNodeRef.current) {
                const source = audioContextRef.current.createMediaElementSource(mediaElement);
                sourceNodeRef.current = source;

                // Create panner node
                const panner = audioContextRef.current.createStereoPanner();
                pannerRef.current = panner;

                // Create convolver node for reverb
                const reverb = audioContextRef.current.createConvolver();
                reverbRef.current = reverb;

                // Create impulse response for reverb
                const sampleRate = audioContextRef.current.sampleRate;
                const length = sampleRate * 2; // 2 seconds reverb
                const impulse = audioContextRef.current.createBuffer(2, length, sampleRate);
                for (let channel = 0; channel < 2; channel++) {
                  const channelData = impulse.getChannelData(channel);
                  for (let i = 0; i < length; i++) {
                    channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.5));
                  }
                }
                reverb.buffer = impulse;

                // Connect nodes
                source.connect(panner);
                panner.connect(reverb);
                reverb.connect(audioContextRef.current.destination);
              }
            }, 100); // Give time for iframe content to load
          } catch (error) {
            console.warn('Could not connect audio context:', error);
          }
          
          if (onReady) {
            onReady(event);
          }
        },
        onStateChange: onStateChange,
      },
    });
  };

  useEffect(() => {
    if (playerRef.current && videoId) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

  const toggleEqualizer = async () => {
    // Check if audio context exists and initialize if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume audio context if it's suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn('Could not resume audio context:', error);
      }
    }
    
    setShowEqualizer(!showEqualizer);
  };

  const toggle8DAudio = () => {
    if (!audioContextRef.current || !sourceNodeRef.current || !pannerRef.current) return;

    setIs8DEnabled(!is8DEnabled);
    
    if (!is8DEnabled) {
      // Start 8D effect
      const startPanning = () => {
        const time = audioContextRef.current.currentTime;
        // Create oscillating panning effect (8 second cycle)
        pannerRef.current.pan.setValueAtTime(0, time);
        pannerRef.current.pan.linearRampToValueAtTime(1, time + 2);
        pannerRef.current.pan.linearRampToValueAtTime(0, time + 4);
        pannerRef.current.pan.linearRampToValueAtTime(-1, time + 6);
        pannerRef.current.pan.linearRampToValueAtTime(0, time + 8);
      };

      // Start initial panning
      startPanning();

      // Schedule repeated panning
      panAnimationRef.current = setInterval(() => {
        startPanning();
      }, 8000);

    } else {
      // Stop 8D effect
      if (panAnimationRef.current) {
        clearInterval(panAnimationRef.current);
        panAnimationRef.current = null;
      }
      pannerRef.current.pan.cancelScheduledValues(audioContextRef.current.currentTime);
      pannerRef.current.pan.setValueAtTime(0, audioContextRef.current.currentTime);
    }
  };

  return (
    <>
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        <div id="youtube-player" />
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={toggleEqualizer}
          className="p-2 rounded-lg bg-blue-800/30 hover:bg-blue-700/30 transition-colors"
          title="Equalizer Settings"
        >
          <Settings className="w-5 h-5 text-blue-400" />
        </button>

        <button
          onClick={toggle8DAudio}
          className={`p-2 rounded-lg transition-colors ${
            is8DEnabled 
              ? 'bg-purple-800/30 hover:bg-purple-700/30' 
              : 'bg-blue-800/30 hover:bg-blue-700/30'
          }`}
          title="Toggle 8D Audio"
        >
          <Disc3 className={`w-5 h-5 ${is8DEnabled ? 'text-purple-400' : 'text-blue-400'} ${
            is8DEnabled ? 'animate-spin' : ''
          }`} />
        </button>
      </div>
      
      {showEqualizer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-4xl w-full mx-4">
            <Equalizer
              audioContext={audioContextRef.current}
              sourceNode={sourceNodeRef.current}
              onClose={() => setShowEqualizer(false)}
            />
          </div>
        </div>
      )}
      
      {showEqualizer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="max-w-4xl w-full mx-4">
            <Equalizer
              audioContext={audioContextRef.current}
              sourceNode={sourceNodeRef.current}
              onClose={() => setShowEqualizer(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default YouTubePlayer;
