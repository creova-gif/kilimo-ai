/**
 * CRE-179: with real (self_reported) ledger data on the device, the Agro-ID
 * screen must show the "unavailable" copy and no 300–850 score.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('react-native-qrcode-svg', () => {
  const QRCode = () => null;
  QRCode.displayName = 'QRCode';
  return QRCode;
});
jest.mock('expo-blur', () => ({ BlurView: ({ children }: any) => children ?? null }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const chain: any = new Proxy(() => chain, { get: () => chain });
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    FadeInDown: chain,
    FadeInUp: chain,
  };
});
jest.mock('../lib/pdf/pnl', () => ({ exportPnlPdf: jest.fn() }));
jest.mock('../lib/credit/ledgerSync', () => ({ pushLedgerEntry: jest.fn() }));
jest.mock('../lib/supabase', () => ({ supabase: null }));
jest.mock('../lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AgroIdScreen from '../app/agro-id';
import { useFarmDataStore } from '../store/useFarmDataStore';
import { useKilimoStore } from '../store/useKilimoStore';
import { SYNTHETIC_LEDGERS } from '../lib/credit/fixtures/syntheticLedgers';
import { CREDIT_ALLOW_REAL } from '../lib/credit/realDataFlag';

const textOf = (n: TestRenderer.ReactTestInstance) =>
  n
    .findAll((c) => c.type === 'Text')
    .map((c) => ([] as unknown[]).concat(c.props.children ?? []).join(''))
    .join(' ');

/** Press the first pressable whose text contains `label`. */
const press = (label: string) => (tree: TestRenderer.ReactTestRenderer) => {
  const target = tree.root.findAll(
    (n) => typeof n.props.onPress === 'function' && textOf(n).includes(label)
  )[0];
  if (!target) throw new Error(`no pressable labelled ${label}`);
  target.props.onPress();
};

function renderTexts(onMount?: (tree: TestRenderer.ReactTestRenderer) => void) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<AgroIdScreen />);
  });
  if (onMount) act(() => onMount(tree));
  const texts = tree.root
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((n) => ([] as unknown[]).concat(n.props.children ?? []).join(''));
  const unavailable = tree.root.findAll((n) => n.props.testID === 'credit-score-unavailable');
  const qrCodes = tree.root.findAll((n) => (n.type as any)?.displayName === 'QRCode').length;
  act(() => tree.unmount());
  return { texts, unavailable: unavailable.length > 0, qrCodes };
}

const setAgroId = (language: 'en' | 'sw') =>
  useKilimoStore.setState({
    language,
    agroId: { id: 'SYN-TEST-0001', name: 'Synthetic Tester', verificationStatus: 'unverified' },
  } as any);

const realEntry = {
  id: 'l_real_1',
  date: new Date().toISOString(),
  category: 'Sale · Maize',
  description: 'farmer-typed',
  amountTZS: 400_000,
  source: 'self_reported' as const,
};

const SCORE_RE = /^(3\d\d|[4-7]\d\d|8[0-4]\d|850)$/;

describe('Agro-ID credit score under the CRE-179 legal hold', () => {
  it('runs with the real-data flag off (default)', () => {
    expect(CREDIT_ALLOW_REAL).toBe(false);
  });

  it('shows the unavailable state and no score for a self_reported entry', () => {
    useFarmDataStore.setState({ ledger: [realEntry] } as any);
    setAgroId('en');
    const { texts, unavailable } = renderTexts();
    expect(unavailable).toBe(true);
    expect(texts).toContain('Credit score unavailable while we complete regulatory registration.');
    expect(texts).not.toContain('/ 850');
    expect(texts).not.toContain('Record-keeping');
    expect(texts.some((t) => SCORE_RE.test(t.trim()))).toBe(false);
  });

  it('shows the Swahili unavailable copy', () => {
    useFarmDataStore.setState({ ledger: [realEntry] } as any);
    setAgroId('sw');
    const { texts } = renderTexts();
    expect(texts).toContain(
      'Alama ya mikopo haipatikani kwa sasa tunapokamilisha usajili wa kisheria.'
    );
  });

  it('control: a synthetic ledger still renders a score', () => {
    useFarmDataStore.setState({ ledger: SYNTHETIC_LEDGERS.steadyMaize } as any);
    setAgroId('en');
    const { texts, unavailable } = renderTexts();
    expect(unavailable).toBe(false);
    expect(texts).toContain('/ 850');
  });

  it('treats a legacy entry with no source as real data', () => {
    const { source: _omit, ...legacy } = realEntry;
    useFarmDataStore.setState({ ledger: [legacy] } as any);
    setAgroId('en');
    const { texts, unavailable } = renderTexts();
    expect(unavailable).toBe(true);
    expect(texts).not.toContain('/ 850');
  });
});

describe('Agro-ID sharing under the CRE-179 / CRE-83 hold', () => {
  beforeEach(() => {
    useFarmDataStore.setState({ ledger: [realEntry], insurance: [] } as any);
  });

  it('the share button promises nothing and the modal has no QR, no lender copy and no PDF', () => {
    setAgroId('en');
    const { texts, qrCodes } = renderTexts(press('Sharing paused'));
    expect(texts).not.toContain('Download QR');
    expect(texts.join(' ')).toContain('is paused while we complete regulatory registration');
    expect(qrCodes).toBe(0);
    expect(texts).not.toContain('Download Verified PDF');
    expect(texts).not.toContain('Verified Crop Passport');
    expect(texts.join(' ')).not.toMatch(/P&L|Banks, buyers/);
  });

  it('shows the Swahili paused copy', () => {
    setAgroId('sw');
    const { texts } = renderTexts(press('Kushiriki kumesimamishwa'));
    expect(texts.join(' ')).toContain('Kushiriki rekodi yako ya Agro-ID');
  });
});
