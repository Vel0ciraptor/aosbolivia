'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
  disabled?: boolean;
}

export default function VoiceDictationButton({
  onTranscript,
  className = '',
  size = 'md',
  title = 'Dictar por voz (Español)',
  disabled = false,
}: VoiceDictationButtonProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = () => {
    if (!isSupported) {
      alert('Tu navegador no soporta reconocimiento de voz nativo. Prueba en Chrome o Edge.');
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-BO'; // Español de Bolivia / general
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          onTranscript(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Permiso de micrófono denegado');
        } else if (event.error === 'no-speech') {
          // No detectó voz, nada grave
        } else {
          setErrorMessage(`Error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setErrorMessage(err.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Reconocimiento de voz no soportado en este navegador"
        className={`p-1.5 text-zinc-600 rounded-lg cursor-not-allowed opacity-50 ${className}`}
      >
        <MicOff className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? 'Detener dictado' : title}
        className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
          disabled
            ? 'text-zinc-600 cursor-not-allowed opacity-50'
            : isListening
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse scale-105'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
        } ${className}`}
      >
        {isListening ? (
          <span className="flex items-center gap-1">
            <Mic className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-500 animate-pulse`} />
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          </span>
        ) : (
          <Mic className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        )}
      </button>
      {errorMessage && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-950 border border-red-800 text-[10px] text-red-200 rounded whitespace-nowrap z-50 shadow-lg">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
