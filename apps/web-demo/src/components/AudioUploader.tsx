interface AudioUploaderProps {
  selectedFile: File | null;
  selectedFileName: string;
  onSelectFile: (file: File | null) => void;
}

export function AudioUploader({
  selectedFile,
  selectedFileName,
  onSelectFile
}: AudioUploaderProps) {
  return (
    <section>
      <h2>Audio Uploader</h2>
      <input
        accept="audio/*"
        aria-label="Audio File"
        onChange={(event) => {
          const file = event.target.files?.[0];
          onSelectFile(file ?? null);
        }}
        type="file"
      />
      <p>{selectedFileName ? `Selected file: ${selectedFileName}` : 'No file selected.'}</p>
      <p>{selectedFile ? 'Audio file is ready for Browser ASR mode.' : 'Mock mode does not require an uploaded file.'}</p>
    </section>
  );
}
