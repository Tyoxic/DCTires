import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../models/types';
import {
  getAllTimeTotals,
  getMonthlyTotals,
  getTopCustomers,
  getServiceTypeBreakdown,
  MonthTotals,
  MonthlyTotals,
  TopCustomer,
  ServiceTypeStat,
} from '../db/services';
import { money, formatMonth } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

export default function StatsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [allTime, setAllTime] = useState<MonthTotals>({ revenue: 0, profit: 0, tip: 0, count: 0 });
  const [months, setMonths] = useState<MonthlyTotals[]>([]);
  const [top, setTop] = useState<TopCustomer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeStat[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [a, m, t, st] = await Promise.all([
      getAllTimeTotals(),
      getMonthlyTotals(),
      getTopCustomers(10),
      getServiceTypeBreakdown(),
    ]);
    setAllTime(a);
    setMonths(m);
    setTop(t);
    setServiceTypes(st);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#2196F3" />
      </View>
    );
  }

  const peakCount = months.reduce((m, x) => Math.max(m, x.count), 0);
  const peakRevenue = months.reduce((m, x) => Math.max(m, x.revenue), 0);
  const avgPerService = allTime.count > 0 ? allTime.revenue / allTime.count : 0;

  // Highest-volume month for the headline insight
  const peakMonth = [...months].sort((a, b) => b.count - a.count)[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      {/* All-time hero */}
      <Text style={styles.sectionLabel}>ALL TIME</Text>
      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{allTime.count}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{money(allTime.revenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: '#2E7D32' }]}>{money(allTime.profit)}</Text>
          <Text style={styles.statLabel}>Profit</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{money(allTime.tip)}</Text>
          <Text style={styles.statLabel}>Tips</Text>
        </View>
      </View>

      <View style={styles.miniInsightCard}>
        <Text style={styles.miniInsightK}>Avg per service</Text>
        <Text style={styles.miniInsightV}>{money(avgPerService)}</Text>
      </View>
      {peakMonth ? (
        <View style={styles.miniInsightCard}>
          <Text style={styles.miniInsightK}>Busiest month</Text>
          <Text style={styles.miniInsightV}>
            {formatMonth(peakMonth.yyyyMM)} · {peakMonth.count} jobs
          </Text>
        </View>
      ) : null}

      {/* Monthly breakdown */}
      <Text style={styles.sectionLabel}>BY MONTH</Text>
      {months.length === 0 ? (
        <Text style={styles.empty}>No services logged yet.</Text>
      ) : (
        <View style={styles.listCard}>
          {months.map((m, idx) => {
            const countPct = peakCount > 0 ? (m.count / peakCount) * 100 : 0;
            const revPct = peakRevenue > 0 ? (m.revenue / peakRevenue) * 100 : 0;
            return (
              <View key={m.yyyyMM} style={[styles.monthRow, idx === months.length - 1 && styles.lastRow]}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthName}>{formatMonth(m.yyyyMM)}</Text>
                  <Text style={styles.monthCount}>
                    {m.count} job{m.count === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.barWrap}>
                  <View style={[styles.barFill, { width: `${countPct}%`, backgroundColor: '#2196F3' }]} />
                  <Text style={styles.barLabel}>volume</Text>
                </View>
                <View style={[styles.barWrap, { marginTop: 6 }]}>
                  <View style={[styles.barFill, { width: `${revPct}%`, backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.barLabel}>{money(m.revenue)}</Text>
                </View>
                <View style={styles.monthFooter}>
                  <Text style={styles.monthFoot}>
                    Profit {money(m.profit)}{m.tip > 0 ? ` · Tips ${money(m.tip)}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Top customers */}
      <Text style={styles.sectionLabel}>TOP CUSTOMERS</Text>
      {top.length === 0 ? (
        <Text style={styles.empty}>No customers with services yet.</Text>
      ) : (
        <View style={styles.listCard}>
          {top.map((c, i) => (
            <TouchableOpacity
              key={c.customer_id}
              style={[styles.custRow, i === top.length - 1 && styles.lastRow]}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: c.customer_id })}
              activeOpacity={0.7}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.custSub} numberOfLines={1}>
                  {c.service_count} job{c.service_count === 1 ? '' : 's'} · {money(c.revenue)}
                  {c.tip > 0 ? ` · +${money(c.tip)} tips` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Service-type mix */}
      <Text style={styles.sectionLabel}>SERVICE TYPE MIX</Text>
      {serviceTypes.length === 0 ? (
        <Text style={styles.empty}>No services logged yet.</Text>
      ) : (
        <View style={styles.listCard}>
          {serviceTypes.map((s, i) => {
            const pct = allTime.count > 0 ? (s.count / allTime.count) * 100 : 0;
            return (
              <View key={s.service_type} style={[styles.typeRow, i === serviceTypes.length - 1 && styles.lastRow]}>
                <View style={styles.typeHead}>
                  <Text style={styles.typeName}>{s.service_type}</Text>
                  <Text style={styles.typeCount}>
                    {s.count} ({pct.toFixed(0)}%) · {money(s.revenue)}
                  </Text>
                </View>
                <View style={styles.barWrap}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: '#9C27B0' }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.6, marginTop: 16, marginBottom: 8, marginLeft: 4 },

  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  statBlock: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 6 },
  statValue: { fontSize: 17, fontWeight: '700', color: '#222' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  miniInsightCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginTop: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  miniInsightK: { fontSize: 13, color: '#666', fontWeight: '500' },
  miniInsightV: { fontSize: 14, color: '#222', fontWeight: '700' },

  listCard: { backgroundColor: '#fff', borderRadius: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, overflow: 'hidden' },

  monthRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  lastRow: { borderBottomWidth: 0 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  monthName: { fontSize: 15, fontWeight: '700', color: '#222' },
  monthCount: { fontSize: 13, color: '#666', fontWeight: '600' },
  monthFooter: { marginTop: 8 },
  monthFoot: { fontSize: 12, color: '#666' },

  barWrap: { height: 18, backgroundColor: '#f5f5f5', borderRadius: 4, marginTop: 8, justifyContent: 'center', overflow: 'hidden' },
  barFill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 4, opacity: 0.85 },
  barLabel: { position: 'absolute', right: 8, fontSize: 11, color: '#444', fontWeight: '600' },

  custRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '800', color: '#E65100' },
  custName: { fontSize: 15, fontWeight: '600', color: '#222' },
  custSub: { fontSize: 12, color: '#666', marginTop: 2 },
  chevron: { fontSize: 24, color: '#bbb', fontWeight: '300', marginLeft: 8 },

  typeRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  typeHead: { flexDirection: 'row', justifyContent: 'space-between' },
  typeName: { fontSize: 14, fontWeight: '700', color: '#222' },
  typeCount: { fontSize: 12, color: '#666', fontWeight: '600' },

  empty: { color: '#888', fontStyle: 'italic', marginLeft: 4, marginBottom: 8 },
});
