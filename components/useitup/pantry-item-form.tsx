import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, palette } from '@/components/useitup/ui';
import { useAppLanguage } from '@/contexts/language-context';
import {
  getCalendarMonthGrid,
  getDateByMonthOffset,
  getDatePickerYearOptions,
  getDateInMonth,
  parseExpirationDate,
  toIsoDate,
} from '@/lib/shared/date-utils';
import { QuantityLabel, QuantityUnit, StorageLocation } from '@/types/useitup';

export type PantryItemFormValues = {
  name: string;
  category: string;
  quantityType: QuantityUnit;
  amount: string;
  level: string;
  location: StorageLocation;
  expiration: string;
  notes: string;
};

type PantryItemFormProps = {
  initialValues?: Partial<PantryItemFormValues>;
  isSaving?: boolean;
  message?: string;
  submitLabel: string;
  onSubmit: (values: PantryItemFormValues) => void;
};

const categories = ['produce', 'meat', 'dairy', 'grain', 'condiment', 'other'] as const;
const quantityTypes: QuantityUnit[] = ['count', 'portion', 'level'];
const locations: StorageLocation[] = ['fridge', 'freezer', 'pantry'];
const levels = ['low', 'medium', 'half', 'full'] as const;
type CalendarPickerMode = 'calendar' | 'monthYear';

