import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  Camera, 
  Upload, 
  SwitchCamera, 
  Flashlight, 
  Square, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Keyboard, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  X
} from 'lucide-react';
import SEO from '../components/SEO';
import AnimatedSection from '../components/AnimatedSection';
import Toast from '../components/Toast';

export default function ScanQR() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Mode: 'camera' | 'upload' | 'manual'
  const [mode, setMode] = useState('camera');
  
  // Camera state
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Upload & File state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [decodingFile, setDecodingFile] = useState(false);

  // Manual code state
  const [manualCode, setManualCode] = useState('');

  // Result & toast state
  const [successCode, setSuccessCode] = useState(null);
  const [toast, setToast] = useState(null);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'khojbeen-qr-reader';
  const fileReaderId = 'khojbeen-file-hidden-reader';

  // Helper: validate and extract Khojbeen code (KB-XXXXXXXX)
  const extractKhojbeenCode = (decodedText) => {
    if (!decodedText) return null;
    const text = decodedText.trim();

    // Match KB-XXXXXXXX
    const kbMatch = text.match(/KB-[A-Za-z0-9]+/i);
    if (kbMatch) {
      return kbMatch[0].toUpperCase();
    }

    // Match if full URL contains /tag/KB-XXXX or /item/KB-XXXX
    if (text.includes('/tag/') || text.includes('/item/')) {
      const parts = text.split('/');
      const lastPart = parts[parts.length - 1].split('?')[0].split('#')[0];
      if (lastPart.toUpperCase().startsWith('KB-')) {
        return lastPart.toUpperCase();
      }
    }

    return null;
  };

  const handleScanSuccess = useCallback((decodedText) => {
    const code = extractKhojbeenCode(decodedText);
    if (code) {
      setSuccessCode(code);
      // Stop scanner
      stopCamera();
      // Short delay for success animation, then navigate
      setTimeout(() => {
        navigate(`/tag/${code}`);
      }, 1200);
    } else {
      setToast({
        type: 'error',
        message: t('scanner.invalidQR', 'This is not a recognized Khojbeen QR code.')
      });
    }
  }, [navigate, t]);

  // Start Camera
  const startCamera = useCallback(async (facing = facingMode) => {
    setCameraError(null);
    setCameraLoading(true);

    if (window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError(t('camera.httpsError', 'Camera scanning requires HTTPS or localhost connection.'));
      setCameraLoading(false);
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const qrboxSize = Math.min(Math.min(window.innerWidth - 64, 280), 280);

      await html5QrCodeRef.current.start(
        { facingMode: facing },
        {
          fps: 15,
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // ignore frame decode parse errors
        }
      );

      setIsScanning(true);
      setCameraLoading(false);

      // Check torch capabilities
      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      console.error('Camera start error:', err);
      setIsScanning(false);
      setCameraLoading(false);
      if (err?.name === 'NotAllowedError' || String(err).includes('NotAllowedError')) {
        setCameraError(t('camera.permissionError', 'Camera access was denied. Please allow camera access in your browser settings.'));
      } else if (err?.name === 'NotFoundError' || String(err).includes('NotFoundError')) {
        setCameraError(t('camera.noCameraError', 'No camera detected on this device.'));
      } else {
        setCameraError(err?.message || 'Unable to start camera. Please try gallery upload or manual code entry.');
      }
    }
  }, [facingMode, handleScanSuccess, t]);

  // Stop Camera
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      setIsScanning(false);
    }
  }, []);

  // Toggle Camera (Front / Back)
  const handleToggleFacingMode = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isScanning) {
      await startCamera(nextFacing);
    }
  };

  // Toggle Flashlight/Torch
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch error:', e);
    }
  };

  // Switch tabs & ensure camera is stopped
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch {}
      }
    };
  }, []);

  // Decode file using html5-qrcode
  const handleDecodeFile = async (file) => {
    if (!file) return;
    setDecodingFile(true);
    setCameraError(null);
    try {
      const fileScanner = new Html5Qrcode(fileReaderId);
      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      handleScanSuccess(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setToast({
        type: 'error',
        message: t('scanner.noQRFound', 'No QR code found in this image. Please choose a clearer photo.')
      });
    } finally {
      setDecodingFile(false);
    }
  };

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      handleDecodeFile(file);
    }
  };

  // Drag and drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      handleDecodeFile(file);
    }
  };

  // Paste from clipboard
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setMode('upload');
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            handleDecodeFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Manual code submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = extractKhojbeenCode(manualCode);
    if (code) {
      setSuccessCode(code);
      setTimeout(() => {
        navigate(`/tag/${code}`);
      }, 600);
    } else {
      setToast({
        type: 'error',
        message: 'Invalid code format. Please enter a code like KB-37096D25.'
      });
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-3xl mx-auto min-h-[calc(100vh-14rem)] space-y-6">
      <SEO
        title="QR Scanner - khojbeen.ai"
        description="Scan any Khojbeen item tag instantly using your live camera, gallery image upload, or unique code."
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Hidden file reader DOM element for html5-qrcode */}
      <div id={fileReaderId} className="hidden" aria-hidden="true" />

      {/* Page Header */}
      <AnimatedSection className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold border border-emerald-500/20">
          <QrCode className="w-4 h-4" />
          <span>Khojbeen Smart Tag Scanner</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          {t('scanner.title', 'Khojbeen QR Scanner')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          {t('scanner.subtitle', 'Scan any Khojbeen item tag instantly using your camera, image upload, or manual code.')}
        </p>
      </AnimatedSection>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm max-w-md w-full">
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'camera'
                ? 'bg-white dark:bg-card-dark text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{t('scanner.scanCamera', 'Camera')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'upload'
                ? 'bg-white dark:bg-card-dark text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{t('scanner.uploadGallery', 'Gallery / File')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'manual'
                ? 'bg-white dark:bg-card-dark text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>{t('scanner.enterManually', 'Manual Code')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <AnimatedSection className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8">
        
        {/* Success Modal / Banner */}
        {successCode && (
          <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Khojbeen Tag Decoded!
            </h3>
            <span className="inline-block px-4 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-mono text-sm font-bold border border-emerald-400/30">
              {successCode}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Opening secure scan portal...
            </p>
            <div className="pt-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
            </div>
          </div>
        )}

        {/* MODE 1: LIVE CAMERA SCAN */}
        {!successCode && mode === 'camera' && (
          <div className="space-y-5">
            {cameraError ? (
              <div className="p-6 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-3xl text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
                <h4 className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Camera Unavailable</h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm mx-auto leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('upload')}
                    className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold"
                  >
                    Upload from Gallery
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Scanner Container with animated viewfinder */}
                <div className="relative mx-auto max-w-sm rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 aspect-square flex items-center justify-center shadow-inner">
                  {cameraLoading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 text-white space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                      <span className="text-xs font-bold">Starting camera stream...</span>
                    </div>
                  )}

                  {/* html5-qrcode video element */}
                  <div id={scannerContainerId} className="w-full h-full object-cover" />

                  {/* Viewfinder Target Overlays */}
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-8">
                      <div className="relative w-56 h-56 border-2 border-emerald-500/60 rounded-3xl">
                        {/* 4 Corner Markers */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                        {/* Animated Laser Scanning Line */}
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)] top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Controls Bar */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <SwitchCamera className="w-4 h-4 text-emerald-600" />
                    <span>{t('scanner.switchCamera', 'Flip Camera')}</span>
                  </button>

                  {torchSupported && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        torchOn
                          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 text-amber-800 dark:text-amber-300'
                          : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Flashlight className="w-4 h-4 text-amber-500" />
                      <span>{torchOn ? 'Torch ON' : 'Torch OFF'}</span>
                    </button>
                  )}

                  {isScanning ? (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      <span>{t('scanner.stopCamera', 'Stop')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Scanner</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: GALLERY / FILE UPLOAD */}
        {!successCode && mode === 'upload' && (
          <div className="space-y-5">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-8 text-center space-y-4 bg-slate-50/50 dark:bg-slate-800/30 transition-colors cursor-pointer relative"
            >
              {decodingFile ? (
                <div className="py-8 space-y-2">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Decoding QR code from image...
                  </p>
                </div>
              ) : imagePreview ? (
                <div className="space-y-3">
                  <div className="max-h-56 mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 inline-block shadow-sm">
                    <img src={imagePreview} alt="Selected QR" className="max-h-56 object-contain" />
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Different Photo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Upload a QR Sticker Image
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Drag and drop any screenshot or photo containing a Khojbeen QR sticker, or paste directly from your clipboard (Ctrl + V).
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20">
                    <Upload className="w-4 h-4" />
                    <span>Choose Image from Device</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 3: MANUAL CODE ENTRY */}
        {!successCode && mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4 max-w-md mx-auto py-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                <Keyboard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Enter Khojbeen Tag Code
              </h3>
              <p className="text-xs text-slate-500">
                Type the readable alphanumeric code printed below the QR code sticker.
              </p>
            </div>

            <div>
              <input
                type="text"
                required
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="e.g. KB-37096D25"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-center text-sm font-bold tracking-widest uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <span>Open Item Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Privacy Note Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>End-to-End Privacy Protected</span>
          </div>
          <Link to="/faq" className="hover:underline flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How scanning works</span>
          </Link>
        </div>
      </AnimatedSection>
    </div>
  );
}
