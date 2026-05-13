import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ASRProvider, AudioInput } from 'shared';
import App from './App';

describe('App', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  class FakeLocalASRProvider implements ASRProvider {
    async init(): Promise<void> {}

    async recognize(audio: AudioInput): Promise<{
      id: string;
      text: string;
      lang: 'en';
      timestamp: number;
      latencyMs: number;
    }> {
      return {
        id: audio.id,
        text: 'Hello from local ASR.',
        lang: 'en',
        timestamp: Date.now(),
        latencyMs: 10
      };
    }

    async dispose(): Promise<void> {}
  }

  it('runs mock mode without an API key or network request', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect((screen.getByLabelText('ASR Mode') as HTMLSelectElement).value).toBe('mock');
    expect((screen.getByLabelText('Translation Mode') as HTMLSelectElement).value).toBe('mock');
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('今日はマイクラをやります。')).toBeTruthy();
    expect(await screen.findByText('大家好，今天我们来玩 Minecraft。')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('runs local ASR mode with uploaded audio and mock translation', async () => {
    const user = userEvent.setup();
    const file = new File([new Uint8Array([1, 2, 3])], 'sample.wav', { type: 'audio/wav' });

    render(
      <App
        createAudioInputFromFile={async () => ({
          id: 'sample.wav',
          data: new Float32Array([0, 0.2, -0.2]),
          sampleRate: 16_000,
          durationMs: 500
        })}
        createLocalAsrProvider={() => new FakeLocalASRProvider()}
      />
    );

    await user.selectOptions(screen.getByLabelText('ASR Mode'), 'local');
    await user.upload(screen.getByLabelText('Audio File'), file);
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('Hello from local ASR.')).toBeTruthy();
    expect(await screen.findByText('大家好，今天我们来玩 Minecraft。')).toBeTruthy();
  });

  it('runs local ASR mode with the OpenAI-compatible translator', async () => {
    const user = userEvent.setup();
    const file = new File([new Uint8Array([4, 5, 6])], 'sample-ja.wav', { type: 'audio/wav' });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '大家好，今天我们来玩 Minecraft。' } }]
        }),
        { status: 200 }
      )
    );

    render(
      <App
        createAudioInputFromFile={async () => ({
          id: 'sample-ja.wav',
          data: new Float32Array([0, 0.1, -0.1]),
          sampleRate: 16_000,
          durationMs: 500
        })}
        createLocalAsrProvider={() => new FakeLocalASRProvider()}
      />
    );

    await user.selectOptions(screen.getByLabelText('ASR Mode'), 'local');
    await user.selectOptions(screen.getByLabelText('Translation Mode'), 'openai-compatible');
    await user.upload(screen.getByLabelText('Audio File'), file);
    await user.type(screen.getByLabelText('API Base URL'), 'https://api.example.com/v1');
    await user.type(screen.getByLabelText('API Key'), 'test-key');
    await user.type(screen.getByLabelText('Model Name'), 'test-model');
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('Hello from local ASR.')).toBeTruthy();
    expect(await screen.findByText('大家好，今天我们来玩 Minecraft。')).toBeTruthy();
  });

  it('runs the OpenAI-compatible mode and shows translated text from the API response', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '大家好，今天我们来玩 Minecraft。' } }]
        }),
        { status: 200 }
      )
    );

    render(<App />);

    await user.selectOptions(screen.getByLabelText('ASR Mode'), 'mock');
    await user.selectOptions(screen.getByLabelText('Translation Mode'), 'openai-compatible');
    await user.type(screen.getByLabelText('API Base URL'), 'https://api.example.com/v1');
    await user.type(screen.getByLabelText('API Key'), 'test-key');
    await user.type(screen.getByLabelText('Model Name'), 'test-model');
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('今日はマイクラをやります。')).toBeTruthy();
    expect(await screen.findByText('大家好，今天我们来玩 Minecraft。')).toBeTruthy();
  });

  it('auto-fills Base URL and Model Name when a provider preset is selected', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.selectOptions(screen.getByLabelText('Translation Mode'), 'openai-compatible');
    await user.selectOptions(screen.getByLabelText('Provider Preset'), 'deepseek');

    expect((screen.getByLabelText('API Base URL') as HTMLInputElement).value).toBe(
      'https://api.deepseek.com'
    );
    expect((screen.getByLabelText('Model Name') as HTMLInputElement).value).toBe(
      'deepseek-v4-flash'
    );
    expect((screen.getByLabelText('API Key') as HTMLInputElement).value).toBe('');
  });

  it('keeps manual Base URL and Model Name editing available in custom preset mode', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.selectOptions(screen.getByLabelText('Translation Mode'), 'openai-compatible');
    await user.selectOptions(screen.getByLabelText('Provider Preset'), 'deepseek');
    await user.selectOptions(screen.getByLabelText('Provider Preset'), 'custom');
    await user.clear(screen.getByLabelText('API Base URL'));
    await user.type(screen.getByLabelText('API Base URL'), 'https://custom.example.com/v1');
    await user.clear(screen.getByLabelText('Model Name'));
    await user.type(screen.getByLabelText('Model Name'), 'custom-model');

    expect((screen.getByLabelText('API Base URL') as HTMLInputElement).value).toBe(
      'https://custom.example.com/v1'
    );
    expect((screen.getByLabelText('Model Name') as HTMLInputElement).value).toBe(
      'custom-model'
    );
  });

  it('shows a readable error when translation fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Bad API key' } }), {
        status: 401,
        statusText: 'Unauthorized'
      })
    );

    render(<App />);

    await user.selectOptions(screen.getByLabelText('ASR Mode'), 'mock');
    await user.selectOptions(screen.getByLabelText('Translation Mode'), 'openai-compatible');
    await user.type(screen.getByLabelText('API Base URL'), 'https://api.example.com/v1');
    await user.type(screen.getByLabelText('API Key'), 'bad-key');
    await user.type(screen.getByLabelText('Model Name'), 'test-model');
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('Translation request failed (401 Unauthorized): Bad API key')).toBeTruthy();
  });
});
