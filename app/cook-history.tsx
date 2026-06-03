import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, palette, Screen, SectionTitle, typography } from '@/components/useitup/ui';
import { useAuth } from '@/contexts/auth-context';
import { useAppLanguage } from '@/contexts/language-context';
import { useRefresh } from '@/hooks/use-refresh';
import { useTranslatedNames } from '@/hooks/use-term-translation';
import { getCookHistory } from '@/lib/cooking/cook-history';
import { CookHistoryItem } from '@/lib/cooking/cook-history-mappers';
import { getErrorMessage } from '@/lib/shared/errors';
import { safeBack } from '@/lib/shared/navigation';

export default function CookHistoryScreen() {
  const { user } = useAuth();
  const { languageCode, t } = useAppLanguage();
  const [history, setHistory] = useState<CookHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  // Cooked-history rows store a title string, so translate the titles directly.
  const titleMap = useTranslatedNames(useMemo(() => history.map((item) => item.recipeTitle), [history]));

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
        setMessage(getErrorMessage(error, t('unableToLoadCookHistory')));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [t, user],
  );
  const { isRefreshing, refresh } = useRefresh(() => loadHistory({ showLoading: false }));

  // Reload on focus so returning here (e.g. after deleting an entry) shows the
  // current list rather than a stale snapshot.
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  return (
    <Screen
      onRefresh={refresh}
      refreshing={isRefreshing}
      title={t('cookHistory')}
      subtitle={t('cookHistorySubtitle')}
      headerAction={<Button compact onPress={() => safeBack('/(tabs)/profile')} secondary icon="arrow-back">{t('back')}</Button>}>
      <View style={styles.section}>
        <SectionTitle>{t('latest')}</SectionTitle>
        {isLoading ? (
          <Card style={styles.stateCard}>
            <Text style={styles.copy}>{t('loadingCookedRecipes')}</Text>
          </Card>
        ) : message ? (
          <Card style={styles.stateCard}>
            <Ionicons color={palette.red} name="alert-circle-outline" size={24} />
            <Text style={styles.title}>{t('couldNotLoadHistory')}</Text>
            <Text style={styles.copy}>{message}</Text>
            <Button compact onPress={() => loadHistory()} secondary icon="refresh-outline">
              {t('retry')}
            </Button>
          </Card>
        ) : history.length ? (
          <Card style={styles.listCard}>
            {history.map((item, index) => (
              <Link asChild href={`/recipe/${item.recipeId}?source=history&sessionId=${item.id}`} key={item.id}>
                <Pressable style={styles.linkRow}>
                  <View style={[styles.row, index > 0 && styles.withDivider]}>
                    <View style={styles.rowIcon}>
                      <Ionicons color={palette.green} name="checkmark-circle-outline" size={20} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={2} style={styles.rowTitle}>{titleMap[item.recipeTitle] ?? item.recipeTitle}</Text>
                      <Text numberOfLines={1} style={styles.rowDetail}>{formatCookedAt(item.cookedAt, languageCode)}</Text>
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
            <Text style={styles.title}>{t('noCookedRecipesYet')}</Text>
            <Text style={styles.copy}>{t('cookSavedRecipeToSeeItHere')}</Text>
            <Button compact href="/(tabs)/recipes" icon="restaurant-outline">
              {t('viewRecipes')}
            </Button>
          </Card>
        )}
      </View>
    </Screen>
  );
}

function formatCookedAt(value: string, languageCode: string) {
  return new Intl.DateTimeFormat(languageCode, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
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
