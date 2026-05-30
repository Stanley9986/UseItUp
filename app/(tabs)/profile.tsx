import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { getFriendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

const settingsRows = [
  {
    icon: 'leaf-outline',
    title: 'Dietary Preferences',
    detail: 'No preferences set',
  },
  {
    icon: 'notifications-outline',
    title: 'Expiration Reminders',
    detail: 'Notification-ready data later',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Account Security',
    detail: 'Email/password login active',
  },
] as const;

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileMessageType, setProfileMessageType] = useState<'error' | 'success'>('success');
  const email = user?.email ?? 'Signed-in user';
  const displayName = user?.user_metadata?.name ?? email.split('@')[0] ?? 'UseItUp User';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    setDisplayNameInput(displayName);
  }, [displayName]);

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
      setProfileMessage('Display name updated.');
    }

    setIsSavingName(false);
  }

  return (
    <Screen title="More" subtitle="Manage your UseItUp account and preferences.">
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.phaseLabel}>Supabase account</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionTitle>Profile</SectionTitle>
        <Card style={styles.editProfileCard}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            onChangeText={setDisplayNameInput}
            placeholder="Your name"
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={displayNameInput}
          />
          {profileMessage ? (
            <Text style={[styles.profileMessage, profileMessageType === 'error' ? styles.errorText : styles.successText]}>
              {profileMessage}
            </Text>
          ) : null}
          <Button compact onPress={handleSaveDisplayName} icon="save-outline">
            {isSavingName ? 'Saving...' : 'Save Name'}
          </Button>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Preferences</SectionTitle>
        <Card style={styles.listCard}>
          {settingsRows.map((row, index) => (
            <View key={row.title} style={[styles.row, index > 0 && styles.withDivider]}>
              <View style={styles.rowIcon}>
                <Ionicons color={palette.green} name={row.icon} size={20} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowDetail}>{row.detail}</Text>
              </View>
              <Ionicons color={palette.muted} name="chevron-forward" size={18} />
            </View>
          ))}
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
    gap: 3,
  },
  name: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
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
  editProfileCard: {
    alignItems: 'stretch',
  },
  inputLabel: {
    color: palette.ink,
    fontSize: 14,
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  rowCopy: {
    flex: 1,
    gap: 3,
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
