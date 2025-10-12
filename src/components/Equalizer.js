import React, { useState, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';

const DEFAULT_GAINS = {
  60: 0,    // Bass
  170: 0,   // Sub Bass
  310: 0,   // Mid-Bass
  600: 0,   // Low Mids
  1000: 0,  // Mids
  3000: 0,  // High Mids
  6000: 0,  // Presence
  12000: 0, // Brilliance
  14000: 0, // Air
  16000: 0  // High End
};

const PRESETS = {
  flat: { name: 'Flat', gains: DEFAULT_GAINS },
  bass: {
    name: 'Bass Boost',
    gains: { ...DEFAULT_GAINS, 60: 7, 170: 5, 310: 3 }
  },
  vocal: {
    name: 'Vocal Boost',
    gains: { ...DEFAULT_GAINS, 1000: 3, 3000: 4, 6000: 3 }
  },
  electronic: {
    name: 'Electronic',
    gains: { ...DEFAULT_GAINS, 60: 4, 170: 3, 6000: 2, 12000: 3, 16000: 4 }
  },
  acoustic: {
    name: 'Acoustic',
    gains: { ...DEFAULT_GAINS, 310: 2, 600: 3, 1000: 2, 3000: 1 }
  }
};

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const Equalizer = ({ audioContext, sourceNode, onClose }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [gains, setGains] = useState(DEFAULT_GAINS);
  const [filters, setFilters] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('flat');

  useEffect(() => {
    if (!audioContext || !sourceNode) return;

    // Create filters for each frequency band
    const newFilters = Object.keys(gains).map(frequency => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = parseFloat(frequency);
      filter.Q.value = 1;
      filter.gain.value = gains[frequency];
      return filter;
    });

    // Connect the filters in series
    if (newFilters.length > 0) {
      sourceNode.disconnect();
      newFilters.reduce((prev, curr) => {
        prev.connect(curr);
        return curr;
      });
      
      // Connect the last filter to the destination
      const lastFilter = newFilters[newFilters.length - 1];
      if (isEnabled) {
        lastFilter.connect(audioContext.destination);
      } else {
        sourceNode.connect(audioContext.destination);
      }
    }

    setFilters(newFilters);

    return () => {
      newFilters.forEach(filter => filter.disconnect());
    };
  }, [audioContext, sourceNode, gains, isEnabled]);

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    setGains(PRESETS[preset].gains);
  };

  const handleGainChange = (frequency, value) => {
    setGains(prev => ({
      ...prev,
      [frequency]: value
    }));

    // Update the corresponding filter's gain
    const filter = filters[Object.keys(gains).indexOf(frequency)];
    if (filter) {
      filter.gain.value = value;
    }
  };

  const formatFrequency = (freq) => {
    return freq >= 1000 ? `${freq/1000}kHz` : `${freq}Hz`;
  };

  return (
    <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-700/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-5 h-5 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Equalizer</h3>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-blue-500 border-blue-400/50 bg-blue-900/50 focus:ring-blue-500"
            />
            <span className="text-blue-200">Enable EQ</span>
          </label>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-blue-200 mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedPreset === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800/50'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {Object.entries(gains).map(([frequency, gain]) => (
          <div key={frequency} className="flex flex-col items-center gap-2">
            <div className="eq-slider-wrapper">
              <input
                type="range"
                min="-12"
                max="12"
                value={gain}
                onChange={(e) => handleGainChange(frequency, parseFloat(e.target.value))}
                className="vertical-slider"
              />
            </div>
            <div className="text-center">
              <div className="text-blue-200 text-sm font-medium">
                {formatFrequency(parseInt(frequency))}
              </div>
              <div className="text-blue-300 text-xs">
                {gain > 0 ? '+' : ''}{gain}dB
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Equalizer;