export function PantryItemForm({
  initialValues,
  isSaving,
  message,
  onSubmit,
  submitLabel,
}: PantryItemFormProps) {
  const { t, languageCode } = useAppLanguage();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [category, setCategory] = useState(initialValues?.category?.toLowerCase() ?? 'meat');
  const [quantityType, setQuantityType] = useState<QuantityUnit>(initialValues?.quantityType ?? 'portion');
  const [amount, setAmount] = useState(initialValues?.amount ?? '2');
  const [level, setLevel] = useState(initialValues?.level?.toLowerCase() ?? 'medium');
  const [location, setLocation] = useState<StorageLocation>(initialValues?.location ?? 'fridge');
  const [expiration, setExpiration] = useState(initialValues?.expiration ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const [calendarMode, setCalendarMode] = useState<CalendarPickerMode>('calendar');
  const [pickerDate, setPickerDate] = useState(() =>
    initialValues?.expiration ? new Date(`${initialValues.expiration}T12:00:00`) : new Date(),
  );

  const expirationDate = expiration ? new Date(`${expiration}T12:00:00`) : null;
  const expirationLabel = expirationDate
    ? new Intl.DateTimeFormat(languageCode, { day: 'numeric', month: 'short', year: 'numeric' }).format(
        expirationDate,
      )
    : t('selectDate');
  const monthNames = getMonthNames(languageCode);
  const weekdayNames = getWeekdayNames(languageCode);
  const yearOptions = getDatePickerYearOptions(pickerDate.getFullYear());
  const calendarCells = getCalendarMonthGrid(pickerDate.getFullYear(), pickerDate.getMonth());
  const calendarTitle = new Intl.DateTimeFormat(languageCode, { month: 'long', year: 'numeric' }).format(pickerDate);

  function handleExpirationChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'ios') {
      setShowExpirationPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setPickerDate(selectedDate);
      setExpiration(toIsoDate(selectedDate));
    }
  }

  function openExpirationPicker() {
    Keyboard.dismiss();
    setPickerDate(expirationDate ?? pickerDate);
    setCalendarMode('calendar');
    setShowExpirationPicker(true);
  }

  function updatePickerDate(nextDate: Date) {
    setPickerDate(nextDate);
    setExpiration(toIsoDate(nextDate));
  }

  function changeMonth(delta: number) {
    updatePickerDate(getDateByMonthOffset(pickerDate, delta));
  }

  function selectMonth(monthIndex: number) {
    updatePickerDate(getDateInMonth(pickerDate, pickerDate.getFullYear(), monthIndex));
  }

  function selectYear(year: number) {
    updatePickerDate(getDateInMonth(pickerDate, year, pickerDate.getMonth()));
  }

  function selectCalendarDay(day: number) {
    updatePickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day, 12, 0, 0, 0));
  }

  return (
    <>
      <Card style={styles.form}>
        <FieldLabel>{t('itemName')}</FieldLabel>
        <TextInput onChangeText={setName} style={styles.input} value={name} />

        <FieldLabel>{t('category')}</FieldLabel>
        <View style={styles.options}>
          {categories.map((value) => (
            <Chip key={value} label={t(value)} onPress={() => setCategory(value)} selected={category === value} />
          ))}
        </View>

        <FieldLabel>{t('quantityType')}</FieldLabel>
        <View style={styles.options}>
          {quantityTypes.map((value) => (
            <Chip
              key={value}
              label={t(value)}
              onPress={() => setQuantityType(value)}
              selected={quantityType === value}
            />
          ))}
        </View>

        {quantityType === 'level' ? (
          <>
            <FieldLabel>{t('level')}</FieldLabel>
            <View style={styles.options}>
              {levels.map((value) => (
                <Chip key={value} label={t(value)} onPress={() => setLevel(value)} selected={level === value} />
              ))}
            </View>
          </>
        ) : (
          <>
            <FieldLabel>{t('amount')}</FieldLabel>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              style={styles.input}
              value={amount}
            />
          </>
        )}

        <FieldLabel>{t('storage')}</FieldLabel>
        <View style={styles.options}>
          {locations.map((value) => (
            <Chip
              key={value}
              label={t(value)}
              onPress={() => setLocation(value)}
              selected={location === value}
            />
          ))}
        </View>

        <FieldLabel>{t('expirationDate')}</FieldLabel>
        <View style={styles.inputRow}>
          <Pressable
            accessibilityLabel={t('expirationDate')}
            accessibilityRole="button"
            onPressIn={openExpirationPicker}
            style={styles.datePressTarget}>
            <Ionicons color={palette.muted} name="calendar-outline" size={19} />
            <Text style={[styles.dateText, !expiration && styles.datePlaceholder]}>{expirationLabel}</Text>
          </Pressable>
          {expiration ? (
            <Pressable hitSlop={10} onPress={() => setExpiration('')}>
              <Ionicons color={palette.muted} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        {showExpirationPicker && Platform.OS === 'ios' ? (
          <Modal
            animationType="slide"
            onRequestClose={() => setShowExpirationPicker(false)}
            transparent
            visible={showExpirationPicker}>
            <View style={styles.pickerModal}>
              <Pressable onPress={() => setShowExpirationPicker(false)} style={StyleSheet.absoluteFill} />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHandle} />
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>{t('expirationDate')}</Text>
                  <Pressable
                    accessibilityLabel={t('close')}
                    hitSlop={10}
                    onPress={() => setShowExpirationPicker(false)}
                    style={styles.pickerCloseButton}>
                    <Ionicons color={palette.ink} name="close" size={22} />
                  </Pressable>
                </View>

                <View style={styles.selectedDateCard}>
                  <View style={styles.selectedDateIcon}>
                    <Ionicons color={palette.green} name="calendar-outline" size={21} />
                  </View>
                  <Text style={styles.selectedDateText}>{expirationLabel}</Text>
                </View>

                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <Pressable
                      accessibilityLabel={calendarTitle}
                      accessibilityRole="button"
                      onPress={() => setCalendarMode((mode) => (mode === 'calendar' ? 'monthYear' : 'calendar'))}
                      style={styles.calendarTitleButton}>
                      <Text style={styles.calendarTitle}>{calendarTitle}</Text>
                      <Ionicons color={palette.blue} name={calendarMode === 'calendar' ? 'chevron-down' : 'chevron-up'} size={18} />
                    </Pressable>
                    {calendarMode === 'calendar' ? (
                      <View style={styles.monthNav}>
                        <Pressable hitSlop={8} onPress={() => changeMonth(-1)} style={styles.monthNavButton}>
                          <Ionicons color={palette.blue} name="chevron-back" size={24} />
                        </Pressable>
                        <Pressable hitSlop={8} onPress={() => changeMonth(1)} style={styles.monthNavButton}>
                          <Ionicons color={palette.blue} name="chevron-forward" size={24} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>

                  {calendarMode === 'calendar' ? (
                    <View style={styles.calendarGrid}>
                      {weekdayNames.map((weekdayName) => (
                        <Text key={weekdayName} style={styles.weekdayText}>{weekdayName}</Text>
                      ))}
                      {calendarCells.map((day, index) => {
                        const isSelectedDay = day === pickerDate.getDate();

                        return (
                          <View key={`${index}-${day ?? 'blank'}`} style={styles.dayCell}>
                            {day ? (
                              <Pressable
                                onPress={() => selectCalendarDay(day)}
                                style={[styles.dayButton, isSelectedDay && styles.selectedDayButton]}>
                                <Text style={[styles.dayText, isSelectedDay && styles.selectedDayText]}>{day}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.scrollerPanel}>
                      <ScrollView
                        contentContainerStyle={styles.scrollerColumnContent}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        style={styles.scrollerColumn}>
                        {monthNames.map((monthName, monthIndex) => {
                          const isSelectedMonth = monthIndex === pickerDate.getMonth();

                          return (
                            <Pressable
                              key={`${monthIndex}-${monthName}`}
                              onPress={() => selectMonth(monthIndex)}
                              style={[styles.scrollerItem, isSelectedMonth && styles.selectedScrollerItem]}>
                              <Text style={[styles.scrollerText, isSelectedMonth && styles.selectedScrollerText]}>
                                {monthName}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                      <ScrollView
                        contentContainerStyle={styles.scrollerColumnContent}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        style={styles.scrollerColumn}>
                        {yearOptions.map((year) => {
                          const isSelectedYear = year === pickerDate.getFullYear();

                          return (
                            <Pressable
                              key={year}
                              onPress={() => selectYear(year)}
                              style={[styles.scrollerItem, isSelectedYear && styles.selectedScrollerItem]}>
                              <Text style={[styles.scrollerText, isSelectedYear && styles.selectedScrollerText]}>
                                {year}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.pickerActions}>
                  {expiration ? (
                    <Pressable onPress={() => setExpiration('')} style={styles.removeDateButton}>
                      <Ionicons color={palette.green} name="trash-outline" size={18} />
                      <Text style={styles.removeDateText}>{t('remove')}</Text>
                    </Pressable>
                  ) : <View style={styles.actionSpacer} />}
                  <Pressable onPress={() => setShowExpirationPicker(false)} style={styles.doneDateButton}>
                    <Ionicons color="#fff" name="checkmark" size={18} />
                    <Text style={styles.doneDateText}>{t('close')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : showExpirationPicker ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              display="default"
              mode="date"
              onChange={handleExpirationChange}
              value={pickerDate}
            />
          </View>
        ) : null}

        <FieldLabel>{t('notes')}</FieldLabel>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder={t('optionalNotes')}
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.notes]}
          value={notes}
        />
      </Card>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button
        onPress={() =>
          onSubmit({
            name,
            category,
            quantityType,
            amount,
            level,
            location,
            expiration,
            notes,
          })
        }
        icon="checkmark">
        {isSaving ? t('saving') : submitLabel}
      </Button>
    </>
  );
}

export { parseExpirationDate };

export function quantityLabelFromLevel(level: string) {
  return level.toLowerCase() as QuantityLabel;
}

function getMonthNames(languageCode: string) {
  return Array.from({ length: 12 }, (_, monthIndex) =>
    new Intl.DateTimeFormat(languageCode, { month: 'long' }).format(new Date(2026, monthIndex, 1)),
  );
}

function getWeekdayNames(languageCode: string) {
  return Array.from({ length: 7 }, (_, dayIndex) =>
    new Intl.DateTimeFormat(languageCode, { weekday: 'short' }).format(new Date(2026, 1, dayIndex + 1)),
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  form: {
    gap: 9,
  },
  label: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 4,
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  datePressTarget: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
  },
  dateText: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
  },
  datePlaceholder: {
    color: palette.muted,
  },
  pickerWrap: {
    gap: 8,
    marginTop: 4,
  },
  pickerModal: {
    alignItems: 'center',
    backgroundColor: 'rgba(49, 37, 28, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: palette.background,
    borderColor: palette.line,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    gap: 14,
    maxHeight: '88%',
    paddingBottom: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    width: '100%',
  },
  pickerHandle: {
    alignSelf: 'center',
    backgroundColor: palette.line,
    borderRadius: 4,
    height: 5,
    width: 44,
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  pickerCloseButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  selectedDateCard: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 12,
  },
  selectedDateIcon: {
    alignItems: 'center',
    backgroundColor: palette.greenSoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  selectedDateText: {
    color: palette.ink,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  calendarCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    gap: 18,
    minHeight: 380,
    padding: 18,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  calendarTitleButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 42,
  },
  calendarTitle: {
    color: palette.blue,
    fontSize: 19,
    fontWeight: '900',
  },
  monthNav: {
    flexDirection: 'row',
    gap: 18,
  },
  monthNavButton: {
    alignItems: 'center',
    minHeight: 42,
    justifyContent: 'center',
    minWidth: 34,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  weekdayText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    width: `${100 / 7}%`,
  },
  dayCell: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayButton: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  selectedDayButton: {
    backgroundColor: palette.blue,
  },
  dayText: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '900',
  },
  scrollerPanel: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 310,
  },
  scrollerColumn: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    maxHeight: 310,
  },
  scrollerColumnContent: {
    gap: 7,
    padding: 8,
  },
  scrollerItem: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  selectedScrollerItem: {
    backgroundColor: palette.blue,
  },
  scrollerText: {
    color: palette.muted,
    fontSize: 18,
    fontWeight: '800',
  },
  selectedScrollerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  pickerTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  pickerActions: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
  },
  actionSpacer: {
    flex: 1,
  },
  removeDateButton: {
    alignItems: 'center',
    borderColor: palette.green,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  removeDateText: {
    color: palette.green,
    fontSize: 16,
    fontWeight: '900',
  },
  doneDateButton: {
    alignItems: 'center',
    backgroundColor: palette.blue,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  doneDateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  message: {
    color: palette.red,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
