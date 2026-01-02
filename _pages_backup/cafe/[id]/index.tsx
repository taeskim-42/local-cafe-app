import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';

export const Route = createRoute('/cafe/:id', {
  component: CafeDetailPage,
});

function CafeDetailPage() {
  const navigation = Route.useNavigation();
  const { id } = Route.useParams();
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);

  // TODO: Supabase에서 카페 정보 가져오기
  const cafe = {
    id,
    name: '카페 라떼',
    address: '서울시 강남구 역삼동 123-45',
    phone: '02-1234-5678',
    stampCount: 7,
    stampGoal: 10,
  };

  const menus = [
    { id: '1', name: '아메리카노', price: 4500, category: '커피' },
    { id: '2', name: '카페라떼', price: 5000, category: '커피' },
    { id: '3', name: '바닐라라떼', price: 5500, category: '커피' },
    { id: '4', name: '녹차라떼', price: 5500, category: '음료' },
    { id: '5', name: '초코케이크', price: 6000, category: '디저트' },
  ];

  const addToCart = (menu: typeof menus[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menu.id);
      if (existing) {
        return prev.map((item) =>
          item.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...menu, quantity: 1 }];
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 카페 정보 */}
        <View style={styles.cafeHeader}>
          <View style={styles.cafeImagePlaceholder} />
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <Text style={styles.cafeAddress}>{cafe.address}</Text>
        </View>

        {/* 스탬프 현황 */}
        <View style={styles.stampCard}>
          <Text style={styles.stampTitle}>내 스탬프</Text>
          <View style={styles.stampRow}>
            {Array.from({ length: cafe.stampGoal }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stampDot,
                  i < cafe.stampCount && styles.stampDotFilled,
                ]}
              />
            ))}
          </View>
          <Text style={styles.stampText}>
            {cafe.stampCount}/{cafe.stampGoal} - {cafe.stampGoal - cafe.stampCount}개 더 모으면 무료!
          </Text>
        </View>

        {/* 메뉴 목록 */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>메뉴</Text>
          {menus.map((menu) => (
            <TouchableOpacity
              key={menu.id}
              style={styles.menuCard}
              onPress={() => addToCart(menu)}
            >
              <View style={styles.menuInfo}>
                <Text style={styles.menuName}>{menu.name}</Text>
                <Text style={styles.menuPrice}>{menu.price.toLocaleString()}원</Text>
              </View>
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 장바구니 바 */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() => navigation.navigate('/checkout', { cafeId: id, cart })}
        >
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{totalQuantity}개</Text>
            <Text style={styles.cartAmount}>{totalAmount.toLocaleString()}원</Text>
          </View>
          <Text style={styles.cartButton}>주문하기</Text>
        </TouchableOpacity>
      )}
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
  cafeHeader: {
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  cafeImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#DDD',
    borderRadius: 50,
    marginBottom: 12,
  },
  cafeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cafeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stampCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF8DC',
    borderRadius: 12,
  },
  stampTitle: {
    fontSize: 14,
    color: '#8B4513',
    marginBottom: 12,
  },
  stampRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stampDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DDD',
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  stampDotFilled: {
    backgroundColor: '#8B4513',
  },
  stampText: {
    fontSize: 12,
    color: '#8B4513',
    textAlign: 'center',
  },
  menuSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuPrice: {
    fontSize: 14,
    color: '#8B4513',
    marginTop: 4,
  },
  addButton: {
    width: 32,
    height: 32,
    backgroundColor: '#8B4513',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#8B4513',
  },
  cartInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  cartCount: {
    color: 'white',
    fontSize: 16,
  },
  cartAmount: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
