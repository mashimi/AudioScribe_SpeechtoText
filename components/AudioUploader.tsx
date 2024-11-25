"use client";
import React, { useState, useRef, useEffect } from "react";
import { Mic, Upload, Loader2, StopCircle, Volume2, FileAudio } from "lucide-react";
import TranscriptionResult from "./TranscriptionResult";
import AudioVisualizer from "./AudioVisualizer";
import { useHasBrowser } from "../lib/useHasBrowser";

const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"];

const isMobileOrTabletDevice = () => {
  const userAgent = navigator.userAgent;
  const isMobileOrTablet = /Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 1280; // Common threshold for tablet/phone sizes
  return isMobileOrTablet || isSmallScreen;
};

const AudioUploader = () => {
  const hasBrowser = useHasBrowser();
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isMobileModalVisible, setIsMobileModalVisible] = useState(false); // New state for mobile modal visibility

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isMobileOrTabletDevice()) {
      setIsMobileModalVisible(true); // Show modal if the device is mobile or tablet
    }
  }, []);

  useEffect(() => {
    if (hasBrowser) {
      const speechSupported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setIsSpeechSupported(speechSupported);
    }
  }, [hasBrowser]);

  useEffect(() => {
    if (!hasBrowser) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;  // Stop the execution if SpeechRecognition is not available
    }

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onresult = (event: any) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }
        setTranscription(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [hasBrowser]);

  const handleFileChange = (selectedFile: File) => {
    setError("");

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Please upload an MP3, WAV, or M4A file");
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 25 MB.");
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(selectedFile);
    setAudioUrl(URL.createObjectURL(selectedFile));

    if (isRecording) {
      handleStopRecording();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleStartRecording = async () => {
    if (recognitionRef.current && !isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(stream);
        recognitionRef.current.start();
        
        setIsRecording(true);
        
        
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setError("Microphone access denied or not available.");
      }
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsLoading(true);
    setError("");
    setTranscription("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to transcribe audio");
      }

      setTranscription(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transcribe audio");
    } finally {
      setIsLoading(false);
    }
  };

return (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 p-6 relative">
    {/* Mobile/tablet Modal */}
    {isMobileModalVisible && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-11/12 max-w-lg shadow-lg transform transition-transform duration-300">
          <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 text-center">
          Limited Mobile Support
          </h2>
          <p className="mt-4 text-gray-700 dark:text-gray-300 text-center">
          For the best experience, please use a laptop or PC. <br /><br />Due to technical limitations with the current code and Groq SDK, live voice transcription will not work on mobile, but file uploads functions perfectly.
          </p>
          <button
            onClick={() => setIsMobileModalVisible(false)} // Close modal on button click
            className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-center"
          >
            Close
          </button>
        </div>
      </div>
    )}

    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          DarScribe
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Click the Record button for Live Transcription or Upload a file for Visualization
          <br />{" "}
          <span className="text-gray-600 dark:text-gray-300">
            (Download Sample Audio Files{" "}
            <a
              href="https://drive.google.com/drive/folders/1_b7KfwnisUJmqEQXH1Sh1BBbisaMIJNg?usp=sharing"
              className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-200"
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>
            )
          </span>
        </p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Upload & Controls */}
        <div className="space-y-6">
          {/* Upload Card */}
          <div className="relative group">
            <div
              className={`p-8 rounded-2xl backdrop-blur-xl transition-all duration-300 ${
                isRecording
                  ? "bg-red-50/90 dark:bg-red-900/20 border-2 border-red-500 shadow-lg shadow-red-500/20"
                  : "bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center space-y-6">
                {/* Icon Container */}
                <div
                  className={`p-4 rounded-full transition-transform duration-300 group-hover:scale-110 ${
                    isRecording
                      ? "bg-red-100 dark:bg-red-900/50"
                      : "bg-indigo-100 dark:bg-indigo-900/50"
                  }`}
                >
                  {isRecording ? (
                    <FileAudio className="w-8 h-8 text-red-600 dark:text-red-400" />
                  ) : (
                    <FileAudio className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>

                {/* Upload Text */}
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    {isRecording ? "Recording in Progress" : "Drop your audio file here"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isRecording ? "Your audio is being captured..." : "or click to select a file"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Supports MP3 WAV, M4A (max 25MB)
                  </p>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  accept={ALLOWED_TYPES.join(",")}
                  className="hidden"
                />

                {/* Upload Button */}
                {!isRecording && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    Choose File
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Visualizer Card */}
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Audio Visualization
              </h3>
            </div>
            <AudioVisualizer
              audioUrl={audioUrl} // Only use audioUrl when not recording
              mediaStream={mediaStream} // Pass mediaStream only during recording
              isLive={isRecording}
            />
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleSubmit}
              disabled={!file || isLoading}
              className={`
                py-4 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
                ${
                  !file || isLoading
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
                }
               `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Transcribe
                </>
              )}
            </button>

            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!isSpeechSupported}
              className={`py-4 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
                      ${
                        isRecording
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
                      }`}
            >
              {isRecording ? (
                <>
                  <StopCircle className="w-5 h-5" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Record
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400 animate-pulse" />
              {error}
            </div>
          )}
        </div>

        {/* Right Column - Transcription */}
        <div className="relative">
          {transcription ? (
            <TranscriptionResult text={transcription} />
          ) : (
            <div className="h-full min-h-[400px] bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 p-8 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Your Transcription will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default AudioUploader;
