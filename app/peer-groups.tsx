/**
 * Peer groups — real, member-only farmer communities (KIL-004).
 *
 * Backed by `peer_groups` / `peer_group_members` / `peer_posts` (migration 20260921130000).
 * Discover and search groups, create one, join / leave, and read + write posts in groups you belong
 * to. There is no seeded data anywhere: an empty community shows an honest empty state, and every
 * write is online-only (offline says so instead of pretending to save).
 *
 * Deliberately NOT here any more: the fake "WhatsApp/Telegram group" pills, the invented shared-task
 * board and the invented meetup calendar with RSVP counts — none had a backend.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AlertTriangle, Search, Users, X } from 'lucide-react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
  TextField,
} from '../components/ui';
import { MIN_TOUCH_TARGET } from '../components/ui/a11y';
import { CROPS, REGIONS } from '../constants/onboardingOptions';
import { useTheme } from '../constants/Theme';
import {
  usePeerGroups,
  usePeerPosts,
  useSessionUserId,
  type WriteResult,
} from '../hooks/usePeerGroups';
import {
  authorKind,
  cropLabel,
  groupMeta,
  hasErrors,
  initialOf,
  listPhase,
  POST_MAX,
  splitGroups,
  validateGroupInput,
  validatePostBody,
  type GroupErrors,
  type ListPhase,
  type PeerGroup,
  type PeerPost,
} from '../lib/community';
import { Gate } from '../lib/access';
import { useT } from '../lib/i18n';
import { timeAgoKey } from '../lib/timeAgo';

type View_ = { kind: 'list' } | { kind: 'create' } | { kind: 'group'; group: PeerGroup };

export default function PeerGroupsScreen() {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <Gate
      feature="peer_groups"
      fallback={
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack.Screen options={{ headerShown: false }} />
          <EmptyState
            icon={<AlertTriangle size={48} color={colors.warningText} />}
            title={t('community.access.title')}
            description={t('community.access.groups')}
          />
        </SafeAreaView>
      }
    >
      <PeerGroupsBody />
    </Gate>
  );
}

function PeerGroupsBody() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const { userId, resolved } = useSessionUserId();

  const [view, setView] = useState<View_>({ kind: 'list' });
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'mine' | 'discover'>('discover');

  // While a group or the form is open the directory is fetched unfiltered, so the open group can
  // never vanish from `groups` because of a search term typed on the list screen.
  const dir = usePeerGroups(userId, view.kind === 'list' ? query : '');
  const { mine, discover } = splitGroups(dir.groups);

  // Land on "My groups" once, the first time we learn the user has some.
  const autoTabbed = useRef(false);
  useEffect(() => {
    if (!autoTabbed.current && dir.loaded) {
      autoTabbed.current = true;
      if (mine.length > 0) setTab('mine');
    }
  }, [dir.loaded, mine.length]);

  const goBack = useCallback(() => {
    if (view.kind === 'list') router.back();
    else setView({ kind: 'list' });
  }, [view.kind, router]);

  // Android hardware back steps out of a group / the form instead of leaving the screen.
  useEffect(() => {
    if (view.kind === 'list') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setView({ kind: 'list' });
      return true;
    });
    return () => sub.remove();
  }, [view.kind]);

  /** Shared failure alert for any write. */
  const reportFailure = useCallback(
    (r: WriteResult, failedKey: Parameters<typeof t>[0]) => {
      if (r.ok) return;
      const offline = r.reason === 'offline';
      Alert.alert(t('state.error.title'), offline ? t('community.offline.write') : t(failedKey));
    },
    [t]
  );

  const confirmLeave = useCallback(
    (g: PeerGroup) => {
      Alert.alert(
        t('community.groups.leave.confirm.title'),
        t('community.groups.leave.confirm.body'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('community.groups.leave'),
            style: 'destructive',
            onPress: async () => {
              const r = await dir.leave(g.id);
              reportFailure(r, 'community.groups.leaveFailed');
            },
          },
        ]
      );
    },
    [dir, reportFailure, t]
  );

  const join = useCallback(
    async (g: PeerGroup) => {
      const r = await dir.join(g.id);
      reportFailure(r, 'community.groups.joinFailed');
    },
    [dir, reportFailure]
  );

  /* ── create ────────────────────────────────────────────────────────────────────────────── */
  if (view.kind === 'create') {
    return (
      <CreateGroup
        isOffline={dir.isOffline}
        onBack={goBack}
        onCreate={async (input) => {
          const r = await dir.create(input);
          if (r.ok && r.group) setView({ kind: 'group', group: r.group });
          return r;
        }}
      />
    );
  }

  /* ── one group ─────────────────────────────────────────────────────────────────────────── */
  if (view.kind === 'group') {
    const live = dir.groups.find((g) => g.id === view.group.id) ?? view.group;
    return (
      <GroupDetail
        group={live}
        userId={userId}
        isOffline={dir.isOffline}
        busy={dir.busyId === live.id}
        onBack={goBack}
        onJoin={() => join(live)}
        onLeave={() => confirmLeave(live)}
      />
    );
  }

  /* ── list ──────────────────────────────────────────────────────────────────────────────── */
  const items = tab === 'mine' ? mine : discover;
  const searching = query.trim().length > 0;
  const phase = listPhase({
    sessionResolved: resolved,
    userId,
    isOffline: dir.isOffline,
    loaded: dir.loaded,
    error: dir.error,
    count: items.length,
  });
  // "ready" is decided on the tab's own rows; if the OTHER tab has rows the empty copy differs.
  const showEmpty = phase !== 'ready';

  const empty = showEmpty ? (
    <ListState
      phase={phase}
      emptyKind={searching ? 'noResults' : tab === 'mine' ? 'mine' : 'none'}
      onRetry={dir.refresh}
      onCreate={() => setView({ kind: 'create' })}
      onDiscover={() => setTab('discover')}
    />
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('community.groups.title')}
        showBack
        onBack={goBack}
        backLabel={t('common.back')}
      />
      <OfflineBanner message={t('community.offline.banner')} visible={dir.isOffline} />
      <FlatList
        data={showEmpty ? [] : items}
        keyExtractor={(g) => g.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={dir.loading && dir.loaded} onRefresh={dir.refresh} />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <TextField
              shape="search"
              size="md"
              value={query}
              onChangeText={setQuery}
              placeholder={t('community.groups.search')}
              accessibilityLabel={t('community.groups.search')}
              returnKeyType="search"
              autoCorrect={false}
              leftIcon={<Search size={18} color={colors.textMute} />}
              rightIcon={
                query.length > 0 ? (
                  <Pressable
                    onPress={() => setQuery('')}
                    accessibilityRole="button"
                    accessibilityLabel={t('community.groups.search.clear')}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <X size={18} color={colors.textMute} />
                  </Pressable>
                ) : undefined
              }
              wrapperStyle={{ marginBottom: spacing.md }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              <Chip
                label={`${t('community.groups.tab.mine')}${mine.length ? ` (${mine.length})` : ''}`}
                selected={tab === 'mine'}
                onPress={() => setTab('mine')}
              />
              <Chip
                label={t('community.groups.tab.discover')}
                selected={tab === 'discover'}
                onPress={() => setTab('discover')}
              />
            </View>
            <Button
              label={t('community.groups.create')}
              variant="secondary"
              size="md"
              disabled={!userId}
              onPress={() => setView({ kind: 'create' })}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            busy={dir.busyId === item.id}
            onOpen={() => setView({ kind: 'group', group: item })}
            onJoin={() => join(item)}
            onLeave={() => confirmLeave(item)}
          />
        )}
        ListEmptyComponent={empty}
      />
    </SafeAreaView>
  );
}

