import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';

export const Route = createRoute('/merchant', {
  component: MerchantPage,
});

function MerchantPage() {
  const navigation = Route.useNavigation();

  // TODO: 실시간 주문 목록 (Supabase Realtime)
  const pendingOrders = [
    {
      id: '1',
      orderNo: 'A-001',
      items: '아메리카노 x2, 카페라떼 x1',
      totalAmount: 14000,
      status: 'paid',
      createdAt: '14:30',
    },
    {
      id: '2',
      orderNo: 'A-002',
      items: '바닐라라떼 x1',
      totalAmount: 5500,
      status: 'paid',
      createdAt: '14:32',
    },
  ];

  const acceptOrder = (orderId: string) => {
    // TODO: 주문 상태 변경 API 호출
    console.log('Accept order:', orderId);
  };

  const completeOrder = (orderId: string) => {
    // TODO: 주문 완료 API 호출
    console.log('Complete order:', orderId);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>사장님 모드</Text>
        <TouchableOpacity onPress={() => navigation.navigate('/')}>
          <Text style={styles.switchMode}>고객 모드로</Text>
        </TouchableOpacity>
      </View>

      {/* 메뉴 관리 */}
      <View style={styles.menuGrid}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('/merchant/menu')}
        >
          <Text style={styles.menuButtonIcon}>📋</Text>
          <Text style={styles.menuButtonText}>메뉴 관리</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('/merchant/coupon-policy')}
        >
          <Text style={styles.menuButtonIcon}>🎫</Text>
          <Text style={styles.menuButtonText}>쿠폰 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('/merchant/stats')}
        >
          <Text style={styles.menuButtonIcon}>📊</Text>
          <Text style={styles.menuButtonText}>매출 현황</Text>
        </TouchableOpacity>
      </View>

      {/* 신규 주문 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          신규 주문 ({pendingOrders.length})
        </Text>
        {pendingOrders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNo}>#{order.orderNo}</Text>
              <Text style={styles.orderTime}>{order.createdAt}</Text>
            </View>
            <Text style={styles.orderItems}>{order.items}</Text>
            <Text style={styles.orderAmount}>
              {order.totalAmount.toLocaleString()}원
            </Text>
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => acceptOrder(order.id)}
              >
                <Text style={styles.acceptButtonText}>주문 접수</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* 제조 중 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>제조 중 (1)</Text>
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNo}>#A-000</Text>
            <Text style={styles.orderTime}>14:25</Text>
          </View>
          <Text style={styles.orderItems}>녹차라떼 x1</Text>
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => completeOrder('0')}
            >
              <Text style={styles.completeButtonText}>준비 완료</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  switchMode: {
    fontSize: 14,
    color: '#8B4513',
  },
  menuGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  menuButton: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
  },
  menuButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  menuButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
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
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 12,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#8B4513',
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  completeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#34C759',
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
