jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../lib/supabase', () => ({
  getSupabase: () => (global as any).__TEST_SUPABASE__ ?? null,
  supabase: null,
}));

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ConsultationsScreen from '../app/consultations';
import PeerGroupsScreen from '../app/peer-groups';
import { useKilimoStore } from '../store/useKilimoStore';

const setBackend = (c: any) => {
  (global as any).__TEST_SUPABASE__ = c;
};

/** Minimal supabase-js fake. `tables[t]` are the rows a select returns; inserts are recorded. */
function backend(
  o: {
    directory?: any[];
    consultations?: any[];
    posts?: any[];
    signedIn?: boolean;
    insertResult?: any;
  } = {}
) {
  const inserts: [string, any][] = [];
  const rpc = jest.fn(async () => ({ data: o.directory ?? [], error: null }));
  const from = jest.fn((table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      delete: () => chain,
      single: () => chain,
      insert: (row: any) => {
        chain._ins = row;
        inserts.push([table, row]);
        return chain;
      },
      then: (res: any, rej: any) => {
        let out: any;
        if (chain._ins !== undefined) {
          out = o.insertResult ?? {
            data: {
              id: 'new1',
              status: 'submitted',
              created_at: new Date().toISOString(),
              answer: null,
              answered_at: null,
              ...chain._ins,
            },
            error: null,
          };
        } else if (table === 'consultation_requests')
          out = { data: o.consultations ?? [], error: null };
        else if (table === 'peer_posts') out = { data: o.posts ?? [], error: null };
        else out = { data: [], error: null };
        return Promise.resolve(out).then(res, rej);
      },
    };
    return chain;
  });
  const session = o.signedIn === false ? null : { user: { id: 'u1' } };
  return {
    client: { rpc, from, auth: { getSession: async () => ({ data: { session } }) } },
    inserts,
    rpc,
    from,
  };
}

const group = (over: Partial<any> = {}) => ({
  id: 'g1',
  name: 'Maize growers Mbeya',
  description: 'We talk maize',
  crop: 'Mahindi (Maize)',
  region: 'Mbeya',
  created_by: 'u9',
  created_at: '2026-09-21T00:00:00Z',
  member_count: 7,
  is_member: false,
  ...over,
});

