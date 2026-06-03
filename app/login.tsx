import { Ionicons } from '@expo/vector-icons';
import { Href, Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, palette, Screen } from '@/components/useitup/ui';
import { useAppLanguage } from '@/contexts/language-context';
import { getFriendlyAuthError } from '@/lib/shared/auth-errors';
import { supabase } from '@/lib/shared/supabase';

export default function LoginScreen() {
  const { t } = useAppLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleLogin() {
    setMessage('');
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(getFriendlyAuthError(error, t('unableToLogIn')));
    }

    setIsSubmitting(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
      <Screen style={styles.screen}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>UseItUp</Text>
          <Text style={styles.tagline}>{t('loginTagline')}</Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.iconBox}>
              <Ionicons color={palette.green} name="lock-closed-outline" size={24} />
            </View>
            <View style={styles.formHeaderCopy}>
              <Text style={styles.formTitle}>{t('welcomeBack')}</Text>
              <Text style={styles.formSubtitle}>{t('useEmailPasswordToContinue')}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('email')}</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('password')}</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder={t('yourPassword')}
              placeholderTextColor={palette.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {message ? <Text style={styles.errorText}>{message}</Text> : null}

          <Link href={'/forgot-password' as Href} style={styles.forgotLink}>
            {t('forgotPassword')}
          </Link>

          <Pressable disabled={isSubmitting} onPress={handleLogin} style={[styles.primaryButton, isSubmitting && styles.disabledButton]}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('logInButton')}</Text>}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t('newToUseItUp')}</Text>
            <Link href={'/signup' as Href} style={styles.switchLink}>
              {t('createAccount')}
            </Link>
          </View>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: palette.background,
    flex: 1,
  },
  screen: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandBlock: {
    gap: 8,
  },
  brand: {
    color: palette.ink,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
  },
  tagline: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  formCard: {
    gap: 18,
  },
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  formHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  formTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  formSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 7,
  },
  label: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 13,
  },
  errorText: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  forgotLink: {
    alignSelf: 'flex-start',
    color: palette.blue,
    fontSize: 14,
    fontWeight: '800',
    marginTop: -6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.blue,
    borderRadius: 8,
    minHeight: 50,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  switchText: {
    color: palette.muted,
    fontSize: 14,
  },
  switchLink: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '800',
  },
});
