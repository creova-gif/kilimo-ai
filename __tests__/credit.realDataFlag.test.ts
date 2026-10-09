/**
 * Review #86 Minor 4: load the WIRED flag module with production settings and
 * assert it is off (and that the override is reported).
 */
const mockCaptureError = jest.fn();
jest.mock('../lib/sentry', () => ({ captureError: mockCaptureError }));

const FLAG = 'EXPO_PUBLIC_CREDIT_SCORE_ALLOW_REAL_DATA';

function loadWith(opts: { flag?: string; nodeEnv: string; dev: boolean; hostname?: string }) {
  const saved = { flag: process.env[FLAG], nodeEnv: process.env.NODE_ENV };
  const g = globalThis as any;
  const savedDev = g.__DEV__;
  const savedLoc = Object.getOwnPropertyDescriptor(g, 'location');
  let mod: typeof import('../lib/credit/realDataFlag') | undefined;
  try {
    if (opts.flag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = opts.flag;
    process.env.NODE_ENV = opts.nodeEnv;
    g.__DEV__ = opts.dev;
    if (opts.hostname !== undefined) {
      Object.defineProperty(g, 'location', {
        value: { hostname: opts.hostname },
        configurable: true,
        writable: true,
      });
    } else if (savedLoc) {
      delete g.location;
    }
    jest.isolateModules(() => {
      mod = require('../lib/credit/realDataFlag');
    });
  } finally {
    if (saved.flag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = saved.flag;
    process.env.NODE_ENV = saved.nodeEnv;
    g.__DEV__ = savedDev;
    if (savedLoc) Object.defineProperty(g, 'location', savedLoc);
    else delete g.location;
  }
  return mod!;
}

beforeEach(() => mockCaptureError.mockClear());

describe('wired CREDIT_ALLOW_REAL (lib/credit/realDataFlag.ts)', () => {
  it('is OFF on a production build even with the flag set to "true", and reports it', () => {
    const m = loadWith({ flag: 'true', nodeEnv: 'production', dev: false });
    expect(m.CREDIT_ALLOW_REAL).toBe(false);
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  it('is OFF on a public web host even in a dev bundle (e.g. the Replit web workflow)', () => {
    const m = loadWith({
      flag: 'true',
      nodeEnv: 'development',
      dev: true,
      hostname: 'kilimo-ai.example.repl.co',
    });
    expect(m.CREDIT_ALLOW_REAL).toBe(false);
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  it('is OFF by default in a dev bundle (flag unset)', () => {
    expect(loadWith({ nodeEnv: 'development', dev: true }).CREDIT_ALLOW_REAL).toBe(false);
  });

  it('is ON only for a local, non-production dev bundle with the exact flag "true"', () => {
    expect(loadWith({ flag: 'true', nodeEnv: 'development', dev: true }).CREDIT_ALLOW_REAL).toBe(
      true
    );
    expect(
      loadWith({ flag: 'true', nodeEnv: 'development', dev: true, hostname: 'localhost' })
        .CREDIT_ALLOW_REAL
    ).toBe(true);
    expect(loadWith({ flag: 'TRUE', nodeEnv: 'development', dev: true }).CREDIT_ALLOW_REAL).toBe(
      false
    );
    expect(mockCaptureError).not.toHaveBeenCalled();
  });
});
