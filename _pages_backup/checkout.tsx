import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
// import { checkoutPayment } from '@apps-in-toss/framework';

export const Route = createRoute('/checkout', {
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigation = Route.useNavigation();
  const params = Route.useParams();
  const [isProcessing, setIsProcessing] = useState(false);

  // TODO: params에서 cart 정보 받기
  const cart = [
    { id: '1', name: '아메리카노', price: 4500, quantity: 2 },
    { id: '2', name: '카페라떼', price: 5000, quantity: 1 },
  ];

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // 1. 서버에 주문 생성 요청 → payToken 받기
      // const { payToken, orderNo } = await createOrder(cart, cafeId);

      // 2. 토스페이 결제창 호출
      // const result = await checkoutPayment({ payToken });

      // 3. 결제 성공 시 서버에 결제 실행 요청
      // if (result.success) {
      //   await executePayment(payToken, orderNo);
      //   navigation.navigate('/orders/123');
      // }

      // 임시: 결제 성공 시뮬레이션
      Alert.alert('결제 완료', '주문이 접수되었습니다!', [
        { text: '확인', onPress: () => navigation.navigate('/orders') },
      ]);
    } catch (error) {
      Alert.alert('결제 실패', '다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 주문 내역 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주문 내역</Text>
          {cart.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>x {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {(item.price * item.quantity).toLocaleString()}원
              </Text>
            </View>
          ))}
        </View>

        {/* 스탬프 적립 안내 */}
        <View style={styles.stampNotice}>
          <Text style={styles.stampNoticeText}>
            이 주문으로 스탬프 1개가 적립됩니다
          </Text>
        </View>

        {/* 결제 금액 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 금액</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>상품 금액</Text>
            <Text style={styles.priceValue}>{totalAmount.toLocaleString()}원</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>할인</Text>
            <Text style={styles.priceValue}>0원</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>총 결제 금액</Text>
            <Text style={styles.totalValue}>{totalAmount.toLocaleString()}원</Text>
          </View>
        </View>
      </ScrollView>

      {/* 결제 버튼 */}
      <TouchableOpacity
        style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={isProcessing}
      >
        <Text style={styles.payButtonText}>
          {isProcessing ? '결제 중...' : `${totalAmount.toLocaleString()}원 결제하기`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  orderItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stampNotice: {
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
  },
  stampNoticeText: {
    fontSize: 14,
    color: '#8B4513',
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  payButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#CCC',
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
