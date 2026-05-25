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
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSignup() {
    setMessage('');
    setIsSuccess(false);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      setMessage('Account created. Taking you to your pantry.');
      setIsSuccess(true);
    } else {
      setMessage('Check your email to confirm your account, then log in.');
      setIsSuccess(true);
    }

    setIsSubmitting(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper}>
      <Screen style={styles.screen}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>UseItUp</Text>
          <Text style={styles.tagline}>Create your pantry account and start saving food before it expires.</Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.iconBox}>
              <Ionicons color={palette.green} name="person-add-outline" size={24} />
            </View>
            <View style={styles.formHeaderCopy}>
              <Text style={styles.formTitle}>Create account</Text>
              <Text style={styles.formSubtitle}>Use an email you can verify.</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.muted}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
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

          {message ? <Text style={[styles.messageText, isSuccess ? styles.successText : styles.errorText]}>{message}</Text> : null}

          <Pressable disabled={isSubmitting} onPress={handleSignup} style={[styles.primaryButton, isSubmitting && styles.disabledButton]}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account?</Text>
            <Link href={'/login' as Href} style={styles.switchLink}>
              Log in
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
