import type {
  ASRProvider,
  AudioInput,
  SubtitleSegment,
  TranslatorProvider,
  UserSettings
} from 'shared';

export interface PipelineDependencies {
  asrProvider: ASRProvider;
  translatorProvider: TranslatorProvider;
}

export class Pipeline {
  private readonly asrProvider: ASRProvider;
  private readonly translatorProvider: TranslatorProvider;

  constructor({ asrProvider, translatorProvider }: PipelineDependencies) {
    this.asrProvider = asrProvider;
    this.translatorProvider = translatorProvider;
  }

  async process(audio: AudioInput, settings: UserSettings): Promise<SubtitleSegment> {
    const asrResult = await this.asrProvider.recognize(audio, settings.sourceLang);

    try {
      const translation = await this.translatorProvider.translate(
        asrResult.text,
        settings.sourceLang,
        settings.targetLang
      );

      return {
        id: asrResult.id,
        source: asrResult.text,
        translated: translation.translatedText,
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang,
        createdAt: Date.now(),
        status: 'translated'
      };
    } catch {
      return {
        id: asrResult.id,
        source: asrResult.text,
        translated: asrResult.text,
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang,
        createdAt: Date.now(),
        status: 'error'
      };
    }
  }
}
