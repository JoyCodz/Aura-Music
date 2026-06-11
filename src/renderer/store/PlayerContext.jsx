import React, { createContext, useContext, useReducer } from 'react';

const PlayerContext = createContext(null);

const initialState = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none', // 'none' | 'one' | 'all'
  currentView: 'home',
  viewData: null,
  queueOpen: false,
  authModalOpen: false,
  aboutModalOpen: false,
  lyricsOpen: false,
};

function playerReducer(state, action) {
  switch (action.type) {
    case 'PLAY_TRACK': {
      const { track, queue } = action.payload;
      const queueIndex = queue ? queue.findIndex(t => t.videoId === track.videoId) : 0;
      return {
        ...state,
        currentTrack: track,
        queue: queue || [track],
        queueIndex: queueIndex >= 0 ? queueIndex : 0,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
      };
    }
    case 'JUMP_TO_TRACK': {
      const index = action.payload;
      if (index < 0 || index >= state.queue.length) return state;
      return {
        ...state,
        currentTrack: state.queue[index],
        queueIndex: index,
        isPlaying: true,
        currentTime: 0,
      };
    }
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'NEXT_TRACK': {
      let nextIndex;
      if (state.shuffle) {
        nextIndex = Math.floor(Math.random() * state.queue.length);
      } else {
        nextIndex = state.queueIndex + 1;
        if (nextIndex >= state.queue.length) {
          if (state.repeat === 'all') nextIndex = 0;
          else return { ...state, isPlaying: false };
        }
      }
      const nextTrack = state.queue[nextIndex];
      return { ...state, currentTrack: nextTrack, queueIndex: nextIndex, isPlaying: true, currentTime: 0 };
    }
    case 'PREV_TRACK': {
      let prevIndex = state.queueIndex - 1;
      if (prevIndex < 0) prevIndex = 0;
      const prevTrack = state.queue[prevIndex];
      return { ...state, currentTrack: prevTrack, queueIndex: prevIndex, isPlaying: true, currentTime: 0 };
    }
    case 'SET_PROGRESS':
      return { ...state, currentTime: action.payload.currentTime, duration: action.payload.duration };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle };
    case 'TOGGLE_REPEAT': {
      const modes = ['none', 'all', 'one'];
      const nextMode = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
      return { ...state, repeat: nextMode };
    }
    case 'APPEND_TO_QUEUE':
      return { ...state, queue: [...state.queue, ...action.payload] };
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.payload] };
    case 'REMOVE_FROM_QUEUE': {
      const newQueue = [...state.queue];
      newQueue.splice(action.payload, 1);
      return { ...state, queue: newQueue };
    }
    case 'SET_VIEW':
      return {
        ...state,
        currentView: action.payload.view || action.payload,
        viewData: action.payload.data || null,
      };
    case 'TOGGLE_QUEUE':
      return { ...state, queueOpen: !state.queueOpen };
    case 'TOGGLE_LYRICS':
      return { ...state, lyricsOpen: !state.lyricsOpen, queueOpen: state.lyricsOpen ? state.queueOpen : false };
    case 'TOGGLE_AUTH_MODAL':
      return { ...state, authModalOpen: !state.authModalOpen };
    case 'TOGGLE_ABOUT_MODAL':
      return { ...state, aboutModalOpen: !state.aboutModalOpen };
    default:
      return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  return (
    <PlayerContext.Provider value={{ state, dispatch }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