beforeEach(() => {
  setBackend(null);
  mockBack.mockClear();
  useKilimoStore.setState({ language: 'en', isOffline: false, isOnline: true } as any);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

/** Everything the old demo screens invented; none of it may ever render again. */
const INVENTED = [
  'Wakulima wa Mahindi · Arusha',
  'Mpunga Bora Mbeya',
  'Asha M.',
  'Dkt. Esther Mushi',
  'Bw. Daudi Kileo',
  'esther.mushi@tari.go.tz',
  'Soil test review for Block B',
  'Palizi ya Pamoja',
  'WhatsApp Group',
  'RSVP',
];
const expectNoInvented = () => {
  for (const s of INVENTED)
    expect(
      screen.queryByText(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    ).toBeNull();
};

describe('Peer groups screen', () => {
  it('shows an honest empty state (and none of the old demo content) when there are no groups', async () => {
    setBackend(backend({ directory: [] }).client);
    render(<PeerGroupsScreen />);
    expect(await screen.findByText('No groups yet')).toBeTruthy();
    expectNoInvented();
    expect(screen.getByLabelText('Search by name, crop or region')).toBeTruthy();
  });

  it('lists real groups with real member counts and a Join action', async () => {
    setBackend(
      backend({ directory: [group(), group({ id: 'g2', name: 'Solo group', member_count: 1 })] })
        .client
    );
    render(<PeerGroupsScreen />);
    expect(await screen.findByText('Maize growers Mbeya')).toBeTruthy();
    expect(screen.getByText('7 members')).toBeTruthy();
    expect(screen.getByText('1 member')).toBeTruthy();
    expect(screen.getAllByText('Maize · Mbeya').length).toBe(2);
    expect(screen.getByLabelText('Join Maize growers Mbeya')).toBeTruthy();
    expectNoInvented();
  });

  it('joining writes the membership as the signed-in user, then shows the server state', async () => {
    const b = backend({ directory: [group()] });
    setBackend(b.client);
    render(<PeerGroupsScreen />);
    fireEvent.press(await screen.findByLabelText('Join Maize growers Mbeya'));
    await waitFor(() =>
      expect(b.inserts).toContainEqual([
        'peer_group_members',
        { group_id: 'g1', user_id: 'u1', role: 'member' },
      ])
    );
  });

  it('opening a group you have not joined explains that posts are members-only (and fetches none)', async () => {
    const b = backend({
      directory: [group()],
      posts: [{ id: 'p', group_id: 'g1', author_id: 'u2', body: 'secret', created_at: 't' }],
    });
    setBackend(b.client);
    render(<PeerGroupsScreen />);
    fireEvent.press(await screen.findByLabelText('Open Maize growers Mbeya'));
    expect(await screen.findByText('Join to read and post')).toBeTruthy();
    expect(screen.queryByText('secret')).toBeNull();
    expect(b.from).not.toHaveBeenCalledWith('peer_posts');
  });

  it('a member sees the real posts (with the author name stamped by the server) and can write', async () => {
    const posts = [
      {
        id: 'p1',
        group_id: 'g1',
        author_id: 'u2',
        author_name: 'Asha Mwinyi',
        body: 'Bei ya mahindi imepanda',
        created_at: new Date().toISOString(),
      },
      {
        id: 'p2',
        group_id: 'g1',
        author_id: 'u3',
        author_name: null,
        body: 'Ninauliza kuhusu mbolea',
        created_at: new Date().toISOString(),
      },
    ];
    const b = backend({ directory: [group({ is_member: true })], posts });
    setBackend(b.client);
    render(<PeerGroupsScreen />);
    fireEvent.press(await screen.findByLabelText('Open Maize growers Mbeya'));
    expect(await screen.findByText('Bei ya mahindi imepanda')).toBeTruthy();
    expect(screen.getByText('Asha Mwinyi')).toBeTruthy();
    expect(screen.getByText('Group member')).toBeTruthy(); // unnamed author is not given an invented name

    fireEvent.changeText(screen.getByLabelText('Write a post to the group'), '  Habari wakulima  ');
    fireEvent.press(screen.getByText('Send'));
    await waitFor(() =>
      expect(b.inserts).toContainEqual([
        'peer_posts',
        { group_id: 'g1', author_id: 'u1', body: 'Habari wakulima' },
      ])
    );
    expect(await screen.findByText('Habari wakulima')).toBeTruthy();
  });

  it('a member of an empty group sees an empty-feed state, not fake posts', async () => {
    setBackend(backend({ directory: [group({ is_member: true })], posts: [] }).client);
    render(<PeerGroupsScreen />);
    fireEvent.press(await screen.findByLabelText('Open Maize growers Mbeya'));
    expect(await screen.findByText('No posts yet')).toBeTruthy();
  });

  it('offline: says so instead of showing a false "no groups yet"', async () => {
    useKilimoStore.setState({ isOffline: true, isOnline: false } as any);
    setBackend(backend({ directory: [] }).client);
    render(<PeerGroupsScreen />);
    expect(await screen.findByText('Could not load groups')).toBeTruthy();
    expect(screen.queryByText('No groups yet')).toBeNull();
    expect(
      screen.getAllByText('You are offline. Groups and requests need a connection.').length
    ).toBeGreaterThan(0);
  });

  it('signed out: asks to sign in instead of showing an empty community', async () => {
    setBackend(backend({ signedIn: false, directory: [] }).client);
    render(<PeerGroupsScreen />);
    expect(await screen.findByText('Sign in to continue')).toBeTruthy();
    expect(screen.queryByText('No groups yet')).toBeNull();
  });

  it('shows the Swahili copy when the app language is Swahili', async () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    setBackend(backend({ directory: [] }).client);
    render(<PeerGroupsScreen />);
    expect(await screen.findByText('Bado hakuna vikundi')).toBeTruthy();
  });

  it('create form validates the name before writing anything', async () => {
    const b = backend({ directory: [] });
    setBackend(b.client);
    render(<PeerGroupsScreen />);
    await screen.findByText('No groups yet');
    fireEvent.press(screen.getAllByText('Create a group')[0]);
    fireEvent.changeText(await screen.findByTestId('group-name'), 'ab');
    fireEvent.press(screen.getByText('Create group'));
    expect(await screen.findByText('Give the group a name of 3 to 80 characters.')).toBeTruthy();
    expect(b.inserts).toEqual([]);
  });
});

describe('Consultations screen', () => {
  it('states plainly what this is: stored requests, no live chat, no invented experts', async () => {
    setBackend(backend({ consultations: [] }).client);
    render(<ConsultationsScreen />);
    expect(await screen.findByText('No requests yet')).toBeTruthy();
    expect(screen.getByText(/There is no live chat or video call/)).toBeTruthy();
    expectNoInvented();
    expect(screen.queryByText(/TZS/)).toBeNull(); // no invented hourly rates
    expect(screen.queryByText('Chat')).toBeNull();
    expect(screen.queryByText('Video')).toBeNull();
  });

  it('lists the user’s real requests with the server’s status and no claimed answer', async () => {
    setBackend(
      backend({
        consultations: [
          {
            id: 'c1',
            topic: 'Yellow leaves',
            crop: 'Mahindi (Maize)',
            description: 'On the maize',
            preferred_language: 'sw',
            status: 'submitted',
            created_at: new Date().toISOString(),
            answer: null,
            answered_at: null,
          },
          {
            id: 'c2',
            topic: 'Blight',
            crop: null,
            description: 'Spots',
            preferred_language: 'en',
            status: 'answered',
            created_at: new Date().toISOString(),
            answer: 'Spray copper fungicide',
            answered_at: new Date().toISOString(),
          },
        ],
      }).client
    );
    render(<ConsultationsScreen />);
    expect(await screen.findByText('Yellow leaves')).toBeTruthy();
    expect(screen.getByText('Submitted')).toBeTruthy();
    expect(screen.getByText('Waiting for an agronomist. Not answered yet.')).toBeTruthy();
    // The answer text appears only for the row the server marked answered.
    expect(screen.getByText('Spray copper fungicide')).toBeTruthy();
    expect(screen.getAllByText('Answered').length).toBeGreaterThan(0);
  });

  it('submitting stores the request (as "submitted") and confirms honestly', async () => {
    const b = backend({ consultations: [] });
    setBackend(b.client);
    render(<ConsultationsScreen />);
    await screen.findByText('No requests yet');
    fireEvent.changeText(screen.getByTestId('consult-topic'), 'Yellow leaves');
    fireEvent.changeText(screen.getByTestId('consult-description'), 'Lower leaves turning yellow');
    fireEvent.press(screen.getByText('Send request'));
    await waitFor(() => expect(b.inserts).toHaveLength(1));
    const [table, payload] = b.inserts[0];
    expect(table).toBe('consultation_requests');
    expect(payload).toMatchObject({
      user_id: 'u1',
      topic: 'Yellow leaves',
      description: 'Lower leaves turning yellow',
      preferred_language: 'en',
    });
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('answer');
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Request saved',
        'Your request is stored and marked Submitted. It has not been answered yet. Check back here for a reply.'
      )
    );
    // The new request now appears in the list with the server's status.
    expect(await screen.findAllByText('Submitted')).toBeTruthy();
  });

  it('validates locally: nothing is sent for an empty topic', async () => {
    const b = backend({ consultations: [] });
    setBackend(b.client);
    render(<ConsultationsScreen />);
    await screen.findByText('No requests yet');
    fireEvent.press(screen.getByText('Send request'));
    expect(await screen.findByText('Add a short topic (up to 120 characters).')).toBeTruthy();
    expect(screen.getByText('Describe the problem (up to 2000 characters).')).toBeTruthy();
    expect(b.inserts).toEqual([]);
  });

  it('a failed save keeps the text and reports failure (no fake success)', async () => {
    const b = backend({
      consultations: [],
      insertResult: { data: null, error: { message: 'rls' } },
    });
    setBackend(b.client);
    render(<ConsultationsScreen />);
    await screen.findByText('No requests yet');
    fireEvent.changeText(screen.getByTestId('consult-topic'), 'Yellow leaves');
    fireEvent.changeText(screen.getByTestId('consult-description'), 'Lower leaves');
    fireEvent.press(screen.getByText('Send request'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Something went wrong',
        'Could not save your request. Your text is still here, so you can try again.'
      )
    );
    expect(screen.getByTestId('consult-topic').props.value).toBe('Yellow leaves');
    expect(screen.queryByText('Request saved')).toBeNull();
  });

  it('offline: the form is disabled, the banner says why, and nothing is sent', async () => {
    useKilimoStore.setState({ isOffline: true, isOnline: false } as any);
    const b = backend({ consultations: [] });
    setBackend(b.client);
    render(<ConsultationsScreen />);
    expect(await screen.findByText('Could not load your requests')).toBeTruthy();
    expect(screen.queryByText('No requests yet')).toBeNull();
    fireEvent.press(screen.getByText('Send request'));
    expect(b.inserts).toEqual([]);
  });

  it('renders in Swahili', async () => {
    useKilimoStore.setState({ language: 'sw' } as any);
    setBackend(backend({ consultations: [] }).client);
    render(<ConsultationsScreen />);
    expect(await screen.findByText('Bado hakuna maombi')).toBeTruthy();
    expect(screen.getByText('Tuma ombi')).toBeTruthy();
  });
});