/* ── list states ──────────────────────────────────────────────────────────────────────────── */
function ListState({
  phase,
  emptyKind,
  onRetry,
  onCreate,
  onDiscover,
}: {
  phase: ListPhase;
  emptyKind: 'none' | 'mine' | 'noResults';
  onRetry: () => void;
  onCreate: () => void;
  onDiscover: () => void;
}) {
  const { t } = useT();
  const { colors } = useTheme();

  if (phase === 'unavailable') {
    return (
      <ErrorState title={t('state.unavailable.title')} description={t('state.unavailable.body')} />
    );
  }
  if (phase === 'signed_out') {
    return (
      <EmptyState
        icon={<Users size={48} color={colors.primary} />}
        title={t('community.signedOut.title')}
        description={t('community.signedOut.body')}
      />
    );
  }
  if (phase === 'offline') {
    return (
      <ErrorState
        title={t('community.groups.error.title')}
        description={t('community.offline.banner')}
        retryLabel={t('common.retry')}
        onRetry={onRetry}
      />
    );
  }
  if (phase === 'error') {
    return (
      <ErrorState
        title={t('community.groups.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={onRetry}
      />
    );
  }
  if (phase === 'loading') {
    return (
      <SkeletonGroup label={t('state.loading')}>
        <SkeletonBlock height={92} radius={16} />
        <SkeletonBlock height={92} radius={16} />
        <SkeletonBlock height={92} radius={16} />
      </SkeletonGroup>
    );
  }
  // empty
  if (emptyKind === 'noResults') {
    return (
      <EmptyState
        icon={<Search size={48} color={colors.primary} />}
        title={t('community.groups.noResults.title')}
        description={t('community.groups.noResults.body')}
        actionLabel={t('community.groups.create')}
        onAction={onCreate}
      />
    );
  }
  if (emptyKind === 'mine') {
    return (
      <EmptyState
        icon={<Users size={48} color={colors.primary} />}
        title={t('community.groups.mine.empty.title')}
        description={t('community.groups.mine.empty.body')}
        actionLabel={t('community.groups.mine.empty.action')}
        onAction={onDiscover}
        secondaryActionLabel={t('community.groups.create')}
        onSecondaryAction={onCreate}
      />
    );
  }
  return (
    <EmptyState
      icon={<Users size={48} color={colors.primary} />}
      title={t('community.groups.empty.title')}
      description={t('community.groups.empty.body')}
      actionLabel={t('community.groups.create')}
      onAction={onCreate}
    />
  );
}

/* ── group card ───────────────────────────────────────────────────────────────────────────── */
function membersLabel(n: number, t: ReturnType<typeof useT>['t']) {
  return n === 1 ? t('community.groups.members.one') : t('community.groups.members', { n });
}

function GroupCard({
  group,
  busy,
  onOpen,
  onJoin,
  onLeave,
}: {
  group: PeerGroup;
  busy: boolean;
  onOpen: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const meta = groupMeta(group, lang);
  return (
    <Card padding={spacing.lg}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={t('community.groups.open.a11y', { name: group.name })}
        style={{ minHeight: MIN_TOUCH_TARGET }}
      >
        <AppText variant="h3" numberOfLines={2}>
          {group.name}
        </AppText>
        {meta ? (
          <AppText variant="small" tone="muted" style={{ marginTop: 2 }} numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
        {group.description ? (
          <AppText variant="body" tone="muted" numberOfLines={2} style={{ marginTop: spacing.xs2 }}>
            {group.description}
          </AppText>
        ) : null}
      </Pressable>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.md,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, flex: 1 }}>
          <Users size={16} color={colors.textMute} />
          <AppText variant="small" tone="muted">
            {membersLabel(group.memberCount, t)}
          </AppText>
        </View>
        <Button
          label={group.isMember ? t('community.groups.leave') : t('community.groups.join')}
          accessibilityLabel={
            group.isMember
              ? t('community.groups.leave.a11y', { name: group.name })
              : t('community.groups.join.a11y', { name: group.name })
          }
          variant={group.isMember ? 'destructiveOutline' : 'primary'}
          size="sm"
          fullWidth={false}
          loading={busy}
          onPress={group.isMember ? onLeave : onJoin}
        />
      </View>
    </Card>
  );
}

/* ── create form ──────────────────────────────────────────────────────────────────────────── */
function CreateGroup({
  isOffline,
  onBack,
  onCreate,
}: {
  isOffline: boolean;
  onBack: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    crop: string;
    region: string;
  }) => Promise<WriteResult>;
}) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [crop, setCrop] = useState('');
  const [region, setRegion] = useState('');
  const [errors, setErrors] = useState<GroupErrors>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const input = { name, description, crop, region };
    const e = validateGroupInput(input);
    setErrors(e);
    if (hasErrors(e)) return;
    setBusy(true);
    const r = await onCreate(input);
    setBusy(false);
    if (!r.ok) {
      Alert.alert(
        t('state.error.title'),
        r.reason === 'offline' ? t('community.offline.write') : t('community.create.failed')
      );
    }
  };

  const label = (text: string) => (
    <AppText variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {text}
    </AppText>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('community.create.title')}
        showBack
        onBack={onBack}
        backLabel={t('common.back')}
      />
      <OfflineBanner message={t('community.offline.write')} visible={isOffline} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <AppText variant="body" tone="muted">
            {t('community.create.note')}
          </AppText>

          <TextField
            label={t('community.create.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('community.create.name.placeholder')}
            maxLength={80}
            error={errors.name ? t('community.create.name.error') : undefined}
            testID="group-name"
            wrapperStyle={{ marginTop: spacing.lg }}
          />
          <TextField
            label={t('community.create.description')}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            error={errors.description ? t('community.create.description.error') : undefined}
            testID="group-description"
          />

          {label(t('community.create.crop'))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CROPS.map((c) => (
              <Chip
                key={c}
                label={cropLabel(c, lang)}
                selected={crop === c}
                onPress={() => setCrop(crop === c ? '' : c)}
              />
            ))}
          </View>

          {label(t('community.create.region'))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REGIONS.map((r) => (
              <Chip
                key={r}
                label={r}
                selected={region === r}
                onPress={() => setRegion(region === r ? '' : r)}
              />
            ))}
          </View>
        </ScrollView>
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button
            label={t('community.create.cta')}
            onPress={submit}
            loading={busy}
            disabled={isOffline}
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── one group ────────────────────────────────────────────────────────────────────────────── */
function GroupDetail({
  group,
  userId,
  isOffline,
  busy,
  onBack,
  onJoin,
  onLeave,
}: {
  group: PeerGroup;
  userId: string | null;
  isOffline: boolean;
  busy: boolean;
  onBack: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const feed = usePeerPosts(group.id, userId, group.isMember);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [draftError, setDraftError] = useState(false);

  const meta = groupMeta(group, lang);
  const left = POST_MAX - draft.length;

  const send = async () => {
    const e = validatePostBody(draft);
    setDraftError(Boolean(e.body) && draft.trim().length > 0);
    if (e.body) return;
    setSending(true);
    const r = await feed.send(draft);
    setSending(false);
    if (r.ok) {
      setDraft('');
      setDraftError(false);
    } else {
      // The text stays in the box so nothing the farmer wrote is lost.
      Alert.alert(
        t('state.error.title'),
        r.reason === 'offline' ? t('community.offline.write') : t('community.post.failed')
      );
    }
  };

  const confirmDelete = (p: PeerPost) => {
    Alert.alert(t('community.post.delete.confirm.title'), t('community.post.delete.confirm.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('community.post.delete'),
        style: 'destructive',
        onPress: async () => {
          const r = await feed.remove(p.id);
          if (!r.ok) {
            Alert.alert(
              t('state.error.title'),
              r.reason === 'offline'
                ? t('community.offline.write')
                : t('community.post.deleteFailed')
            );
          }
        },
      },
    ]);
  };

  // What replaces the post list when there is nothing to list.
  let feedState: React.ReactElement | null = null;
  if (!group.isMember) {
    feedState = (
      <EmptyState
        icon={<Users size={48} color={colors.primary} />}
        title={t('community.group.joinToRead.title')}
        description={t('community.group.joinToRead.body')}
        actionLabel={t('community.groups.join')}
        onAction={onJoin}
      />
    );
  } else if (feed.posts.length === 0) {
    if (!feed.loaded && isOffline) {
      feedState = (
        <ErrorState
          title={t('community.posts.error.title')}
          description={t('community.offline.banner')}
          retryLabel={t('common.retry')}
          onRetry={feed.refresh}
        />
      );
    } else if (feed.error) {
      feedState = (
        <ErrorState
          title={t('community.posts.error.title')}
          description={t('state.error.body')}
          retryLabel={t('common.retry')}
          onRetry={feed.refresh}
        />
      );
    } else if (!feed.loaded) {
      feedState = (
        <SkeletonGroup label={t('state.loading')}>
          <SkeletonBlock height={84} radius={16} />
          <SkeletonBlock height={84} radius={16} />
        </SkeletonGroup>
      );
    } else {
      feedState = (
        <EmptyState
          icon={<Users size={48} color={colors.primary} />}
          title={t('community.posts.empty.title')}
          description={t('community.posts.empty.body')}
        />
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={group.name} showBack onBack={onBack} backLabel={t('common.back')} />
      <OfflineBanner message={t('community.offline.banner')} visible={isOffline} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={feedState ? [] : feed.posts}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={feed.loading && feed.loaded}
              onRefresh={() => {
                if (group.isMember) feed.refresh();
              }}
            />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.lg }}>
              <Card padding={spacing.lg}>
                {meta ? (
                  <AppText variant="small" tone="muted">
                    {meta}
                  </AppText>
                ) : null}
                <AppText variant="label" style={{ marginTop: meta ? spacing.sm : 0 }}>
                  {t('community.group.about')}
                </AppText>
                <AppText variant="body" tone="muted" style={{ marginTop: 2 }}>
                  {group.description ?? t('community.group.noDescription')}
                </AppText>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: spacing.md,
                    gap: spacing.md,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.xs2,
                      flex: 1,
                    }}
                  >
                    <Users size={16} color={colors.textMute} />
                    <AppText variant="small" tone="muted">
                      {membersLabel(group.memberCount, t)}
                    </AppText>
                  </View>
                  <Button
                    label={
                      group.isMember ? t('community.groups.leave') : t('community.groups.join')
                    }
                    accessibilityLabel={
                      group.isMember
                        ? t('community.groups.leave.a11y', { name: group.name })
                        : t('community.groups.join.a11y', { name: group.name })
                    }
                    variant={group.isMember ? 'destructiveOutline' : 'primary'}
                    size="sm"
                    fullWidth={false}
                    loading={busy}
                    onPress={group.isMember ? onLeave : onJoin}
                  />
                </View>
              </Card>

              {group.isMember ? (
                <View style={{ marginTop: spacing.lg }}>
                  <TextField
                    value={draft}
                    onChangeText={(v) => {
                      setDraft(v);
                      if (draftError) setDraftError(false);
                    }}
                    placeholder={t('community.post.placeholder')}
                    accessibilityLabel={t('community.post.a11y')}
                    multiline
                    maxLength={POST_MAX}
                    size="md"
                    error={draftError ? t('community.post.tooLong') : undefined}
                    hint={left <= 200 ? t('community.post.remaining', { n: left }) : undefined}
                    wrapperStyle={{ marginBottom: spacing.sm }}
                    testID="post-draft"
                  />
                  <Button
                    label={t('community.post.send')}
                    onPress={send}
                    loading={sending}
                    disabled={isOffline || draft.trim().length === 0}
                    size="md"
                    fullWidth
                  />
                  {feed.posts.length > 0 ? (
                    <AppText variant="label" style={{ marginTop: spacing.xl }}>
                      {t('community.posts.title')}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <PostCard post={item} myUserId={userId} onDelete={() => confirmDelete(item)} />
          )}
          ListEmptyComponent={feedState}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── post card ────────────────────────────────────────────────────────────────────────────── */
function PostCard({
  post,
  myUserId,
  onDelete,
}: {
  post: PeerPost;
  myUserId: string | null;
  onDelete: () => void;
}) {
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const who = authorKind(post, myUserId);
  const name =
    who.kind === 'me'
      ? who.name
        ? `${who.name} (${t('community.post.you')})`
        : t('community.post.you')
      : who.kind === 'named'
        ? who.name!
        : t('community.post.member');
  const initialSource = who.kind === 'member' ? null : (who.name ?? t('community.post.you'));
  const ago = timeAgoKey(post.createdAt);

  return (
    <Card padding={spacing.lg}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <AppText variant="label" tone="primary">
            {initialOf(initialSource)}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t(ago.key, ago.params)}
          </AppText>
        </View>
        {who.kind === 'me' ? (
          <Button
            label={t('community.post.delete')}
            variant="link"
            size="sm"
            fullWidth={false}
            onPress={onDelete}
          />
        ) : null}
      </View>
      <AppText variant="body">{post.body}</AppText>
    </Card>
  );
}
