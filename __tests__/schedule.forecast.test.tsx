jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
// The screen reads everything through useWeather; each test sets what it returns.
let mockWeather: any;
jest.mock('../hooks/useWeather', () => ({ useWeather: () => mockWeather }));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ForecastScreen from '../app/forecast';
import { useKilimoStore } from '../store/useKilimoStore';
import { translate } from '../lib/i18n';
import { fieldTipKey, forecastDayLabels } from '../lib/scheduleFormat';

const refetch = jest.fn(async () => {});
const base = (over: any = {}) => ({
  configured: true,
  location: 'Mbeya',
  current: undefined,
  forecast: undefined,
  loading: false,
  fetching: false,
  error: null,
  errorKind: null,
  refetch,
  ...over,
});
const current = {
  location: 'Mbeya',
  temp: 24,
  feelsLike: 25,
  humidity: 60,
  windKph: 12,
  condition: 'cloud',
  conditionLabel: 'mawingu kiasi',
  pop: 0,
};
const days = [
  { day: 'Jumanne', date: '22 Sep', high: 27, low: 15, condition: 'rain', pop: '80%', desc: 'x' },
  { day: 'Jumatano', date: '23 Sep', high: 29, low: 16, condition: 'sun', pop: '10%', desc: 'x' },
];

beforeEach(() => {
  refetch.mockClear();
  mockPush.mockClear();
  useKilimoStore.setState({
    language: 'en',
    farmProfile: { region: 'Mbeya' } as any,
  });
  useKilimoStore.getState().setConnectivity(true);
});

describe('Forecast screen', () => {
  it('not configured: says so plainly and shows NO weather values', () => {
    mockWeather = base({ configured: false });
    render(<ForecastScreen />);
    expect(screen.getByText('Live weather is not set up')).toBeTruthy();
    expect(screen.getByText(translate('en', 'schedule.forecast.unconfigured.body'))).toBeTruthy();
    expect(screen.queryByText(/°/)).toBeNull();
    expect(screen.queryByTestId('forecast-current')).toBeNull();
    expect(screen.queryByTestId('forecast-note')).toBeNull();
  });

  it('loading: shows a skeleton, not numbers', () => {
    mockWeather = base({ loading: true });
    render(<ForecastScreen />);
    expect(screen.getByLabelText('Loading…')).toBeTruthy();
    expect(screen.queryByText(/°C/)).toBeNull();
  });

  it('data: current conditions, source label, rule-based note and daily rows', () => {
    mockWeather = base({ current, forecast: days });
    render(<ForecastScreen />);
    expect(screen.getByText('24°C')).toBeTruthy();
    expect(screen.getByText('Cloudy')).toBeTruthy();
    expect(screen.getByText('Live data from OpenWeather')).toBeTruthy();
    expect(screen.getByText('Field note for Tuesday')).toBeTruthy();
    expect(screen.getByText(translate('en', 'schedule.forecast.tip.rainHeavy'))).toBeTruthy();
    expect(screen.getByText('A simple rule based on the forecast, not AI advice.')).toBeTruthy();
    expect(screen.getByText('Tuesday · 22 September')).toBeTruthy();
    expect(screen.getByText('Rain · Rain chance 80%')).toBeTruthy();
    expect(screen.getByText('High 29° · Low 16°')).toBeTruthy();
    expect(screen.queryByTestId('forecast-default-location')).toBeNull();
  });

  it('empty daily list: says no daily forecast was returned', () => {
    mockWeather = base({ current, forecast: [] });
    render(<ForecastScreen />);
    expect(screen.getByText('No daily forecast was returned for this location.')).toBeTruthy();
  });

  it('error: kind-specific message with retry and a fix for an unknown location', () => {
    mockWeather = base({ error: new Error('404'), errorKind: 'unknown_location', location: 'Nowhere' });
    render(<ForecastScreen />);
    expect(screen.getByText('Location not recognised')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Set farm region'));
    expect(mockPush).toHaveBeenCalledWith('/edit-profile');
  });

  it('labels the Arusha fallback when the farm region is not set', () => {
    useKilimoStore.setState({ farmProfile: null as any });
    mockWeather = base({ location: 'Arusha,TZ', current: { ...current, location: 'Arusha' }, forecast: days });
    render(<ForecastScreen />);
    expect(
      screen.getByText('Your farm region is not set, so this is the forecast for Arusha.')
    ).toBeTruthy();
  });

  it('offline with cached data: labels it as the last forecast loaded', () => {
    useKilimoStore.getState().setConnectivity(false);
    mockWeather = base({ current, forecast: days });
    render(<ForecastScreen />);
    expect(screen.getByText('You are offline. Showing the last forecast loaded.')).toBeTruthy();
    expect(screen.getByText('24°C')).toBeTruthy();
  });

  it('offline without data: explains a connection is needed', () => {
    useKilimoStore.getState().setConnectivity(false);
    mockWeather = base({ error: new Error('net'), errorKind: 'network' });
    render(<ForecastScreen />);
    expect(screen.getByText('The forecast needs a connection')).toBeTruthy();
  });

  it('Swahili: day names, conditions and tips are translated', () => {
    useKilimoStore.setState({ language: 'sw' });
    mockWeather = base({ current, forecast: days });
    render(<ForecastScreen />);
    expect(screen.getByText('Utabiri wa hali ya hewa')).toBeTruthy();
    expect(screen.getByText('Mawingu')).toBeTruthy();
    expect(screen.getByText('Jumanne · 22 Septemba')).toBeTruthy();
    expect(screen.getByText('Dokezo la shamba kwa Jumanne')).toBeTruthy();
  });
});

describe('forecast helpers', () => {
  const t = (k: any, p?: any) => translate('en', k, p);
  it('maps lib/weather Swahili labels back to translated day and date', () => {
    expect(forecastDayLabels(t, days[1] as any)).toEqual({ day: 'Wednesday', date: '23 September' });
    // Unknown strings pass through rather than being guessed.
    expect(forecastDayLabels(t, { ...days[0], day: 'X', date: '1 Zzz' } as any)).toEqual({
      day: 'X',
      date: '1 Zzz',
    });
  });
  it('field tip thresholds', () => {
    expect(fieldTipKey('storm', 20, 0)).toBe('schedule.forecast.tip.storm');
    expect(fieldTipKey('rain', 20, 60)).toBe('schedule.forecast.tip.rainHeavy');
    expect(fieldTipKey('rain', 20, 59)).toBe('schedule.forecast.tip.rain');
    expect(fieldTipKey('cloud', 30, 0)).toBe('schedule.forecast.tip.cloud');
    expect(fieldTipKey('sun', 28, 0)).toBe('schedule.forecast.tip.hot');
    expect(fieldTipKey('sun', 27, 0)).toBe('schedule.forecast.tip.fair');
  });
});
