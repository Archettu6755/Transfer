import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('runs mock mode without an API key or network request', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect((screen.getByLabelText('Translation Mode') as HTMLSelectElement).value).toBe('mock');
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('今日はマイクラをやります。')).toBeTruthy();
    expect(await screen.findByText('大家好，今天我们来玩 Minecraft。')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
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

    await user.selectOptions(screen.getByLabelText('Translation Mode'), 'openai-compatible');
    await user.type(screen.getByLabelText('API Base URL'), 'https://api.example.com/v1');
    await user.type(screen.getByLabelText('API Key'), 'test-key');
    await user.type(screen.getByLabelText('Model Name'), 'test-model');
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('今日はマイクラをやります。')).toBeTruthy();
    expect(await screen.findByText('大家好，今天我们来玩 Minecraft。')).toBeTruthy();
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

    await user.selectOptions(screen.getByLabelText('Translation Mode'), 'openai-compatible');
    await user.type(screen.getByLabelText('API Base URL'), 'https://api.example.com/v1');
    await user.type(screen.getByLabelText('API Key'), 'bad-key');
    await user.type(screen.getByLabelText('Model Name'), 'test-model');
    await user.click(screen.getByRole('button', { name: 'Run Translation' }));

    expect(await screen.findByText('Translation request failed (401 Unauthorized): Bad API key')).toBeTruthy();
  });
});
