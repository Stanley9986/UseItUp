import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';

import { Button, Card, Chip, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getFriendlyAuthError } from '@/lib/auth-errors';
import { getCookHistory } from '@/lib/cook-history';
import { CookHistoryItem } from '@/lib/cook-history-mappers';
import { getErrorMessage } from '@/lib/errors';
import { getLanguageOption, supportedLanguages } from '@/lib/languages';
import { supabase } from '@/lib/supabase';
import { defaultUserPreferences, getUserPreferences, saveUserPreferences } from '@/lib/user-preferences';
import { summarizeUserPreferences } from '@/lib/user-preferences-mappers';
import { UserPreferences } from '@/types/useitup';

type SettingsRow = {
  detail: string;
  href?: '/cook-history' | '/dietary-preferences' | '/expiration-reminders' | '/shopping-list';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};
export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const { languageCode, setLanguageCode, t } = useAppLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [cookHistory, setCookHistory] = useState<CookHistoryItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [historyMessage, setHistoryMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileMessageType, setProfileMessageType] = useState<'error' | 'success'>('success');
  const [preferencesMessage, setPreferencesMessage] = useState('');
  const email = user?.email ?? t('signedInUser');
  const displayName = user?.user_metadata?.name ?? email.split('@')[0] ?? 'UseItUp';
  const initial = displayName.charAt(0).toUpperCase();
  const loadCookHistory = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setHistoryMessage('');
      setCookHistory(await getCookHistory(user.id));
    } catch (error) {
      setHistoryMessage(getErrorMessage(error, t('unableToLoadCookHistory')));
    }
  }, [t, user]);
  const loadPreferences = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setPreferencesMessage('');
      const nextPreferences = await getUserPreferences(user.id);
      setPreferences(nextPreferences);
    } catch (error) {
      setPreferencesMessage(getErrorMessage(error, t('unableToLoadRecipePreferences')));
    }
  }, [t, user]);
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
      setProfileMessage(t('enterDisplayNameBeforeSaving'));
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
      setProfileMessage(getFriendlyAuthError(error, t('updateDisplayNameError')));
    } else {
      setProfileMessageType('success');
      setProfileMessage(t('nameUpdated'));
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

  async function handleSelectLanguage(nextLanguageCode: string) {
    if (!user || isSavingLanguage || nextLanguageCode === languageCode) {
      return;
    }

    setIsSavingLanguage(true);
    setPreferencesMessage('');

    try {
      const nextPreferences = await saveUserPreferences(user.id, {
        ...preferences,
        languageCode: nextLanguageCode,
      });
      setPreferences(nextPreferences);
      setLanguageCode(nextPreferences.languageCode ?? nextLanguageCode);
      setProfileMessageType('success');
      setProfileMessage(t('appLanguageSaved'));
    } catch (error) {
      setPreferencesMessage(getErrorMessage(error, t('languageSaveError')));
    } finally {
      setIsSavingLanguage(false);
    }
  }

  const latestCookedRecipe = cookHistory[0];
  const recentlyCookedRow: SettingsRow = {
    href: '/cook-history',
    icon: 'checkmark-circle-outline',
    title: t('recentlyCooked'),
    detail: historyMessage
      ? historyMessage
      : latestCookedRecipe
        ? latestCookedRecipe.recipeTitle
        : t('cookSavedRecipeToSeeItHere'),
  };
  const kitchenRows: SettingsRow[] = [
    {
      href: '/shopping-list',
      icon: 'cart-outline',
      title: t('shoppingList'),
      detail: t('missingIngredientsToBuy'),
    },
  ];
  const preferenceRows: SettingsRow[] = [
    {
      href: '/expiration-reminders',
      icon: 'notifications-outline',
      title: t('expirationReminders'),
      detail: t('expirationRemindersDetail'),
    },
    {
      icon: 'shield-checkmark-outline',
      title: t('accountSecurity'),
      detail: t('accountSecurityDetail'),
    },
  ];

  return (
    <Screen onRefresh={refresh} refreshing={isRefreshing} title={t('more')} subtitle={t('manageKitchenTools')}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.profileCopy}>
          <View style={styles.nameRow}>
            <Text numberOfLines={2} style={styles.name}>{displayName}</Text>
            {!isEditingName ? (
              <Pressable
                accessibilityLabel={t('editDisplayName')}
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
              <Text style={styles.inputLabel}>{t('editDisplayName')}</Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDisplayNameInput}
                placeholder={t('yourName')}
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={displayNameInput}
              />
              <View style={styles.editActions}>
                <Button compact onPress={handleSaveDisplayName} icon="save-outline" style={styles.editAction}>
                  {isSavingName ? t('saving') : t('save')}
                </Button>
                <Button compact onPress={handleCancelEditingName} secondary icon="close-outline" style={styles.editAction}>
                  {t('cancel')}
                </Button>
              </View>
            </View>
          ) : null}
          {profileMessage ? (
            <Text style={[styles.profileMessage, profileMessageType === 'error' ? styles.errorText : styles.successText]}>
              {profileMessage}
            </Text>
          ) : null}
          <Text style={styles.phaseLabel}>{t('supabaseAccount')}</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionTitle>{t('kitchen')}</SectionTitle>
        <Card style={styles.listCard}>
          {[...kitchenRows, recentlyCookedRow].map((row, index) => (
            <SettingsRowView
              key={row.title}
              row={row}
              showDivider={index > 0}
              tone={row.href === '/cook-history' ? 'success' : 'default'}
            />
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t('preferences')}</SectionTitle>
        <Card style={styles.languageCard}>
          <Text style={styles.previewTitle}>{t('appLanguage')}</Text>
          <Text style={styles.previewText}>{t('appLanguageDetail')}</Text>
          <View style={styles.chipWrap}>
            {supportedLanguages.map((language) => (
              <Chip
                key={language.code}
                label={language.label}
                onPress={() => handleSelectLanguage(language.code)}
                selected={languageCode === language.code}
              />
            ))}
          </View>
          <Text style={styles.languageDetail}>
            {getLanguageOption(languageCode).label}
          </Text>
        </Card>
        <Card style={styles.listCard}>
          {([
            {
              href: '/dietary-preferences',
              icon: 'leaf-outline',
              title: t('recipePreferences'),
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
        <SectionTitle>{t('account')}</SectionTitle>
        <Card style={styles.previewCard}>
          <Text style={styles.previewTitle}>{t('signedInWithSupabaseAuth')}</Text>
          <Text style={styles.previewText}>
            {t('useItUpAccountCopy')}
          </Text>
          <Button compact onPress={handleSignOut} secondary icon="log-out-outline">
            {isSigningOut ? t('signingOut') : t('signOut')}
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
  languageCard: {
    backgroundColor: palette.card,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageDetail: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '800',
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
