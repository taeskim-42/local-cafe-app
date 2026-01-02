import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';

export const Route = createRoute('/coupons', {
  component: CouponsPage,
});

function CouponsPage() {
  const navigation = Route.useNavigation();

  // TODO: Supabase에서 내 스탬프 정보 가져오기
  const stamps = [
    { cafeId: '1', cafeName: '카페 라떼', count: 7, goal: 10 },
    { cafeId: '2', cafeName: '모닝커피', count: 3, goal: 10 },
    { cafeId: '3', cafeName: '빈스앤베리', count: 10, goal: 10, canUse: true },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 쿠폰함</Text>
      </View>

      {/* 사용 가능한 쿠폰 */}
      {stamps.some((s) => s.canUse) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사용 가능한 쿠폰</Text>
          {stamps
            .filter((s) => s.canUse)
            .map((stamp) => (
              <TouchableOpacity
                key={stamp.cafeId}
                style={styles.couponCard}
                onPress={() => navigation.navigate(`/cafe/${stamp.cafeId}`)}
              >
                <View style={styles.couponBadge}>
                  <Text style={styles.couponBadgeText}>무료</Text>
                </View>
                <Text style={styles.couponCafe}>{stamp.cafeName}</Text>
                <Text style={styles.couponDesc}>음료 1잔 무료</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {/* 적립 중인 스탬프 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>적립 중</Text>
        {stamps
          .filter((s) => !s.canUse)
          .map((stamp) => (
            <TouchableOpacity
              key={stamp.cafeId}
              style={styles.stampCard}
              onPress={() => navigation.navigate(`/cafe/${stamp.cafeId}`)}
            >
              <View style={styles.stampInfo}>
                <Text style={styles.stampCafe}>{stamp.cafeName}</Text>
                <Text style={styles.stampProgress}>
                  {stamp.goal - stamp.count}개 더 모으면 무료!
                </Text>
              </View>
              <View style={styles.stampCount}>
                <Text style={styles.stampCountText}>
                  {stamp.count}/{stamp.goal}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  couponCard: {
    padding: 20,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    marginBottom: 12,
  },
  couponBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFD700',
    borderRadius: 4,
    marginBottom: 8,
  },
  couponBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  couponCafe: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  couponDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  stampCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
  },
  stampInfo: {
    flex: 1,
  },
  stampCafe: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stampProgress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  stampCount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
  },
  stampCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
});
