import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getFriendlyAuthError } from '@/lib/auth-errors';
import { getCookHistory } from '@/lib/cook-history';
import { CookHistoryItem } from '@/lib/cook-history-mappers';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { defaultUserPreferences, getUserPreferences } from '@/lib/user-preferences';
import { summarizeUserPreferences } from '@/lib/user-preferences-mappers';
import { UserPreferences } from '@/types/useitup';

type SettingsRow = {
  detail: string;
  href?: '/cook-history' | '/dietary-preferences' | '/expiration-reminders' | '/shopping-list';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};
const kitchenRows: SettingsRow[] = [
  {
    href: '/shopping-list',
    icon: 'cart-outline',
    title: 'Shopping List',
    detail: 'Missing ingredients to buy',
  },
];
const preferenceRows: SettingsRow[] = [
  {
    href: '/expiration-reminders',
    icon: 'notifications-outline',
    title: 'Expiration Reminders',
    detail: 'Local alerts for food expiring soon',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Account Security',
    detail: 'Email/password login active',
  },
];

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [cookHistory, setCookHistory] = useState<CookHistoryItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [historyMessage, setHistoryMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileMessageType, setProfileMessageType] = useState<'error' | 'success'>('success');
  const [preferencesMessage, setPreferencesMessage] = useState('');
  const email = user?.email ?? 'Signed-in user';
  const displayName = user?.user_metadata?.name ?? email.split('@')[0] ?? 'UseItUp User';
  const initial = displayName.charAt(0).toUpperCase();
  const loadCookHistory = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setHistoryMessage('');
      setCookHistory(await getCookHistory(user.id));
    } catch (error) {
      setHistoryMessage(getErrorMessage(error, 'Unable to load cooked recipe history.'));
    }
  }, [user]);
  const loadPreferences = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setPreferencesMessage('');
      const nextPreferences = await getUserPreferences(user.id);
      setPreferences(nextPreferences);
    } catch (error) {
      setPreferencesMessage(getErrorMessage(error, 'Unable to load dietary preferences.'));
    }
  }, [user]);
  const { isRefreshing, refresh } = useRefresh(async () => {
    await Promise.all([supabase.auth.refreshSession(), loadCookHistory(), loadPreferences()]);
  });

  useEffect(() => {
    setDisplayNameInput(displayName);
  }, [displayName]);

  useEffect(() => {
    loadCookHistory();
  }, [loadCookHistory]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (!profileMessage || profileMessageType !== 'success') {
      return;
    }

    const timeout = setTimeout(() => {
      setProfileMessage('');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [profileMessage, profileMessageType]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  async function handleSaveDisplayName() {
    const nextName = displayNameInput.trim();

    if (!nextName) {
      setProfileMessageType('error');
      setProfileMessage('Enter a display name before saving.');
      return;
    }

    setIsSavingName(true);
    setProfileMessage('');

    const { error } = await supabase.auth.updateUser({
      data: {
        name: nextName,
      },
    });

    if (error) {
      setProfileMessageType('error');
      setProfileMessage(getFriendlyAuthError(error, 'Unable to update display name.'));
    } else {
      setProfileMessageType('success');
      setProfileMessage('Name updated.');
      setIsEditingName(false);
    }

    setIsSavingName(false);
  }

  function handleStartEditingName() {
    setDisplayNameInput(displayName);
    setProfileMessage('');
    setIsEditingName(true);
  }

  function handleCancelEditingName() {
    setDisplayNameInput(displayName);
    setProfileMessage('');
    setIsEditingName(false);
  }

  const latestCookedRecipe = cookHistory[0];
  const recentlyCookedRow: SettingsRow = {
    href: '/cook-history',
    icon: 'checkmark-circle-outline',
    title: 'Recently Cooked',
    detail: historyMessage
      ? historyMessage
      : latestCookedRecipe
        ? latestCookedRecipe.recipeTitle
        : 'Cook a saved recipe to see it here',
  };

  return (
    <Screen onRefresh={refresh} refreshing={isRefreshing} title="More" subtitle="Manage your kitchen tools and account.">
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.profileCopy}>
          <View style={styles.nameRow}>
            <Text numberOfLines={2} style={styles.name}>{displayName}</Text>
            {!isEditingName ? (
              <Pressable
                accessibilityLabel="Edit display name"
                hitSlop={10}
                onPress={handleStartEditingName}
                style={styles.editIconButton}>
                <Ionicons color={palette.blue} name="create-outline" size={18} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.email}>{email}</Text>
          {isEditingName ? (
            <View style={styles.inlineEdit}>
              <Text style={styles.inputLabel}>Edit display name</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDisplayNameInput}
                placeholder="Your name"
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={displayNameInput}
              />
              <View style={styles.editActions}>
                <Button compact onPress={handleSaveDisplayName} icon="save-outline" style={styles.editAction}>
                  {isSavingName ? 'Saving...' : 'Save'}
                </Button>
                <Button compact onPress={handleCancelEditingName} secondary icon="close-outline" style={styles.editAction}>
                  Cancel
                </Button>
              </View>
            </View>
          ) : null}
          {profileMessage ? (
            <Text style={[styles.profileMessage, profileMessageType === 'error' ? styles.errorText : styles.successText]}>
              {profileMessage}
            </Text>
          ) : null}
          <Text style={styles.phaseLabel}>Supabase account</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionTitle>Kitchen</SectionTitle>
        <Card style={styles.listCard}>
          {[...kitchenRows, recentlyCookedRow].map((row, index) => (
            <SettingsRowView
              key={row.title}
              row={row}
              showDivider={index > 0}
              tone={row.title === 'Recently Cooked' ? 'success' : 'default'}
            />
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Preferences</SectionTitle>
        <Card style={styles.listCard}>
          {([
            {
              href: '/dietary-preferences',
              icon: 'leaf-outline',
              title: 'Dietary Preferences',
              detail: summarizeUserPreferences(preferences),
            },
            ...preferenceRows,
          ] satisfies SettingsRow[]).map((row, index) => (
            <SettingsRowView key={row.title} row={row} showDivider={index > 0} />
          ))}
          {preferencesMessage ? (
            <Text style={[styles.preferenceMessage, styles.errorText]}>
              {preferencesMessage}
            </Text>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Account</SectionTitle>
        <Card style={styles.previewCard}>
          <Text style={styles.previewTitle}>Signed in with Supabase Auth</Text>
          <Text style={styles.previewText}>
            Pantry items will be connected to this account next, so each user only sees their own
            food.
          </Text>
          <Button compact onPress={handleSignOut} secondary icon="log-out-outline">
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderRadius: 8,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },
  profileCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  name: {
    color: palette.ink,
    flex: 1,
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  editIconButton: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  email: {
    color: palette.muted,
    fontSize: 14,
  },
  phaseLabel: {
    alignSelf: 'flex-start',
    backgroundColor: palette.blueSoft,
    borderRadius: 6,
    color: palette.blue,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  section: {
    gap: 10,
  },
  inlineEdit: {
    gap: 9,
    marginTop: 7,
  },
  inputLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  editActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editAction: {
    flexGrow: 1,
  },
  profileMessage: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  errorText: {
    color: palette.red,
  },
  successText: {
    color: palette.green,
  },
  listCard: {
    gap: 0,
    padding: 0,
  },
  preferenceMessage: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  withDivider: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowIconSuccess: {
    backgroundColor: palette.greenSoft,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  rowDetail: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: palette.surface,
  },
  previewTitle: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '900',
  },
  previewText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});

function SettingsRowView({
  row,
  showDivider,
  tone = 'default',
}: {
  row: SettingsRow;
  showDivider?: boolean;
  tone?: 'default' | 'success';
}) {
  const content = (
    <View style={[styles.row, showDivider && styles.withDivider]}>
      <View style={[styles.rowIcon, tone === 'success' && styles.rowIconSuccess]}>
        <Ionicons color={palette.green} name={row.icon} size={20} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{row.title}</Text>
        <Text numberOfLines={2} style={styles.rowDetail}>{row.detail}</Text>
      </View>
      <Ionicons color={palette.muted} name="chevron-forward" size={18} />
    </View>
  );

  if (row.href) {
    return (
      <Link asChild href={row.href}>
        <Pressable>{content}</Pressable>
      </Link>
    );
  }

  return content;
}
