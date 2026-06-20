'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
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

  const [trackingInputs, setTrackingInputs] = useState<any>({});

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

  const handleDispatch = async (orderId: string) => {
    const trackingNum = trackingInputs[orderId];
    if (!trackingNum) return alert('운송장 번호를 입력해주세요!');
    const { error } = await supabase.from('orders').update({ status: '배송중', tracking_number: trackingNum }).eq('id', orderId);
    if (error) alert('운송장 등록 실패');
    else { alert('발송 처리가 완료되었습니다!'); fetchOrders(); }
  };

  const handleDownloadExcel = () => {
    if (orders.length === 0) return alert('다운로드할 주문 내역이 없습니다.');
    const headers = ['주문일시', '주문자명', '연락처', '상품명', '옵션', '배송지', '결제액', '상태', '운송장번호'];
    const rows = orders.map(o => [
      new Date(o.created_at).toLocaleString(),
      o.buyer_name, o.buyer_phone, o.product_name || '', o.option_selected,
      o.shipping_address.replace(/,/g, ' '), o.total_price, o.status, o.tracking_number || ''
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `주문내역_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    } catch (error) { alert('오류 발생'); } 
    finally { setIsAddingProduct(false); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  // 💡 개별 옵션 품절 스위치 함수
  const toggleOptionSoldOut = async (productId: string, option: string, currentSoldOutText: string) => {
    // 현재 품절된 옵션들을 배열로 만듭니다.
    const soldOutArray = currentSoldOutText ? currentSoldOutText.split(',').map(o => o.trim()).filter(Boolean) : [];
    let newSoldOutArray;
    
    // 이미 품절 목록에 있다면 빼고(판매중), 없다면 넣습니다(품절).
    if (soldOutArray.includes(option)) {
      newSoldOutArray = soldOutArray.filter(o => o !== option);
    } else {
      newSoldOutArray = [...soldOutArray, option];
    }
    
    const newSoldOutText = newSoldOutArray.join(',');
    const { error } = await supabase.from('products').update({ soldout_options: newSoldOutText }).eq('id', productId);
    
    if (error) alert('상태 변경 실패');
    else fetchProducts(); // 변경 후 화면 새로고침
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) setIsAuthenticated(true);
    else { alert('비밀번호가 일치하지 않습니다.'); setPasswordInput(''); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-sm text-center">
          <h1 className="text-xl font-black mb-6">사장님 전용 관리실 🔒</h1>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="비밀번호" className="w-full border p-4 rounded-xl mb-4 text-center focus:border-black outline-none" />
          <button type="submit" className="w-full bg-black text-white p-4 rounded-xl font-bold">입장하기</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20 md:pb-0">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl md:text-2xl font-black">셀러 대시보드</h1>
            <button onClick={() => setIsAuthenticated(false)} className="text-xs text-gray-500 underline">로그아웃</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 rounded-lg font-bold text-sm ${activeTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100'}`}>📦 주문 관리</button>
            <button onClick={() => setActiveTab('products')} className={`flex-1 py-3 rounded-lg font-bold text-sm ${activeTab === 'products' ? 'bg-black text-white' : 'bg-gray-100'}`}>🛍️ 상품 관리</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h2 className="font-bold text-lg">최근 주문 내역</h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadExcel} className="text-xs md:text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">📥 엑셀 다운로드</button>
                <button onClick={fetchOrders} className="text-xs md:text-sm bg-white border px-4 py-2 rounded-lg font-bold">새로고침</button>
              </div>
            </div>
            {isLoadingOrders ? <p className="text-center py-10">로딩 중...</p> : orders.length === 0 ? <p className="text-center py-10">주문이 없습니다.</p> : (
              <div className="grid grid-cols-1 gap-4">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white p-5 rounded-2xl shadow-sm border relative">
                    <div className="absolute top-4 right-4 flex gap-1">
                      {o.status === '배송중' && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">배송중</span>}
                      {o.status === '결제완료' && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">결제완료</span>}
                      {o.status === '입금대기' && <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">입금대기</span>}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{new Date(o.created_at).toLocaleString()}</p>
                    <h3 className="font-bold mb-1">{o.buyer_name} <span className="text-sm font-normal text-gray-500 ml-1">{o.buyer_phone}</span></h3>
                    <p className="text-sm font-bold text-blue-600 mb-1">{o.product_name || '이전 주문'}</p>
                    <p className="text-sm font-medium mb-3">옵션: {o.option_selected}</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-xs mb-4">
                      <p className="mb-1"><span className="font-bold mr-2">배송지</span> {o.shipping_address}</p>
                      <p><span className="font-bold mr-2">결제액</span> {o.total_price.toLocaleString()}원</p>
                      {o.tracking_number && <p className="mt-2 text-blue-600"><span className="font-bold mr-2 text-gray-500">운송장</span> {o.tracking_number}</p>}
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 justify-end border-t pt-3 mt-2">
                      {o.status === '입금대기' && <button onClick={() => handleUpdateStatus(o.id, '결제완료')} className="text-xs bg-black text-white px-4 py-2 rounded-lg font-bold">✓ 입금 확인</button>}
                      {o.status === '결제완료' && (
                        <div className="flex w-full md:w-auto gap-2">
                          <input type="text" placeholder="택배사 및 송장번호" className="flex-1 md:w-48 text-xs border p-2 rounded-lg outline-none" value={trackingInputs[o.id] || ''} onChange={(e) => setTrackingInputs({...trackingInputs, [o.id]: e.target.value})} />
                          <button onClick={() => handleDispatch(o.id)} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold">발송 처리</button>
                          <button onClick={() => handleUpdateStatus(o.id, '입금대기')} className="text-xs bg-gray-200 px-3 py-2 rounded-lg font-bold">✕ 취소</button>
                        </div>
                      )}
                      {o.status === '배송중' && <button onClick={() => handleUpdateStatus(o.id, '결제완료')} className="text-xs bg-gray-200 px-4 py-2 rounded-lg font-bold">✕ 배송전으로 되돌리기</button>}
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
              <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl shadow-sm border sticky top-28">
                <h2 className="font-bold text-lg mb-4 pb-3 border-b">새 상품 등록</h2>
                <div className="mb-5">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                    <span className="text-2xl mb-2">📸</span>
                  </label>
                  {imageFile && <p className="text-xs text-green-600 mt-2 font-bold ml-1">✓ {imageFile.name}</p>}
                </div>
                <div className="mb-4"><input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="상품명" className="w-full border p-3.5 rounded-xl text-sm outline-none" /></div>
                <div className="mb-4"><input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="가격 (숫자만)" className="w-full border p-3.5 rounded-xl text-sm outline-none" /></div>
                <div className="mb-6"><input type="text" value={newProductOptions} onChange={(e) => setNewProductOptions(e.target.value)} placeholder="옵션 (쉼표 구분)" className="w-full border p-3.5 rounded-xl text-sm outline-none" /></div>
                <button type="submit" disabled={isAddingProduct} className="w-full bg-black text-white p-4 rounded-xl font-bold disabled:bg-gray-400">{isAddingProduct ? '등록 중...' : '추가하기'}</button>
              </form>
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-4">
              {products.map((p) => {
                const optionsArray = p.options ? p.options.split(',').map((o:string) => o.trim()) : [];
                return (
                  <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border relative">
                    <div className="flex gap-5 items-center">
                      <img src={p.image_url} alt="" className="w-24 h-24 object-cover rounded-xl bg-gray-100"/>
                      <div className="flex-grow">
                        <h3 className="font-bold text-lg">{p.name}</h3>
                        <p className="text-red-500 font-black text-sm">{p.price.toLocaleString()}원</p>
                      </div>
                      <button onClick={() => handleDeleteProduct(p.id)} className="absolute top-4 right-4 text-gray-400 text-xl">🗑️</button>
                    </div>
                    
                    {/* 💡 이 부분이 추가되었습니다! 옵션별 판매/품절 관리 영역 */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 mb-2">📦 옵션 재고 관리 (클릭 시 상태 변경)</p>
                      <div className="flex flex-wrap gap-2">
{optionsArray.map((opt: string) => {                          // 데이터베이스에 저장된 품절 텍스트를 검사합니다.
                          const isSoldOut = (p.soldout_options || '').split(',').map((o:string) => o.trim()).includes(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => toggleOptionSoldOut(p.id, opt, p.soldout_options || '')}
                              className={`text-xs px-3 py-2 rounded-lg font-bold border transition-colors ${
                                isSoldOut 
                                  ? 'bg-red-50 text-red-600 border-red-200 line-through' 
                                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              }`}
                            >
                              {opt} {isSoldOut ? '(품절)' : '(판매중)'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}