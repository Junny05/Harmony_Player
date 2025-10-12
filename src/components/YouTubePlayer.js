import React, { useEffect, useRef, useState } from 'react';
import { Settings, Music4 } from 'lucide-react';
import Equalizer from './Equalizer';

const YouTubePlayer = ({ videoId, onStateChange, onReady }) => {
  const playerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const pannerRef = useRef(null);
  const reverbRef = useRef(null);
  const animationRef = useRef(null);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [is8DEnabled, setIs8DEnabled] = useState(false);

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
                const convolver = audioContextRef.current.createConvolver();
                reverbRef.current = convolver;
                
                // Generate impulse response for reverb
                const sampleRate = audioContextRef.current.sampleRate;
                const length = 2 * sampleRate; // 2 seconds
                const impulse = audioContextRef.current.createBuffer(2, length, sampleRate);
                for (let channel = 0; channel < 2; channel++) {
                  const channelData = impulse.getChannelData(channel);
                  for (let i = 0; i < length; i++) {
                    channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.5));
                  }
                }
                convolver.buffer = impulse;
                
                // Connect nodes
                source.connect(panner);
                panner.connect(convolver);
                convolver.connect(audioContextRef.current.destination);
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

  const toggle8DAudio = async () => {
    if (!audioContextRef.current || !pannerRef.current) return;
    
    // Resume audio context if needed
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn('Could not resume audio context:', error);
        return;
      }
    }
    
    const newState = !is8DEnabled;
    setIs8DEnabled(newState);
    
    if (newState) {
      // Start 8D effect
      const startTime = audioContextRef.current.currentTime;
      const animate = () => {
        if (!audioContextRef.current || !pannerRef.current || !is8DEnabled) return;
        
        const time = audioContextRef.current.currentTime - startTime;
        // Create smooth panning effect (cycle every 8 seconds)
        const panValue = Math.sin(time * Math.PI / 4);
        pannerRef.current.pan.setValueAtTime(panValue, audioContextRef.current.currentTime);
        
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      // Stop 8D effect
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (pannerRef.current) {
        pannerRef.current.pan.setValueAtTime(0, audioContextRef.current.currentTime);
      }
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
          className={is8DEnabled ? "p-2 rounded-lg transition-colors bg-blue-700/30" : "p-2 rounded-lg transition-colors bg-blue-800/30 hover:bg-blue-700/30"}
          title="Toggle 8D Audio"
        >
          <Music4 className={is8DEnabled ? "w-5 h-5 text-blue-300" : "w-5 h-5 text-blue-400"} />
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
    </>
  );
};

export default YouTubePlayer;
