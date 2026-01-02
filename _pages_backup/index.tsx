import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { getCafes, getUserStamps, getUserOrders } from '../src/lib/api';
import { Cafe, Stamp, Order } from '../src/lib/supabase';

export const Route = createRoute('/', {
  component: HomePage,
});

function HomePage() {
  const navigation = Route.useNavigation();
  const { user, isLoading: authLoading, error: authError } = useAuth();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [recentOrder, setRecentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [cafesData, stampsData, ordersData] = await Promise.all([
        getCafes(),
        getUserStamps(user!.id),
        getUserOrders(user!.id),
      ]);

      setCafes(cafesData);
      setStamps(stampsData);
      setRecentOrder(ordersData[0] || null);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // 카페의 스탬프 정보 가져오기
  function getStampForCafe(cafeId: string): Stamp | undefined {
    return stamps.find(s => s.cafe_id === cafeId);
  }

  // 주문 상태 텍스트
  function getOrderStatusText(status: Order['status']): string {
    const statusMap: Record<Order['status'], string> = {
      pending: '주문 대기',
      paid: '결제 완료',
      accepted: '주문 접수',
      preparing: '준비 중',
      ready: '픽업 대기',
      picked_up: '픽업 완료',
      cancelled: '주문 취소',
    };
    return statusMap[status] || status;
  }

  // 로딩 중 (인증)
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
        <Text style={styles.loadingText}>로그인 중...</Text>
      </View>
    );
  }

  // 에러
  if (authError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>로그인 실패</Text>
        <Text style={styles.errorDetail}>{authError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>동네카페</Text>
        <Text style={styles.subtitle}>
          {user ? `안녕하세요, ${user.name}님!` : '내 주변 카페에서 주문하고 스탬프 적립하세요'}
        </Text>
      </View>

      {/* 내 쿠폰 요약 */}
      <TouchableOpacity
        style={styles.couponCard}
        onPress={() => navigation.navigate('/coupons')}
      >
        <Text style={styles.cardTitle}>내 스탬프</Text>
        <Text style={styles.couponCount}>
          {stamps.length > 0
            ? `${stamps.length}개 카페에서 적립 중`
            : '아직 적립 중인 스탬프가 없어요'}
        </Text>
        {stamps.length > 0 && (
          <View style={styles.stampSummary}>
            {stamps.slice(0, 3).map((stamp) => (
              <Text key={stamp.id} style={styles.stampItem}>
                {stamp.cafe?.name}: {stamp.count}/{stamp.cafe?.stamp_goal || 10}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* 최근 주문 */}
      {recentOrder && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 주문</Text>
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => navigation.navigate('/orders')}
          >
            <Text style={styles.orderCafe}>{recentOrder.cafe?.name || '카페'}</Text>
            <Text style={styles.orderMenu}>
              {recentOrder.items && recentOrder.items.length > 0
                ? recentOrder.items[0].menu_name +
                  (recentOrder.items.length > 1 ? ` 외 ${recentOrder.items.length - 1}건` : '')
                : '주문 내역'}
            </Text>
            <Text style={styles.orderStatus}>{getOrderStatusText(recentOrder.status)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 내 주변 카페 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 주변 카페</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color="#8B4513" />
        ) : cafes.length === 0 ? (
          <Text style={styles.emptyText}>주변에 등록된 카페가 없어요</Text>
        ) : (
          cafes.map((cafe) => {
            const stamp = getStampForCafe(cafe.id);
            return (
              <TouchableOpacity
                key={cafe.id}
                style={styles.cafeCard}
                onPress={() => navigation.navigate(`/cafe/${cafe.id}`)}
              >
                {cafe.image_url ? (
                  <Image source={{ uri: cafe.image_url }} style={styles.cafeImage} />
                ) : (
                  <View style={styles.cafeImagePlaceholder} />
                )}
                <View style={styles.cafeInfo}>
                  <Text style={styles.cafeName}>{cafe.name}</Text>
                  <Text style={styles.cafeAddress}>{cafe.address}</Text>
                  <Text style={styles.cafeStamp}>
                    스탬프 {stamp ? stamp.count : 0}/{cafe.stamp_goal}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 사장님 모드 전환 (임시) */}
      <TouchableOpacity
        style={styles.merchantButton}
        onPress={() => navigation.navigate('/merchant')}
      >
        <Text style={styles.merchantButtonText}>사장님 모드로 전환</Text>
      </TouchableOpacity>
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
    backgroundColor: '#8B4513',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  couponCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFF8DC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEB887',
  },
  cardTitle: {
    fontSize: 14,
    color: '#8B4513',
  },
  couponCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 4,
  },
  stampSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DEB887',
  },
  stampItem: {
    fontSize: 13,
    color: '#8B4513',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderCard: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  orderCafe: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderMenu: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  orderStatus: {
    fontSize: 12,
    color: '#8B4513',
    marginTop: 8,
  },
  cafeCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
  },
  cafeImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  cafeImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#DDD',
    borderRadius: 8,
  },
  cafeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cafeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cafeAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cafeStamp: {
    fontSize: 12,
    color: '#8B4513',
    marginTop: 4,
  },
  merchantButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
  },
  merchantButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B4513',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  errorDetail: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});
