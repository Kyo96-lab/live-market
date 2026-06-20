'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link'; // 💡 주문 조회 페이지로 이동하기 위한 링크 컴포넌트 추가

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any>({});

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data);
    };
    fetchProducts();
  }, []);

  const handleOptionClick = (productId: string, option: string) => {
    setOrders({ ...orders, [productId]: { ...orders[productId], selectedOption: option } });
  };

  const handleInputChange = (productId: string, field: string, value: string) => {
    setOrders({ ...orders, [productId]: { ...orders[productId], [field]: value } });
  };

  const handleSubmitOrder = async (p: any) => {
    const order = orders[p.id];
    if (!order?.selectedOption || !order?.name || !order?.phone || !order?.address) {
      return alert('옵션 선택 및 배송지 등 모든 정보를 입력해주세요!');
    }

    const { error } = await supabase.from('orders').insert([{
      buyer_name: order.name,
      buyer_phone: order.phone,
      shipping_address: order.address,
      option_selected: order.selectedOption,
      total_price: p.price,
      status: '입금대기'
    }]);

    if (error) alert('주문 실패');
    else alert(p.name + ' 주문 접수 완료!');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-100 pb-10">
      
      {/* 💡 상단 헤더: 우측에 '주문 조회' 버튼이 추가되었습니다 */}
      <header className="bg-white p-5 font-black text-center border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div className="w-16"></div> {/* 좌우 균형을 맞추기 위한 투명 여백 */}
        <span className="text-xl">LIVE 마켓</span>
        <Link href="/track" className="text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-lg font-bold hover:bg-gray-200 transition">
          주문 조회
        </Link>
      </header>

      {/* 상품 리스트 영역 */}
      <div className="p-4 space-y-6">
        {products.map((p) => {
          // 관리자 페이지에서 쉼표(,)로 입력한 옵션을 분리하여 배열로 만듭니다
          const optionsArray = p.options ? p.options.split(',').map((o: string) => o.trim()) : [];

          return (
            <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border">
              <img src={p.image_url} className="w-full h-64 object-cover rounded-xl mb-4" />
              <h1 className="text-lg font-bold">{p.name}</h1>
              <p className="text-red-500 font-black text-xl mb-4">{p.price.toLocaleString()}원</p>

              <div className="space-y-4 border-t pt-4">
                <p className="text-xs font-bold text-gray-500">옵션 선택</p>
                <div className="flex flex-wrap gap-2">
                  {optionsArray.map((opt: string) => (
                    <button 
                      key={opt}
                      onClick={() => handleOptionClick(p.id, opt)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                        orders[p.id]?.selectedOption === opt 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                
                {/* 주문자 정보 입력창 */}
                <input 
                  placeholder="입금자명" 
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition" 
                  onChange={(e) => handleInputChange(p.id, 'name', e.target.value)} 
                />
                <input 
                  placeholder="연락처 (예: 01012345678)" 
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition" 
                  onChange={(e) => handleInputChange(p.id, 'phone', e.target.value)} 
                />
                <input 
                  placeholder="배송지 주소 (상세주소 포함)" 
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition" 
                  onChange={(e) => handleInputChange(p.id, 'address', e.target.value)} 
                />
                
                <button 
                  onClick={() => handleSubmitOrder(p)} 
                  className="w-full bg-black text-white p-4 rounded-xl font-bold hover:bg-gray-800 transition"
                >
                  주문하기
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}