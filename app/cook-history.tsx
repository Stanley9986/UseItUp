import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useRefresh } from '@/hooks/use-refresh';
import { getCookHistory } from '@/lib/cook-history';
import { CookHistoryItem } from '@/lib/cook-history-mappers';
import { safeBack } from '@/lib/navigation';

export default function CookHistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<CookHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadHistory = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      if (!user) {
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      setMessage('');

      try {
        setHistory(await getCookHistory(user.id));
      } catch (error) {
        setMessage(getMessage(error, 'Unable to load cooked recipe history.'));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [user],
  );
  const { isRefreshing, refresh } = useRefresh(() => loadHistory({ showLoading: false }));

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title="Cook History"
      subtitle="Your latest cooked recipes."
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/profile')} secondary icon="arrow-back">Back</Button>}>
      <View style={styles.section}>
        <SectionTitle>Latest</SectionTitle>
        {isLoading ? (
          <Card style={styles.stateCard}>
            <Text style={styles.copy}>Loading cooked recipes...</Text>
          </Card>
        ) : message ? (
          <Card style={styles.stateCard}>
            <Ionicons color={palette.red} name="alert-circle-outline" size={24} />
            <Text style={styles.title}>Could not load history</Text>
            <Text style={styles.copy}>{message}</Text>
            <Button compact onPress={() => loadHistory()} secondary icon="refresh-outline">
              Try Again
            </Button>
          </Card>
        ) : history.length ? (
          <Card style={styles.listCard}>
            {history.map((item, index) => (
              <Link asChild href={`/recipe/${item.recipeId}`} key={item.id}>
                <Pressable style={styles.linkRow}>
                  <View style={[styles.row, index > 0 && styles.withDivider]}>
                    <View style={styles.rowIcon}>
                      <Ionicons color={palette.green} name="checkmark-circle-outline" size={20} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={2} style={styles.rowTitle}>{item.recipeTitle}</Text>
                      <Text numberOfLines={1} style={styles.rowDetail}>{formatCookedAt(item.cookedAt)}</Text>
                    </View>
                    <Ionicons color={palette.muted} name="chevron-forward" size={18} />
                  </View>
                </Pressable>
              </Link>
            ))}
          </Card>
        ) : (
          <Card style={styles.stateCard}>
            <Ionicons color={palette.green} name="restaurant-outline" size={24} />
            <Text style={styles.title}>No cooked recipes yet</Text>
            <Text style={styles.copy}>Cook a saved recipe and it will show up here.</Text>
            <Button compact href="/(tabs)/recipes" icon="restaurant-outline">
              View Recipes
            </Button>
          </Card>
        )}
      </View>
    </Screen>
  );
}

function formatCookedAt(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return fallback;
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  stateCard: {
    alignItems: 'flex-start',
  },
  title: {
    color: palette.ink,
    fontFamily: typography.display,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  copy: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  listCard: {
    gap: 0,
    padding: 0,
  },
  linkRow: {
    width: '100%',
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
});
