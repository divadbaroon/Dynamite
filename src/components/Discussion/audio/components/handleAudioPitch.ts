
export const pitchShiftAudio = async (audioBlob: Blob, pitchFactor: number = 0.8): Promise<Blob> => {
    const audioContext = new AudioContext();
    const audioBuffer = await audioBlob.arrayBuffer()
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = pitchFactor;
    
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    const mediaDest = new MediaStreamAudioDestinationNode(audioContext);
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = renderedBuffer;
    bufferSource.connect(mediaDest);
    bufferSource.start();

    const processedRecorder = new MediaRecorder(mediaDest.stream);
    const processedChunks: Blob[] = [];

    return new Promise((resolve) => {
      processedRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          processedChunks.push(e.data);
        }
      };

      processedRecorder.onstop = () => {
        const processedBlob = new Blob(processedChunks, { type: 'audio/webm' });
        resolve(processedBlob);
      };

      processedRecorder.start();
      setTimeout(() => processedRecorder.stop(), renderedBuffer.duration * 1000 + 100);
    });
  };