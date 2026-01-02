import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';

export const Route = createRoute('/orders', {
  component: OrdersPage,
});

function OrdersPage() {
  const navigation = Route.useNavigation();

  // TODO: Supabase에서 주문 내역 가져오기
  const orders = [
    {
      id: '1',
      cafeName: '카페 라떼',
      items: '아메리카노 외 1건',
      totalAmount: 9500,
      status: 'preparing',
      statusText: '제조 중',
      createdAt: '2025-01-15 14:30',
    },
    {
      id: '2',
      cafeName: '모닝커피',
      items: '카페라떼',
      totalAmount: 5000,
      status: 'picked_up',
      statusText: '픽업 완료',
      createdAt: '2025-01-14 09:15',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing':
        return '#FF9500';
      case 'ready':
        return '#34C759';
      case 'picked_up':
        return '#8E8E93';
      default:
        return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>주문 내역</Text>
      </View>

      <View style={styles.orderList}>
        {orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => navigation.navigate(`/orders/${order.id}`)}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.cafeName}>{order.cafeName}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) },
                ]}
              >
                <Text style={styles.statusText}>{order.statusText}</Text>
              </View>
            </View>
            <Text style={styles.orderItems}>{order.items}</Text>
            <View style={styles.orderFooter}>
              <Text style={styles.orderAmount}>
                {order.totalAmount.toLocaleString()}원
              </Text>
              <Text style={styles.orderDate}>{order.createdAt}</Text>
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
  orderList: {
    padding: 16,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  cafeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
});
