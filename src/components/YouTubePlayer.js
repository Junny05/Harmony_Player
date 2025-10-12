import React, { useEffect, useRef } from 'react';

const YouTubePlayer = ({ videoId, onStateChange, onReady }) => {
  const playerRef = useRef(null);

  useEffect(() => {
    // Load the YouTube IFrame Player API code asynchronously
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      window.onYouTubeIframeAPIReady = null;
      if (playerRef.current) {
        playerRef.current.destroy();
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
        onReady: onReady,
        onStateChange: onStateChange,
      },
    });
  };

  useEffect(() => {
    if (playerRef.current && videoId) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

  return (
    <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
      <div id="youtube-player" />
    </div>
  );
};

export default YouTubePlayer;
