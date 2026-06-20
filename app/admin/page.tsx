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
  const [newProductDescription, setNewProductDescription] = useState('');
  // 💡 재고 수량 상태 추가
  const [newProductStock, setNewProductStock] = useState('999'); 
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // 💡 수정 모드를 위한 상태 추가
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

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
    if (!trackingNum) return alert('송장 번호를 입력해주세요!');
    const finalTracking = `우체국 ${trackingNum}`;
    const { error } = await supabase.from('orders').update({ status: '배송중', tracking_number: finalTracking }).eq('id', orderId);
    if (error) alert('운송장 등록 실패');
    else { alert('발송 처리가 완료되었습니다!'); fetchOrders(); }
  };

  const handleDownloadExcel = () => {
    if (orders.length === 0) return alert('다운로드할 주문 내역이 없습니다.');
    const headers = ['주문일시', '주문자명', '닉네임', '연락처', '상품명', '옵션', '배송지', '결제액', '상태', '운송장번호'];
    const rows = orders.map(o => [
      new Date(o.created_at).toLocaleString(),
      o.buyer_name, o.buyer_nickname || '', o.buyer_phone, o.product_name || '', o.option_selected,
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

  // 💡 등록 및 수정을 한 번에 처리하는 결합 함수
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductOptions) return alert('필수 정보를 모두 입력해주세요.');
    
    setIsAddingProduct(true);
    try {
      let imageUrlsString = '';

      // 수정 모드이고 사진을 새로 첨부 안 했을 때는 기존 사진 유지
      if (editingProductId && imageFiles.length === 0) {
        const currentProd = products.find(p => p.id === editingProductId);
        imageUrlsString = currentProd?.image_url || '';
      } else {
        if (imageFiles.length === 0) {
          setIsAddingProduct(false);
          return alert('상품 사진을 한 장 이상 선택해 주세요.');
        }
        const urls = await Promise.all(imageFiles.map(file => uploadImage(file)));
        imageUrlsString = urls.join(',');
      }
      
      const productData = {
        name: newProductName,
        price: parseInt(newProductPrice),
        options: newProductOptions,
        description: newProductDescription,
        stock: parseInt(newProductStock) || 0,
        image_url: imageUrlsString
      };

      if (editingProductId) {
        // 💡 수정 모드 (Update)
        const { error } = await supabase.from('products').update([productData]).eq('id', editingProductId);
        if (error) throw error;
        alert('수정이 완료되었습니다!');
      } else {
        // 💡 신규 등록 모드 (Insert)
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
        alert('등록 성공!');
      }
      
      // 입력창 리셋 및 모드 초기화
      setNewProductName(''); setNewProductPrice(''); setNewProductOptions(''); setNewProductDescription(''); setNewProductStock('999'); setImageFiles([]);
      setEditingProductId(null);
      fetchProducts();
    } catch (error) { alert('오류 발생'); } 
    finally { setIsAddingProduct(false); }
  };

  // 💡 수정 버튼을 눌렀을 때 입력창에 기존 정보를 채워주는 함수
  const handleStartEdit = (p: any) => {
    setEditingProductId(p.id);
    setNewProductName(p.name);
    setNewProductPrice(p.price.toString());
    setNewProductOptions(p.options);
    setNewProductDescription(p.description || '');
    setNewProductStock(p.stock.toString());
    // 사진은 새로 선택할 수 있도록 비워둠
    setImageFiles([]); 
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const toggleOptionSoldOut = async (productId: string, option: string, currentSoldOutText: string) => {
    const soldOutArray = currentSoldOutText ? currentSoldOutText.split(',').map(o => o.trim()).filter(Boolean) : [];
    let newSoldOutArray;
    if (soldOutArray.includes(option)) newSoldOutArray = soldOutArray.filter(o => o !== option);
    else newSoldOutArray = [...soldOutArray, option];
    
    const newSoldOutText = newSoldOutArray.join(',');
    const { error } = await supabase.from('products').update({ soldout_options: newSoldOutText }).eq('id', productId);
    if (error) alert('상태 변경 실패');
    else fetchProducts(); 
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
                      {o.status === '입금대기' && <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold animate-pulse">입금대기</span>}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{new Date(o.created_at).toLocaleString()}</p>
                    <h3 className="font-bold mb-1 flex items-center gap-2">
                      {o.buyer_name} 
                      {o.buyer_nickname && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-normal">{o.buyer_nickname}</span>}
                      <span className="text-sm font-normal text-gray-500 ml-1">{o.buyer_phone}</span>
                    </h3>
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
                        <div className="flex w-full md:w-auto items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
                          <span className="text-xs font-black text-gray-600 pl-3 pr-2">우체국</span>
                          <input type="text" placeholder="송장번호 숫자만 입력" className="flex-1 md:w-40 text-xs bg-transparent p-2 outline-none" value={trackingInputs[o.id] || ''} onChange={(e) => setTrackingInputs({...trackingInputs, [o.id]: e.target.value})} />
                          <button onClick={() => handleDispatch(o.id)} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-md font-bold mx-1">발송 처리</button>
                          <button onClick={() => handleUpdateStatus(o.id, '입금대기')} className="text-xs bg-gray-200 text-gray-600 px-3 py-2 rounded-md font-bold">✕ 취소</button>
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
              {/* 💡 수정 모드일 때 테두리 색상이 파란색으로 변경되어 인지하기 좋습니다 */}
              <form onSubmit={handleSaveProduct} className={`bg-white p-6 rounded-2xl shadow-sm border sticky top-28 ${editingProductId ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}>
                <h2 className="font-bold text-lg mb-4 pb-3 border-b">
                  {editingProductId ? '✏️ 상품 정보 수정' : '새 상품 등록'}
                </h2>
                <div className="mb-5">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative overflow-hidden">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) setImageFiles(Array.from(e.target.files)); }} />
                    {imageFiles.length > 0 ? (
                      <div className="flex gap-2 p-2 overflow-x-auto w-full h-full items-center">
                        {imageFiles.map((file, idx) => (
                          <img key={idx} src={URL.createObjectURL(file)} alt="미리보기" className="h-24 w-24 object-cover rounded-lg shadow-sm shrink-0 border" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center p-2 text-center">
                        <span className="text-2xl mb-1">📸</span>
                        <span className="text-xs text-gray-500 font-bold">
                          {editingProductId ? '사진 변경 시에만 클릭 (기존 유지 가능)' : '사진 여러 장 선택 가능'}
                        </span>
                      </div>
                    )}
                  </label>
                  {imageFiles.length > 0 && <p className="text-xs text-green-600 mt-2 font-bold ml-1 text-center">✓ 총 {imageFiles.length}장 첨부됨</p>}
                </div>
                <div className="mb-3"><input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="상품명" className="w-full border p-3 rounded-xl text-sm outline-none" /></div>
                <div className="mb-3"><input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="가격 (숫자만)" className="w-full border p-3 rounded-xl text-sm outline-none" /></div>
                <div className="mb-3"><input type="text" value={newProductOptions} onChange={(e) => setNewProductOptions(e.target.value)} placeholder="옵션 (쉼표 구분)" className="w-full border p-3 rounded-xl text-sm outline-none" /></div>
                
                {/* 💡 재고 수량 입력칸 추가 */}
                <div className="mb-3">
                  <input type="number" value={newProductStock} onChange={(e) => setNewProductStock(e.target.value)} placeholder="재고 수량 (숫자만)" className="w-full border p-3 rounded-xl text-sm outline-none bg-green-50/50 font-bold text-green-800" />
                </div>
                
                <div className="mb-5"><textarea value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} placeholder="상품 상세 설명" className="w-full border p-3 rounded-xl text-sm outline-none resize-none h-24" /></div>
                
                <div className="flex gap-2">
                  <button type="submit" disabled={isAddingProduct} className="flex-1 bg-black text-white p-4 rounded-xl font-bold disabled:bg-gray-400">
                    {isAddingProduct ? '처리 중...' : editingProductId ? '수정 완료' : '추가하기'}
                  </button>
                  {editingProductId && (
                    <button type="button" onClick={() => {
                      setEditingProductId(null); setNewProductName(''); setNewProductPrice(''); setNewProductOptions(''); setNewProductDescription(''); setNewProductStock('999'); setImageFiles([]);
                    }} className="bg-gray-200 text-gray-700 px-4 rounded-xl font-bold text-sm">
                      취소
                    </button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-4">
              {products.map((p) => {
                const optionsArray = p.options ? p.options.split(',').map((o:string) => o.trim()) : [];
                const firstImage = p.image_url ? p.image_url.split(',')[0] : '';

                return (
                  <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border relative">
                    <div className="flex gap-5 items-start">
                      <img src={firstImage} alt="" className="w-24 h-24 object-cover rounded-xl bg-gray-100 flex-shrink-0"/>
                      <div className="flex-grow pr-16">
                        <h3 className="font-bold text-lg">{p.name}</h3>
                        <p className="text-red-500 font-black text-sm mb-1">{p.price.toLocaleString()}원</p>
                        
                        {/* 💡 남은 재고 개수 표시 */}
                        <p className="text-xs font-bold text-green-700 mb-2">📊 남은 재고: {p.stock}개</p>
                        
                        {p.description && <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{p.description}</p>}
                      </div>
                      <div className="absolute top-4 right-4 flex gap-2">
                        {/* 💡 수정 버튼 생성 */}
                        <button onClick={() => handleStartEdit(p)} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg font-bold transition">✏️ 수정</button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="text-sm bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-400 p-1.5 rounded-lg transition">🗑️</button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 mb-2">📦 옵션 수동 상태 제어</p>
                      <div className="flex flex-wrap gap-2">
                        {optionsArray.map((opt: string) => {
                          const isSoldOut = (p.soldout_options || '').split(',').map((o:string) => o.trim()).includes(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => toggleOptionSoldOut(p.id, opt, p.soldout_options || '')}
                              className={`text-xs px-3 py-2 rounded-lg font-bold border transition-colors ${
                                isSoldOut ? 'bg-red-50 text-red-600 border-red-200 line-through' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
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