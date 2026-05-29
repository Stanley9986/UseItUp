import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { getFriendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleUpdatePassword() {
    setMessage('');
    setIsSuccess(false);

    if (password.length < 6) {
      setMessage('Use a password with at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(getFriendlyAuthError(error, 'Unable to update password.'));
    } else {
      setIsSuccess(true);
      setMessage('Password updated. You can log in with the new password now.');
      await supabase.auth.signOut();
    }

    setIsSubmitting(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
      <Screen style={styles.screen}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>UseItUp</Text>
          <Text style={styles.tagline}>Choose a new password for your account.</Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.iconBox}>
              <Ionicons color={palette.green} name="key-outline" size={24} />
            </View>
            <View style={styles.formHeaderCopy}>
              <Text style={styles.formTitle}>Reset password</Text>
              <Text style={styles.formSubtitle}>Enter a new password after opening the reset link from your email.</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={palette.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor={palette.muted}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
          </View>

          {message ? <Text style={[styles.messageText, isSuccess ? styles.successText : styles.errorText]}>{message}</Text> : null}

          <Pressable
            disabled={isSubmitting || isSuccess}
            onPress={handleUpdatePassword}
            style={[styles.primaryButton, (isSubmitting || isSuccess) && styles.disabledButton]}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Update Password</Text>}
          </Pressable>

          {isSuccess ? (
            <Pressable onPress={() => router.replace('/login')} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
            </Pressable>
          ) : null}
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
});
