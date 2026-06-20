'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 🚨 누나분이 로그인할 때 사용할 비밀번호를 적어주세요 (현재는 1234)
  const ADMIN_PASSWORD = '5530'; 

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductOptions, setNewProductOptions] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchProducts();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setIsLoadingOrders(false);
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setIsLoadingProducts(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert('상태 업데이트 실패');
    else setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductOptions || !imageFile) return alert('모든 정보를 입력해주세요.');
    setIsAddingProduct(true);
    try {
      const imageUrl = await uploadImage(imageFile);
      const { error } = await supabase.from('products').insert([{ name: newProductName, price: parseInt(newProductPrice), options: newProductOptions, image_url: imageUrl }]);
      if (error) throw error;
      alert('등록 성공!');
      setNewProductName(''); setNewProductPrice(''); setNewProductOptions(''); setImageFile(null);
      fetchProducts();
    } catch (error) {
      alert('오류 발생');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 일치하지 않습니다.');
      setPasswordInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm text-center">
          <h1 className="text-xl font-black mb-6">사장님 전용 관리실 🔒</h1>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="w-full border border-gray-300 p-4 rounded-xl mb-4 text-center focus:border-black focus:ring-1 focus:ring-black outline-none transition"
          />
          <button type="submit" className="w-full bg-black text-white p-4 rounded-xl font-bold hover:bg-gray-800 transition">
            입장하기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20 md:pb-0">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl md:text-2xl font-black tracking-tight">셀러 대시보드</h1>
            <button onClick={() => setIsAuthenticated(false)} className="text-xs text-gray-500 underline hover:text-black">로그아웃</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>📦 주문 관리</button>
            <button onClick={() => setActiveTab('products')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'products' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>🛍️ 상품 관리</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h2 className="font-bold text-lg">최근 주문 내역</h2>
              <button onClick={fetchOrders} className="text-xs md:text-sm bg-white border border-gray-200 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50">새로고침</button>
            </div>
            {isLoadingOrders ? <p className="text-center text-gray-400 py-10">로딩 중...</p> : orders.length === 0 ? <p className="text-center text-gray-400 py-10">주문이 없습니다.</p> : (
              <div className="grid grid-cols-1 gap-4">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
                    <div className="absolute top-4 right-4">
                      {o.status === '결제완료' ? <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">결제완료</span> : <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold animate-pulse">입금대기</span>}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{new Date(o.created_at).toLocaleString()}</p>
                    <h3 className="font-bold text-base mb-1">{o.buyer_name} <span className="text-sm font-normal text-gray-500 ml-1">{o.buyer_phone}</span></h3>
                    
                    {/* 💡 주문 내역 카드 안에 상품명이 눈에 띄게 표시되도록 레이아웃이 추가되었습니다 */}
                    <p className="text-sm font-bold text-blue-600 mb-1">{o.product_name || '이전 주문 (상품명 없음)'}</p>
                    
                    <p className="text-sm font-medium text-gray-800 mb-3">옵션: {o.option_selected}</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 mb-4">
                      <p className="mb-1"><span className="font-bold mr-2">배송지</span> {o.shipping_address}</p>
                      <p><span className="font-bold mr-2">결제액</span> {o.total_price.toLocaleString()}원</p>
                    </div>
                    <div className="flex gap-2 justify-end border-t pt-3">
                      {o.status === '입금대기' ? (
                        <button onClick={() => handleUpdateStatus(o.id, '결제완료')} className="text-xs bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition">✓ 입금 확인</button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(o.id, '입금대기')} className="text-xs bg-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">✕ 입금대기로 변경</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="col-span-1">
              <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-28">
                <h2 className="font-bold text-lg mb-4 pb-3 border-b border-gray-100">새 상품 등록</h2>
                <div className="mb-5">
                  <label className="block text-sm font-bold text-gray-700 mb-2">상품 사진</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    <span className="text-2xl mb-2">📸</span>
                  </label>
                  {imageFile && <p className="text-xs text-green-600 mt-2 font-bold ml-1">✓ {imageFile.name}</p>}
                </div>
                <div className="mb-4"><input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="상품명" className="w-full border p-3.5 rounded-xl text-sm" /></div>
                <div className="mb-4"><input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="가격 (숫자만)" className="w-full border p-3.5 rounded-xl text-sm" /></div>
                <div className="mb-6"><input type="text" value={newProductOptions} onChange={(e) => setNewProductOptions(e.target.value)} placeholder="옵션 (쉼표 구분)" className="w-full border p-3.5 rounded-xl text-sm" /></div>
                <button type="submit" disabled={isAddingProduct} className="w-full bg-black text-white p-4 rounded-xl font-bold disabled:bg-gray-400">{isAddingProduct ? '등록 중...' : '추가하기'}</button>
              </form>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-4">
              {products.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-5 items-center relative">
                  <img src={p.image_url} alt="" className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-xl bg-gray-100"/>
                  <div className="flex-grow">
                    <h3 className="font-bold text-base md:text-lg">{p.name}</h3>
                    <p className="text-red-500 font-black text-sm">{p.price.toLocaleString()}원</p>
                    <p className="text-xs text-gray-500 mt-2">옵션: {p.options}</p>
                  </div>
                  <button onClick={() => handleDeleteProduct(p.id)} className="absolute top-4 right-4 text-gray-400 text-xl">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}