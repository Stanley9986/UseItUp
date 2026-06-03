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

export default function SignupScreen() {
  const { t } = useAppLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleSignup() {
    setMessage('');
    setIsSuccess(false);
    setNeedsVerification(false);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(getFriendlyAuthError(error, t('unableToCreateAccount')));
    } else if (data.session) {
      setMessage(t('accountCreatedTakingToPantry'));
      setIsSuccess(true);
    } else {
      setMessage(t('weSentConfirmationLink'));
      setIsSuccess(true);
      setNeedsVerification(true);
    }

    setIsSubmitting(false);
  }

  async function handleResendConfirmation() {
    setMessage('');
    setIsSubmitting(true);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });

    if (error) {
      setMessage(getFriendlyAuthError(error, t('unableToResendConfirmation')));
      setIsSuccess(false);
    } else {
      setMessage(t('confirmationEmailSentAgain'));
      setIsSuccess(true);
      setNeedsVerification(true);
    }

    setIsSubmitting(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
      <Screen style={styles.screen}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>UseItUp</Text>
          <Text style={styles.tagline}>{t('createPantryAccount')}</Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.iconBox}>
              <Ionicons color={palette.green} name="person-add-outline" size={24} />
            </View>
            <View style={styles.formHeaderCopy}>
              <Text style={styles.formTitle}>{t('createAccount')}</Text>
              <Text style={styles.formSubtitle}>{t('useEmailYouCanVerify')}</Text>
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
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder={t('passwordMinPlaceholder')}
              placeholderTextColor={palette.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {needsVerification ? (
            <View style={styles.successCard}>
              <Ionicons color={palette.green} name="mail-unread-outline" size={24} />
              <View style={styles.successCopy}>
                <Text style={styles.successTitle}>{t('verifyEmail')}</Text>
                <Text style={styles.successBody}>{message}</Text>
              </View>
            </View>
          ) : message ? (
            <Text style={[styles.messageText, isSuccess ? styles.successText : styles.errorText]}>{message}</Text>
          ) : null}

          <Pressable disabled={isSubmitting} onPress={handleSignup} style={[styles.primaryButton, isSubmitting && styles.disabledButton]}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('createAccountButton')}</Text>}
          </Pressable>

          {needsVerification ? (
            <Pressable disabled={isSubmitting} onPress={handleResendConfirmation} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('resendConfirmationEmail')}</Text>
            </Pressable>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{t('alreadyHaveAccount')}</Text>
            <Link href={'/login' as Href} style={styles.switchLink}>
              {t('logIn')}
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
  messageText: {
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
  successCard: {
    alignItems: 'flex-start',
    backgroundColor: palette.greenSoft,
    borderColor: '#bfe6dc',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  successCopy: {
    flex: 1,
    gap: 3,
  },
  successTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  successBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
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
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: palette.blueSoft,
    borderColor: '#c7d8ff',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: palette.blue,
    fontSize: 15,
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
