'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafe, getCafeByShortCode, getMenus } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { Cafe, Menu, User } from '@/lib/supabase';

interface CartItem {
  menu: Menu;
  quantity: number;
  selectedOptions: { name: string; choice: string; price: number }[];
  subtotal: number;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = params.cafeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 장바구니
  const [cart, setCart] = useState<CartItem[]>([]);

  // 메뉴 선택 모달
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { choice: string; price: number }>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // 로그인 확인
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push(`/c/${cafeId}?action=order`);
          return;
        }
        setUser(currentUser);

        // 카페 정보
        let cafeData = await getCafeByShortCode(cafeId);
        if (!cafeData) {
          cafeData = await getCafe(cafeId);
        }
        if (!cafeData) {
          setError('카페를 찾을 수 없습니다.');
          return;
        }
        setCafe(cafeData);

        // 메뉴 목록
        const menuList = await getMenus(cafeData.id);
        setMenus(menuList);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [cafeId, router]);

  // 카테고리별 메뉴 그룹화
  const menusByCategory = menus.reduce((acc, menu) => {
    const category = menu.category || '기타';
    if (!acc[category]) acc[category] = [];
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  // 메뉴 선택 시
  const handleMenuClick = (menu: Menu) => {
    setSelectedMenu(menu);
    setSelectedOptions({});
    setQuantity(1);

    // 기본 옵션 선택
    if (menu.options && menu.options.length > 0) {
      const defaults: Record<string, { choice: string; price: number }> = {};
      menu.options.forEach((opt) => {
        if (opt.choices.length > 0) {
          defaults[opt.name] = { choice: opt.choices[0].name, price: opt.choices[0].price };
        }
      });
      setSelectedOptions(defaults);
    }
  };

  // 옵션 선택
  const handleOptionSelect = (optionName: string, choice: string, price: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: { choice, price },
    }));
  };

  // 장바구니에 추가
  const handleAddToCart = () => {
    if (!selectedMenu) return;

    const optionsPrice = Object.values(selectedOptions).reduce((sum, opt) => sum + opt.price, 0);
    const subtotal = (selectedMenu.price + optionsPrice) * quantity;

    const newItem: CartItem = {
      menu: selectedMenu,
      quantity,
      selectedOptions: Object.entries(selectedOptions).map(([name, opt]) => ({
        name,
        choice: opt.choice,
        price: opt.price,
      })),
      subtotal,
    };

    setCart((prev) => [...prev, newItem]);
    setSelectedMenu(null);
  };

  // 장바구니 아이템 삭제
  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // 총 금액
  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // 결제 페이지로
  const handleCheckout = () => {
    if (cart.length === 0) return;

    // 장바구니 데이터를 세션 스토리지에 저장
    sessionStorage.setItem(
      'checkout',
      JSON.stringify({
        cafeId: cafe?.id,
        cafeName: cafe?.name,
        items: cart,
        totalAmount,
      })
    );

    router.push(`/c/${cafeId}/checkout`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cafe-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-600">
            ← 뒤로
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{cafe?.name}</h1>
            <p className="text-sm text-gray-500">주문하기</p>
          </div>
        </div>
      </header>

      {/* 메뉴 목록 */}
      <main className="max-w-md mx-auto px-4 py-6">
        {Object.entries(menusByCategory).map(([category, categoryMenus]) => (
          <section key={category} className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{category}</h2>
            <div className="space-y-3">
              {categoryMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => handleMenuClick(menu)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex gap-4">
                    {menu.image_url ? (
                      <img
                        src={menu.image_url}
                        alt={menu.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-cafe-100 flex items-center justify-center">
                        <span className="text-2xl">☕</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{menu.name}</h3>
                      {menu.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{menu.description}</p>
                      )}
                      <p className="text-cafe-500 font-bold mt-1">
                        {menu.price.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {menus.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-600">등록된 메뉴가 없습니다</p>
          </div>
        )}
      </main>

      {/* 장바구니 바 */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="max-w-md mx-auto px-4 py-4">
            {/* 장바구니 아이템 요약 */}
            <div className="mb-3 max-h-32 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm py-1">
                  <span className="text-gray-700">
                    {item.menu.name} x {item.quantity}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{item.subtotal.toLocaleString()}원</span>
                    <button
                      onClick={() => handleRemoveFromCart(index)}
                      className="text-red-500 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl flex justify-between items-center px-6"
            >
              <span>{cart.length}개 주문하기</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </button>
          </div>
        </div>
      )}

      {/* 메뉴 선택 모달 */}
      {selectedMenu && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end justify-center">
          <div className="w-full max-w-md bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white border-b px-4 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">{selectedMenu.name}</h3>
              <button onClick={() => setSelectedMenu(null)} className="text-gray-500 text-xl">
                ✕
              </button>
            </div>

            <div className="p-4">
              {/* 메뉴 정보 */}
              <div className="flex gap-4 mb-6">
                {selectedMenu.image_url ? (
                  <img
                    src={selectedMenu.image_url}
                    alt={selectedMenu.name}
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-cafe-100 flex items-center justify-center">
                    <span className="text-3xl">☕</span>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">{selectedMenu.description}</p>
                  <p className="text-xl font-bold text-cafe-500 mt-2">
                    {selectedMenu.price.toLocaleString()}원
                  </p>
                </div>
              </div>

              {/* 옵션 선택 */}
              {selectedMenu.options && selectedMenu.options.length > 0 && (
                <div className="space-y-4 mb-6">
                  {selectedMenu.options.map((option) => (
                    <div key={option.name}>
                      <h4 className="font-bold text-gray-900 mb-2">{option.name}</h4>
                      <div className="space-y-2">
                        {option.choices.map((choice) => (
                          <button
                            key={choice.name}
                            onClick={() => handleOptionSelect(option.name, choice.name, choice.price)}
                            className={`w-full p-3 rounded-lg border text-left flex justify-between ${
                              selectedOptions[option.name]?.choice === choice.name
                                ? 'border-cafe-500 bg-cafe-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <span>{choice.name}</span>
                            {choice.price > 0 && (
                              <span className="text-gray-500">+{choice.price.toLocaleString()}원</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 수량 선택 */}
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-gray-900">수량</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 text-xl"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 rounded-full bg-gray-100 text-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 담기 버튼 */}
              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-cafe-500 text-white font-bold rounded-xl"
              >
                {(
                  (selectedMenu.price +
                    Object.values(selectedOptions).reduce((sum, opt) => sum + opt.price, 0)) *
                  quantity
                ).toLocaleString()}
                원 담기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
