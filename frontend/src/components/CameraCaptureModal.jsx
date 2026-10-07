import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, RefreshCw, Check, X, AlertTriangle, SwitchCamera, Upload } from 'lucide-react';

export default function CameraCaptureModal({ isOpen, onClose, onPhotoCaptured, onFallbackUpload }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [error, setError] = useState(null);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [timestampStr, setTimestampStr] = useState('');

  // Stop camera stream safely
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check if multiple camera devices exist
  const checkCameraDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (facing = facingMode) => {
    stopStream();
    setError(null);
    setLoadingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        window.isSecureContext === false
          ? t('camera.httpsError')
          : t('camera.noCameraError')
      );
      setLoadingCamera(false);
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoadingCamera(false);
      checkCameraDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      setLoadingCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(t('camera.permissionError'));
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError(t('camera.noCameraError'));
      } else {
        setError(`${t('camera.genericError')} ${err.message || err.name}`);
      }
    }
  }, [facingMode, stopStream, checkCameraDevices, t]);

  useEffect(() => {
    if (isOpen) {
      setCapturedBlob(null);
      setCapturedPreview(null);
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  // Switch between front and back camera
  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture frame & burn watermark timestamp onto canvas
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame onto canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Generate formatted date-time string
    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const formatted = `${dateFormatted} ${timeFormatted} • khojbeen.ai`;
    setTimestampStr(formatted);

    // Burn timestamp into image (bottom-right badge)
    const fontSize = Math.max(16, Math.round(width * 0.024));
    ctx.font = `bold ${fontSize}px sans-serif`;

    const paddingX = fontSize * 0.8;
    const paddingY = fontSize * 0.4;
    const textMetrics = ctx.measureText(formatted);
    const badgeWidth = textMetrics.width + paddingX * 2;
    const badgeHeight = fontSize + paddingY * 2;

    const badgeX = width - badgeWidth - fontSize;
    const badgeY = height - badgeHeight - fontSize;

    // Draw dark semi-transparent pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
    }

    // Draw subtle golden brand dot
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(badgeX + paddingX * 0.6, badgeY + badgeHeight / 2, fontSize * 0.22, 0, 2 * Math.PI);
    ctx.fill();

    // Draw crisp white text
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(formatted, badgeX + paddingX * 1.3, badgeY + badgeHeight - paddingY * 1.1);

    // Convert canvas to Blob & File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const fileName = `live_photo_${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);
          setCapturedBlob(file);
          setCapturedPreview(previewUrl);
          stopStream();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo: restart camera stream
  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    startCamera(facingMode);
  };

  // Use captured photo: send to parent and close modal
  const handleUsePhoto = () => {
    if (capturedBlob && capturedPreview) {
      onPhotoCaptured(capturedBlob, capturedPreview);
      onClose();
    }
  };

  const handleModalClose = () => {
    stopStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <h2 id="camera-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('camera.modalTitle')}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport / Captured Preview */}
        <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm text-red-200 leading-relaxed">{error}</p>
              {onFallbackUpload && (
                <button
                  type="button"
                  onClick={() => {
                    handleModalClose();
                    onFallbackUpload();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('lost.uploadPhoto')}</span>
                </button>
              )}
            </div>
          ) : capturedPreview ? (
            <div className="relative w-full h-full">
              <img
                src={capturedPreview}
                alt="Live photo capture preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 backdrop-blur-md text-white px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-sm">
                <Check className="w-3.5 h-3.5" />
                <span>Captured with Timestamp</span>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {loadingCamera && (
                <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-white text-xs font-semibold gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                  <span>Accessing camera...</span>
                </div>
              )}
              {/* Watermark preview hint */}
              <div className="absolute bottom-2.5 right-2.5 bg-slate-950/70 text-slate-300 text-[10px] px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                {t('camera.watermarkNote')}
              </div>
            </>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {error ? (
            <button
              type="button"
              onClick={handleModalClose}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              {t('common.close')}
            </button>
          ) : capturedPreview ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 min-h-[44px] py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('camera.retake')}</span>
              </button>

              <button
                type="button"
                onClick={handleUsePhoto}
                className="flex-1 min-h-[44px] py-2 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{t('camera.usePhoto')}</span>
              </button>
            </>
          ) : (
            <>
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  disabled={loadingCamera}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  title={t('camera.switchCamera')}
                >
                  <SwitchCamera className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span className="hidden sm:inline">{t('camera.switchCamera')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCapture}
                disabled={loadingCamera}
                className="flex-1 min-h-[44px] py-2.5 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm ml-auto"
              >
                <Camera className="w-4 h-4" />
                <span>{t('camera.capture')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
