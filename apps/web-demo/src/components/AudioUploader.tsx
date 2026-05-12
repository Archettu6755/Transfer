interface AudioUploaderProps {
  selectedFileName: string;
  onSelectFileName: (fileName: string) => void;
}

export function AudioUploader({ selectedFileName, onSelectFileName }: AudioUploaderProps) {
  return (
    <section>
      <h2>Audio Uploader</h2>
      <input
        accept="audio/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          onSelectFileName(file?.name ?? '');
        }}
        type="file"
      />
      <p>{selectedFileName ? `Selected file: ${selectedFileName}` : 'No file selected.'}</p>
    </section>
  );
}
