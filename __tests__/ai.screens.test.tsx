/**
 * AI screens (KIL-009 / KIL-006 AI part): the Ask AI tab renders sources with
 * every answer and is honest when there is no LLM key, no match, a 503 or no
 * backend; scan never fabricates a diagnosis; admin is role-gated; training
 * and video hub are localised and contain no invented content.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: true, size: 10 })),
  readAsStringAsync: jest.fn(async () => 'AAAA'),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-audio', () => ({
  useAudioRecorder: () => ({
    stop: jest.fn(async () => undefined),
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    uri: null,
  }),
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AskAiScreen from '../app/(tabs)/ai';
import ScanScreen, { assessDiagnosis } from '../app/scan';
import AIAdminScreen, { effectiveRetrieval } from '../app/ai-admin';
import AITrainingHubScreen from '../app/ai-training-hub';
import VideoHubScreen from '../app/video-hub';
import AiVoiceScreen from '../app/ai-voice';
import { useKilimoStore } from '../store/useKilimoStore';

const SOURCE = {
  id: 'kb1',
  title: 'Maize — fall armyworm',
  category: 'crop_disease',
  excerpt: 'Scout maize weekly from emergence.',
  content: 'Scout maize weekly from emergence. Hand-pick egg masses early.',
};

function backend(invokeImpl: (name: string, opts: any) => any) {
  const invoke = jest.fn(async (name: string, opts: any) => invokeImpl(name, opts));
  (global as any).__TEST_SUPABASE__ = { functions: { invoke } };
  return invoke;
}

beforeEach(() => {
  (global as any).__TEST_SUPABASE__ = null;
  mockPush.mockReset();
  useKilimoStore.setState({ language: 'en', isOffline: false, completedModules: [] } as any);
});

async function ask(text: string) {
  fireEvent.changeText(screen.getByTestId('ai-input'), text);
  await act(async () => {
    fireEvent.press(screen.getByTestId('ai-send'));
  });
}

describe('Ask AI tab', () => {
  it('without an LLM key shows the knowledge base passages with their sources', async () => {
    const invoke = backend(() => ({
      data: {
        mode: 'knowledge_base',
        answer: null,
        sources: [SOURCE],
        retrieval: 'fulltext',
        llmConfigured: false,
      },
      error: null,
    }));
    render(<AskAiScreen />);
    await ask('How do I stop armyworm?');

    expect(invoke).toHaveBeenCalledWith('rag-chat', {
      body: { query: 'How do I stop armyworm?', lang: 'en' },
    });
    await waitFor(() =>
      expect(screen.getByText('Here is what the Kilimo knowledge base says:')).toBeTruthy()
    );
    expect(screen.getByText(/Written AI answers are not switched on yet/)).toBeTruthy();
    expect(screen.getByText('Sources (1)')).toBeTruthy();
    expect(screen.getByText('[1] Maize — fall armyworm')).toBeTruthy();
    expect(screen.getByText('Crop pests & diseases')).toBeTruthy();
    // full passage is shown as written in knowledge-base mode
    expect(screen.getByText(SOURCE.content)).toBeTruthy();
  });

  it('shows a generated answer together with its sources', async () => {
    backend(() => ({
      data: {
        mode: 'generated',
        answer: 'Scout weekly and hand-pick eggs [1].',
        sources: [SOURCE],
        retrieval: 'vector',
        llmConfigured: true,
      },
      error: null,
    }));
    render(<AskAiScreen />);
    await ask('armyworm');
    await waitFor(() =>
      expect(screen.getByText('Scout weekly and hand-pick eggs [1].')).toBeTruthy()
    );
    expect(screen.getByText('Written by AI using only the articles below.')).toBeTruthy();
    expect(screen.getByTestId('rag-source-0')).toBeTruthy();
  });

  it('says so plainly when nothing relevant is found', async () => {
    backend(() => ({
      data: { mode: 'no_match', answer: null, sources: [], retrieval: 'none' },
      error: null,
    }));
    render(<AskAiScreen />);
    await ask('bitcoin prices');
    await waitFor(() => expect(screen.getByText('No matching guidance found')).toBeTruthy());
    expect(screen.queryByText(/Sources \(/)).toBeNull();
  });

  it('503 shows an unavailable error with a working retry', async () => {
    let calls = 0;
    backend(() => {
      calls++;
      return calls === 1
        ? {
            data: null,
            error: { name: 'FunctionsHttpError', message: '503', context: { status: 503 } },
          }
        : {
            data: { mode: 'knowledge_base', sources: [SOURCE], retrieval: 'fulltext' },
            error: null,
          };
    });
    render(<AskAiScreen />);
    await ask('armyworm');
    await waitFor(() => expect(screen.getByText('Kilimo AI is unavailable')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByText('Try again'));
    });
    await waitFor(() => expect(screen.getByText('[1] Maize — fall armyworm')).toBeTruthy());
    expect(calls).toBe(2);
  });

  it('with no backend says it is not connected and does not send', () => {
    render(<AskAiScreen />);
    expect(screen.getByTestId('ai-not-configured')).toBeTruthy();
    expect(screen.getByText('Kilimo AI is not connected')).toBeTruthy();
  });

  it('offline: shows the banner and does not call the server', async () => {
    const invoke = backend(() => ({ data: null, error: null }));
    useKilimoStore.setState({ isOffline: true } as any);
    render(<AskAiScreen />);
    expect(
      screen.getByText('You are offline. Connect to the internet to ask a question.')
    ).toBeTruthy();
    fireEvent.press(screen.getByText('How do I store grain safely?'));
    expect(invoke).not.toHaveBeenCalled();
  });

  it('is fully localised in Swahili', async () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    const invoke = backend(() => ({
      data: { mode: 'knowledge_base', sources: [SOURCE], retrieval: 'fulltext' },
      error: null,
    }));
    render(<AskAiScreen />);
    expect(screen.getByText('Uliza Kilimo AI')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Ninawezaje kudhibiti viwavi jeshi kwenye mahindi?'));
    });
    expect(invoke.mock.calls[0][1].body.lang).toBe('sw');
    await waitFor(() =>
      expect(screen.getByText('Hiki ndicho hazina ya maarifa ya Kilimo inasema:')).toBeTruthy()
    );
    expect(screen.getByText('Wadudu na magonjwa ya mazao')).toBeTruthy();
  });
});

describe('Scan never fabricates a diagnosis', () => {
  it('shows "diagnosis unavailable" when no image model is configured', () => {
    render(<ScanScreen />);
    expect(screen.getByTestId('scan-unavailable')).toBeTruthy();
    expect(screen.getByText('Photo diagnosis is unavailable')).toBeTruthy();
    fireEvent.press(screen.getByText('Ask the knowledge base'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/ai');
  });

  it('a 503 from the vision proxy becomes "unavailable", not a guess', async () => {
    const picker = require('expo-image-picker');
    picker.launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///leaf.jpg' }],
    });
    backend(() => ({
      data: null,
      error: { name: 'FunctionsHttpError', message: '503', context: { status: 503 } },
    }));
    render(<ScanScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('scan-camera'));
    });
    await waitFor(() => expect(screen.getByTestId('scan-unavailable')).toBeTruthy());
  });

  it('shows the model result with categorical confidence and an expert warning', async () => {
    const picker = require('expo-image-picker');
    picker.launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///leaf.jpg' }],
    });
    const invoke = backend(() => ({
      data: {
        content: JSON.stringify({
          crop: 'Maize',
          disease: 'Common rust',
          severity: 'high',
          confidence: 'low',
          imageQuality: 'good',
          actions: ['Remove badly affected leaves'],
        }),
      },
      error: null,
    }));
    render(<ScanScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('scan-camera'));
    });
    await waitFor(() => expect(screen.getByTestId('scan-result')).toBeTruthy());
    expect(invoke.mock.calls[0][0]).toBe('openai-proxy');
    expect(screen.getByText('Common rust')).toBeTruthy();
    expect(screen.getByText('AI confidence: low')).toBeTruthy();
    expect(screen.getByText('Severity: high')).toBeTruthy();
    expect(screen.getByTestId('scan-expert')).toBeTruthy();
    expect(screen.queryByText(/\d+%/)).toBeNull();
  });

  it('an unusable photo is reported, not diagnosed', async () => {
    const picker = require('expo-image-picker');
    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///x.jpg' }],
    });
    backend(() => ({
      data: { content: '{"imageQuality":"unusable","disease":"Something"}' },
      error: null,
    }));
    render(<ScanScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText('Choose from gallery'));
    });
    await waitFor(() => expect(screen.getByTestId('scan-unusable')).toBeTruthy());
    expect(screen.queryByText('Something')).toBeNull();
  });

  it('assessDiagnosis flags unusable photos and empty results', () => {
    expect(assessDiagnosis({ raw: '', imageQuality: 'unusable', disease: 'Rust' })).toBe(
      'unusable'
    );
    expect(assessDiagnosis({ raw: '{}' })).toBe('incomplete');
    expect(assessDiagnosis({ raw: '', disease: '  ' })).toBe('incomplete');
    expect(assessDiagnosis({ raw: '', disease: 'Common rust', imageQuality: 'good' })).toBe('ok');
  });
});

describe('AI admin', () => {
  it('is denied to non-admin roles', () => {
    useKilimoStore.setState({ agroId: { role: 'smallholder' } } as any);
    render(<AIAdminScreen />);
    expect(screen.getByTestId('ai-admin-denied')).toBeTruthy();
    expect(screen.getByText('Admins only')).toBeTruthy();
  });

  it('shows the real knowledge-base status for admins', async () => {
    useKilimoStore.setState({ agroId: { role: 'commercial_admin' } } as any);
    backend(() => ({
      data: {
        llmConfigured: false,
        documents: 8,
        embedded: 0,
        fullTextReady: true,
        articles: [{ id: 'a', title: 'Irrigation — dry spells', category: 'irrigation' }],
      },
      error: null,
    }));
    render(<AIAdminScreen />);
    await waitFor(() => expect(screen.getByTestId('ai-admin-status')).toBeTruthy());
    expect(screen.getByText('0 of 8')).toBeTruthy();
    expect(screen.getByText('Not configured')).toBeTruthy();
    expect(screen.getByText('Word search (full-text)')).toBeTruthy();
    expect(screen.getByText('Irrigation — dry spells')).toBeTruthy();
    // none of the old invented numbers
    expect(screen.queryByText(/95\.8/)).toBeNull();
  });

  it('shows an error with retry when the status cannot load', async () => {
    useKilimoStore.setState({ agroId: { role: 'commercial_admin' } } as any);
    backend(() => ({
      data: null,
      error: { name: 'FunctionsHttpError', message: 'x', context: { status: 500 } },
    }));
    render(<AIAdminScreen />);
    await waitFor(() => expect(screen.getByTestId('ai-admin-error')).toBeTruthy());
  });

  it('effectiveRetrieval reflects what rag-chat will really use', () => {
    expect(effectiveRetrieval({ llmConfigured: true, embedded: 8, fullTextReady: true })).toBe(
      'vector'
    );
    expect(effectiveRetrieval({ llmConfigured: false, embedded: 8, fullTextReady: true })).toBe(
      'fulltext'
    );
    expect(effectiveRetrieval({ llmConfigured: true, embedded: 0, fullTextReady: false })).toBe(
      'keyword'
    );
  });
});

describe('Training hub', () => {
  it('completes a lesson only on the correct answer', () => {
    const completeModule = jest.fn();
    useKilimoStore.setState({ completeModule } as any);
    render(<AITrainingHubScreen />);
    expect(screen.getByText('0 of 5 lessons completed')).toBeTruthy();
    fireEvent.press(screen.getByText('1. Start with the crop and the problem'));
    fireEvent.press(screen.getByTestId('train-option-0'));
    fireEvent.press(screen.getByTestId('train-check'));
    expect(screen.getByTestId('train-wrong')).toBeTruthy();
    expect(completeModule).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('train-option-1'));
    fireEvent.press(screen.getByTestId('train-check'));
    expect(screen.getByTestId('train-correct')).toBeTruthy();
    expect(completeModule).toHaveBeenCalledWith('intro');
  });

  it('does not claim an official certificate', () => {
    useKilimoStore.setState({
      completedModules: ['intro', 'prompting', 'photos', 'confidence', 'escalation'],
    } as any);
    render(<AITrainingHubScreen />);
    expect(screen.getByText(/not an official certificate/)).toBeTruthy();
  });
});

describe('Video hub', () => {
  it('shows an honest empty state instead of placeholder videos', () => {
    render(<VideoHubScreen />);
    expect(screen.getByText('No verified videos yet')).toBeTruthy();
    expect(screen.queryByText(/TARI/)).toBeNull();
  });
});

describe('Voice', () => {
  it('starter questions are answered from the knowledge base with sources', async () => {
    const invoke = backend(() => ({
      data: { mode: 'knowledge_base', sources: [SOURCE], retrieval: 'fulltext' },
      error: null,
    }));
    render(<AiVoiceScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText('How do I control fall armyworm in maize?'));
    });
    expect(invoke).toHaveBeenCalledWith('rag-chat', expect.anything());
    await waitFor(() => expect(screen.getByText('[1] Maize — fall armyworm')).toBeTruthy());
  });
});
