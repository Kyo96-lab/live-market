'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function AdminDashboard() {
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
    fetchOrders();
    fetchProducts();
  }, []);

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
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('상태 업데이트에 실패했습니다.');
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
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
    if (!newProductName || !newProductPrice || !newProductOptions || !imageFile) {
      return alert('사진을 포함하여 모든 정보를 입력해주세요.');
    }
    setIsAddingProduct(true);
    try {
      const imageUrl = await uploadImage(imageFile);
      const { error } = await supabase.from('products').insert([{
        name: newProductName, 
        price: parseInt(newProductPrice), 
        options: newProductOptions, 
        image_url: imageUrl
      }]);
      if (error) throw error;
      alert('성공적으로 등록되었습니다!');
      setNewProductName(''); setNewProductPrice(''); setNewProductOptions(''); setImageFile(null);
      fetchProducts();
    } catch (error) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20 md:pb-0">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl md:text-2xl font-black mb-4 tracking-tight">셀러 대시보드</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('orders')} 
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              📦 주문 관리
            </button>
            <button 
              onClick={() => setActiveTab('products')} 
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'products' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              🛍️ 상품 관리
            </button>
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

            {isLoadingOrders ? (
               <p className="text-center text-gray-400 py-10">데이터를 불러오는 중입니다...</p>
            ) : orders.length === 0 ? (
               <p className="text-center text-gray-400 py-10">들어온 주문이 없습니다.</p>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                  {orders.map((o) => (
                    <div key={o.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
                      <div className="absolute top-4 right-4">
                        {o.status === '결제완료' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">결제완료</span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold animate-pulse">입금대기</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{new Date(o.created_at).toLocaleString()}</p>
                      <h3 className="font-bold text-base mb-1">{o.buyer_name} <span className="text-sm font-normal text-gray-500 ml-1">{o.buyer_phone}</span></h3>
                      <p className="text-sm font-medium text-gray-800 mb-3">{o.option_selected}</p>
                      <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 mb-4">
                        <p className="mb-1"><span className="font-bold mr-2">배송지</span> {o.shipping_address || '주소 미입력'}</p>
                        <p><span className="font-bold mr-2">결제액</span> {o.total_price.toLocaleString()}원</p>
                      </div>

                      <div className="flex gap-2 justify-end border-t pt-3">
                        {o.status === '입금대기' ? (
                          <button 
                            onClick={() => handleUpdateStatus(o.id, '결제완료')}
                            className="text-xs bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition"
                          >
                            ✓ 입금 확인 (결제완료 처리)
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdateStatus(o.id, '입금대기')}
                            className="text-xs bg-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition"
                          >
                            ✕ 다시 입금대기로 변경
                          </button>
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">상품 대표 사진</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <span className="text-2xl mb-2">📸</span>
                      <p className="text-sm text-gray-500 font-medium">터치하여 사진 선택</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </label>
                  {imageFile && <p className="text-xs text-green-600 mt-2 font-bold ml-1">✓ {imageFile.name} 선택됨</p>}
                </div>
                <div className="mb-4"><label className="block text-sm font-bold text-gray-700 mb-2">상품명</label><input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="예: 시그니처 로고 후드티" className="w-full border border-gray-300 rounded-xl p-3.5 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"/></div>
                <div className="mb-4"><label className="block text-sm font-bold text-gray-700 mb-2">판매 가격 (숫자만)</label><input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="예: 39000" className="w-full border border-gray-300 rounded-xl p-3.5 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"/></div>
                <div className="mb-6"><label className="block text-sm font-bold text-gray-700 mb-2">옵션 (쉼표로 구분)</label><input type="text" value={newProductOptions} onChange={(e) => setNewProductOptions(e.target.value)} placeholder="예: 블랙 M, 블랙 L" className="w-full border border-gray-300 rounded-xl p-3.5 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"/></div>
                <button type="submit" disabled={isAddingProduct} className="w-full bg-black text-white p-4 rounded-xl text-base font-bold hover:bg-gray-800 transition shadow-md disabled:bg-gray-400">{isAddingProduct ? '등록 처리 중...' : '상품 리스트에 추가하기'}</button>
              </form>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-4">
              <h2 className="font-bold text-lg px-1 mt-6 md:mt-0">진열중인 상품</h2>
              {isLoadingProducts ? (
                 <p className="text-center text-gray-400 py-10">상품을 불러오는 중입니다...</p>
              ) : products.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center shadow-sm">
                  <p className="text-gray-400">아직 등록된 상품이 없습니다.</p>
                </div>
              ) : (
                products.map((p) => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-5 items-center relative overflow-hidden">
                    <img src={p.image_url} alt="" className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-xl bg-gray-100 border border-gray-100"/>
                    <div className="flex-grow">
                      <h3 className="font-bold text-base md:text-lg text-gray-900 leading-tight mb-1">{p.name}</h3>
                      <p className="text-red-500 font-black text-sm md:text-base">{p.price.toLocaleString()}원</p>
                      <p className="text-xs md:text-sm text-gray-500 mt-2"><span className="font-bold text-gray-400 mr-1">옵션:</span> {p.options}</p>
                    </div>
                    <button onClick={() => handleDeleteProduct(p.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                      <span className="text-xl">🗑️</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}