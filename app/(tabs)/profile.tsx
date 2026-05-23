import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle } from '@/components/useitup/ui';

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
    detail: 'Login arrives in Phase 2',
  },
] as const;

export default function ProfileScreen() {
  return (
    <Screen title="More" subtitle="Profile and preference placeholders for the static prototype.">
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>Alex Pantry</Text>
          <Text style={styles.email}>alex@example.com</Text>
          <Text style={styles.phaseLabel}>Static prototype account</Text>
        </View>
      </Card>

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
        <SectionTitle>Phase 2 Preview</SectionTitle>
        <Card style={styles.previewCard}>
          <Text style={styles.previewTitle}>Next: Supabase Auth + Pantry CRUD</Text>
          <Text style={styles.previewText}>
            Login, signup, real pantry items, edit/delete, and expiration sorting come after this
            static UI phase.
          </Text>
          <Button compact href="/(tabs)/pantry" secondary icon="basket-outline">
            Review Pantry
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
    fontSize: 17,
    fontWeight: '900',
  },
  previewText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
