document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const mainScriptInput = document.getElementById('main-script-input');
    const imageGalleryInput = document.getElementById('image-gallery-input');
    const imageThumbnailContainer = document.getElementById('image-thumbnail-container');
    
    const previewCanvas = document.getElementById('preview-canvas');
    const startRecordBtn = document.getElementById('start-record-btn');
    const stopRecordBtn = document.getElementById('stop-record-btn');
    const downloadLink = document.getElementById('download-link');
    const statusEl = document.getElementById('status');

    // --- CONFIGURACIÓN DE CANVAS ---
    const canvasWidth = 1280;
    const canvasHeight = 720;

    // Canvas visible para la vista previa del usuario
    previewCanvas.width = canvasWidth;
    previewCanvas.height = canvasHeight;
    const ctx = previewCanvas.getContext('2d');

    // Canvas OCULTO (en memoria) para la grabación en alta resolución.
    const recordingCanvas = document.createElement('canvas');
    recordingCanvas.width = canvasWidth;
    recordingCanvas.height = canvasHeight;
    const recordCtx = recordingCanvas.getContext('2d');

    // --- ESTADO ---
    let recorder;
    let animationFrameId;
    let uploadedImageFiles = [];

    const hiddenAudioEl = document.createElement('audio');
    hiddenAudioEl.crossOrigin = "anonymous";

    // --- MANEJO DE LA GALERÍA DE IMÁGENES ---
    imageGalleryInput.addEventListener('change', (event) => {
        uploadedImageFiles = Array.from(event.target.files);
        imageThumbnailContainer.innerHTML = '';
        
        if (uploadedImageFiles.length === 0) {
            imageThumbnailContainer.innerHTML = '<p class="text-gray-500 text-sm">Ninguna imagen seleccionada.</p>';
            return;
        }

        uploadedImageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.title = file.name;
                img.classList.add('thumbnail-img');
                imageThumbnailContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // --- FUNCIONES DE RENDERIZADO Y PRECARGA ---
    const drawImageOnRecordingCanvas = (imgObject) => {
        recordCtx.fillStyle = 'black';
        recordCtx.fillRect(0, 0, canvasWidth, canvasHeight);
        if (!imgObject || !imgObject.complete || imgObject.naturalHeight === 0) return;

        const canvasAspect = canvasWidth / canvasHeight;
        const imgAspect = imgObject.naturalWidth / imgObject.naturalHeight;
        let sx, sy, sWidth, sHeight;

        if (imgAspect > canvasAspect) {
            sHeight = imgObject.naturalHeight;
            sWidth = sHeight * canvasAspect;
            sx = (imgObject.naturalWidth - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = imgObject.naturalWidth;
            sHeight = sWidth / canvasAspect;
            sx = 0;
            sy = (imgObject.naturalHeight - sHeight) / 2;
        }
        recordCtx.drawImage(imgObject, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);
    };
    
    const preloadImages = (scenes) => {
        statusEl.textContent = 'Cargando imágenes...';
        const promises = scenes.map(scene => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => { scene.imgObject = img; resolve(); };
                img.onerror = () => { console.error("No se pudo precargar la imagen:", scene.imgSrc); resolve(); };
                img.src = scene.imgSrc;
            });
        });
        return Promise.all(promises);
    };

    // --- LÓGICA DE AUDIO ---
    const generateFullAudioTrack = async (text) => {
        statusEl.textContent = 'Generando narración de audio...';
        if (!text || text.trim() === '') return 0;

        try {
            const response = await fetch(`https://api.streamelements.com/kappa/v2/speech?voice=Mia&text=${encodeURIComponent(text)}`);
            if (!response.ok) throw new Error('El servicio de voz falló.');

            const audioBlob = await response.blob();
            hiddenAudioEl.src = URL.createObjectURL(audioBlob);
            
            await new Promise((resolve, reject) => {
                hiddenAudioEl.onloadedmetadata = () => resolve();
                hiddenAudioEl.onerror = () => reject('No se pudo cargar el audio.');
            });
            
            console.log(`Audio generado. Duración: ${hiddenAudioEl.duration} segundos.`);
            return hiddenAudioEl.duration;

        } catch (error) {
            console.error(error);
            statusEl.textContent = `Error al generar audio: ${error.message}`;
            return 0;
        }
    };
    
    // --- LÓGICA DE GRABACIÓN PRINCIPAL ---
    const handleRecordingStop = () => {
        if (!recorder) return;
        recorder.stopRecording(() => {
            const blob = recorder.getBlob();
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = `video_generado_${Date.now()}.webm`;
            downloadLink.classList.remove('hidden');

            startRecordBtn.classList.remove('hidden');
            stopRecordBtn.classList.add('hidden');
            startRecordBtn.disabled = false;
            statusEl.textContent = "¡Grabación finalizada! Archivo .webm generado.";
            
            recorder.destroy();
            recorder = null;
        });
    };

    startRecordBtn.addEventListener('click', async () => {
        const fullText = mainScriptInput.value;
        if (uploadedImageFiles.length === 0) {
            statusEl.textContent = "Por favor, sube al menos una imagen.";
            return;
        }
        if (!fullText.trim()) {
            statusEl.textContent = "Por favor, escribe un guion para la narración.";
            return;
        }

        startRecordBtn.disabled = true;
        stopRecordBtn.classList.remove('hidden');
        startRecordBtn.classList.add('hidden');
        downloadLink.classList.add('hidden');
        if(animationFrameId) cancelAnimationFrame(animationFrameId);

        const totalDurationInSeconds = await generateFullAudioTrack(fullText);
        if (totalDurationInSeconds <= 0) {
            statusEl.textContent = "No se pudo generar el video sin audio.";
            startRecordBtn.disabled = false;
            stopRecordBtn.classList.add('hidden');
            startRecordBtn.classList.remove('hidden');
            return;
        }
        
        const durationPerImageInMs = (totalDurationInSeconds * 1000) / uploadedImageFiles.length;
        const totalDurationInMs = totalDurationInSeconds * 1000;

        let scenesData = uploadedImageFiles.map(file => ({
            imgSrc: URL.createObjectURL(file),
            imgObject: null,
            duration: durationPerImageInMs
        }));
        
        await preloadImages(scenesData);
        
        const canvasStream = recordingCanvas.captureStream(30);
        const audioStream = hiddenAudioEl.captureStream ? hiddenAudioEl.captureStream() : hiddenAudioEl.mozCaptureStream();

        // --- INICIO DE LA MODIFICACIÓN ---
        // 1. Extraer las pistas individuales de video y audio.
        const videoTrack = canvasStream.getVideoTracks()[0];
        const audioTrack = audioStream.getAudioTracks()[0];

        // 2. Aplicar restricciones a la pista de video para forzar la resolución.
        try {
            await videoTrack.applyConstraints({
                width: { exact: canvasWidth },
                height: { exact: canvasHeight }
            });
            const settings = videoTrack.getSettings();
            console.log(`Pista de video configurada a: ${settings.width}x${settings.height}`);
        } catch (e) {
            console.error('Error al aplicar las restricciones de resolución a la pista de video:', e);
            statusEl.textContent = "Error: No se pudo forzar la resolución del video.";
            startRecordBtn.disabled = false;
            stopRecordBtn.classList.add('hidden');
            startRecordBtn.classList.remove('hidden');
            return;
        }
        
        // 3. Crear un nuevo MediaStream combinado con las pistas ya configuradas.
        const combinedStream = new MediaStream([videoTrack, audioTrack]);
        
        // 4. Inicializar RecordRTC con el stream único y combinado.
        recorder = RecordRTC(combinedStream, {
        // --- FIN DE LA MODIFICACIÓN ---
            type: 'video',
            mimeType: 'video/webm;codecs=vp9,opus',
            disableLogs: true,
            videoBitsPerSecond: 8 * 1024 * 1024,
            audioBitsPerSecond: 192000,
            width: canvasWidth,
            height: canvasHeight
            // Se elimina la propiedad 'canvas' ya que el stream está pre-configurado.
        });
        
        recorder.startRecording();
        hiddenAudioEl.play();
        
        let startTime = Date.now();
        const renderLoop = () => {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime >= totalDurationInMs) {
                if (recorder && recorder.getState() === 'recording') { handleRecordingStop(); }
                cancelAnimationFrame(animationFrameId);
                return;
            }

            const currentImageIndex = Math.min(
                Math.floor(elapsedTime / durationPerImageInMs),
                scenesData.length - 1
            );
            
            statusEl.textContent = `Grabando imagen ${currentImageIndex + 1} de ${scenesData.length}...`;
            const currentScene = scenesData[currentImageIndex];
            
            drawImageOnRecordingCanvas(currentScene.imgObject);
            ctx.drawImage(recordingCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

            animationFrameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
    });

    stopRecordBtn.addEventListener('click', () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        hiddenAudioEl.pause();
        hiddenAudioEl.currentTime = 0;
        if (recorder && recorder.getState() === 'recording') {
            handleRecordingStop();
        } else {
            startRecordBtn.disabled = false;
            startRecordBtn.classList.remove('hidden');
            stopRecordBtn.classList.add('hidden');
            statusEl.textContent = "Grabación cancelada.";
        }
    });

    // --- INICIALIZACIÓN ---
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    imageThumbnailContainer.innerHTML = '<p class="text-gray-500 text-sm">Ninguna imagen seleccionada.</p>';
});
