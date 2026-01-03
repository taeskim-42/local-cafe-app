'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCafe, getAllMenus, createMenu, updateMenu, deleteMenu } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { loginWithKakao } from '@/lib/kakao';
import { Cafe, Menu, User } from '@/lib/supabase';

const CATEGORIES = ['커피', '음료', '디저트', '기타'];

export default function MenuManagementPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = params.cafeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 폼 상태
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('커피');
  const [formDescription, setFormDescription] = useState('');

  const checkAuth = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setNeedsLogin(true);
      setIsLoading(false);
      return;
    }
    setUser(currentUser);
    setNeedsLogin(false);

    const cafeData = await getCafe(cafeId);
    if (!cafeData) {
      setError('카페를 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    if (cafeData.owner_id !== currentUser.id) {
      setError('이 카페의 관리 권한이 없습니다.');
      setIsLoading(false);
      return;
    }

    setCafe(cafeData);

    const menuList = await getAllMenus(cafeData.id);
    setMenus(menuList);
    setIsLoading(false);
  }, [cafeId]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        await checkAuth(currentUser);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다.');
        setIsLoading(false);
      }
    }

    init();
  }, [cafeId, checkAuth]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await loginWithKakao();
      await checkAuth(loggedInUser);
    } catch (err) {
      setError('로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const openAddModal = () => {
    setEditingMenu(null);
    setFormName('');
    setFormPrice('');
    setFormCategory('커피');
    setFormDescription('');
    setShowModal(true);
  };

  const openEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setFormName(menu.name);
    setFormPrice(menu.price.toString());
    setFormCategory(menu.category);
    setFormDescription(menu.description || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMenu(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('메뉴 이름을 입력해주세요.');
      return;
    }

    const price = parseInt(formPrice, 10);
    if (isNaN(price) || price < 0) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingMenu) {
        // 수정
        const updated = await updateMenu(editingMenu.id, {
          name: formName.trim(),
          price,
          category: formCategory,
          description: formDescription.trim() || null,
        });
        setMenus((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        );
      } else {
        // 추가
        const created = await createMenu({
          cafeId,
          name: formName.trim(),
          price,
          category: formCategory,
          description: formDescription.trim() || undefined,
        });
        setMenus((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (menuId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteMenu(menuId);
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleAvailability = async (menu: Menu) => {
    try {
      const updated = await updateMenu(menu.id, {
        is_available: !menu.is_available,
      });
      setMenus((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 카테고리별 그룹화
  const menusByCategory = menus.reduce((acc, menu) => {
    if (!acc[menu.category]) {
      acc[menu.category] = [];
    }
    acc[menu.category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-cafe-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">📋</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">메뉴 관리</h1>
          <p className="text-gray-600 mb-6">
            메뉴 관리를 위해 로그인이 필요합니다
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
          >
            {isLoggingIn ? '로그인 중...' : '카카오로 로그인'}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(`/merchant/${cafeId}/settings`)}
              className="text-gray-600"
            >
              ← 설정
            </button>
            <h1 className="font-bold text-gray-900">메뉴 관리</h1>
            <button
              onClick={openAddModal}
              className="px-3 py-1 text-sm bg-cafe-500 text-white rounded-lg"
            >
              + 추가
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {menus.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-600 mb-4">등록된 메뉴가 없습니다</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-cafe-500 text-white font-bold rounded-xl"
            >
              첫 메뉴 등록하기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(menusByCategory).map(([category, categoryMenus]) => (
              <div key={category}>
                <h2 className="text-sm font-bold text-gray-500 mb-2">{category}</h2>
                <div className="space-y-2">
                  {categoryMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className={`bg-white rounded-xl p-4 shadow-sm ${
                        !menu.is_available ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{menu.name}</h3>
                            {!menu.is_available && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                품절
                              </span>
                            )}
                          </div>
                          {menu.description && (
                            <p className="text-sm text-gray-500 mt-1">{menu.description}</p>
                          )}
                          <p className="text-cafe-600 font-bold mt-1">
                            {menu.price.toLocaleString()}원
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAvailability(menu)}
                            className={`px-3 py-1 text-xs rounded-lg ${
                              menu.is_available
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-green-100 text-green-600'
                            }`}
                          >
                            {menu.is_available ? '품절처리' : '판매재개'}
                          </button>
                          <button
                            onClick={() => openEditModal(menu)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(menu.id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded-lg"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 메뉴 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingMenu ? '메뉴 수정' : '메뉴 추가'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메뉴 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 아메리카노"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가격 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="예: 4500"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="메뉴 설명 (선택사항)"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-cafe-500 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
