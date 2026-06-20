'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';

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
      product_name: p.name,
      buyer_name: order.name,
      buyer_phone: order.phone,
      shipping_address: order.address,
      option_selected: order.selectedOption,
      total_price: p.price,
      status: '입금대기'
    }]);

    if (error) {
      console.error(error);
      alert('주문 실패: 데이터베이스 연결을 확인해주세요.');
    } else {
      alert(p.name + ' 주문 접수 완료!');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-100 pb-10 font-sans">
      <header className="bg-white p-5 font-black text-center border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div className="w-16"></div>
        <span className="text-xl text-black">LIVE 마켓</span>
        <Link href="/track" className="text-xs bg-gray-100 text-gray-800 px-3 py-2 rounded-lg font-bold hover:bg-gray-200 transition">
          주문 조회
        </Link>
      </header>

      <div className="p-4 space-y-6">
        {products.map((p) => {
          const optionsArray = p.options ? p.options.split(',').map((o: string) => o.trim()) : [];
          
          // 💡 쉼표로 저장된 이미지 URL들을 쪼개서 사진 배열로 만듭니다.
          const imagesArray = p.image_url ? p.image_url.split(',') : [];

          return (
            <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              
              {/* 💡 옆으로 넘기는(스와이프) 갤러리 영역입니다. 스크롤바는 깔끔하게 숨겼습니다! */}
              <div 
                className="flex overflow-x-auto gap-3 mb-3 snap-x snap-mandatory hide-scroll" 
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
                {imagesArray.map((imgUrl: string, idx: number) => (
                  <img 
                    key={idx} 
                    src={imgUrl} 
                    className="w-full shrink-0 snap-center h-80 object-cover rounded-xl bg-gray-50 border border-gray-100" 
                    alt={`${p.name} 이미지 ${idx + 1}`}
                  />
                ))}
              </div>
              
              {/* 사진이 2장 이상일 때만 안내 문구를 띄워줍니다 */}
              {imagesArray.length > 1 && (
                <p className="text-center text-xs text-gray-400 font-bold mb-5 mt-1 animate-pulse">← 사진을 옆으로 넘겨보세요 →</p>
              )}

              <h1 className="text-lg font-bold text-black">{p.name}</h1>
              <p className="text-red-600 font-black text-xl mb-4">{p.price.toLocaleString()}원</p>
              
              {p.description && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100">
                  {p.description}
                </div>
              )}

              <div className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-black">옵션 선택</p>
                <div className="flex flex-wrap gap-2">
                  {optionsArray.map((opt: string) => {
                    const isSoldOut = (p.soldout_options || '').split(',').map((o:string)=>o.trim()).includes(opt);
                    return (
                      <button 
                        key={opt}
                        disabled={isSoldOut}
                        onClick={() => handleOptionClick(p.id, opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                          isSoldOut 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                            : orders[p.id]?.selectedOption === opt 
                              ? 'bg-black text-white border-black' 
                              : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {opt} {isSoldOut && '[품절]'}
                      </button>
                    );
                  })}
                </div>
                
                <input placeholder="입금자명" className="w-full border border-gray-300 p-3.5 rounded-xl text-base text-black placeholder-gray-500 focus:border-black outline-none transition" onChange={(e) => handleInputChange(p.id, 'name', e.target.value)} />
                <input placeholder="연락처 (예: 01012345678)" className="w-full border border-gray-300 p-3.5 rounded-xl text-base text-black placeholder-gray-500 focus:border-black outline-none transition" onChange={(e) => handleInputChange(p.id, 'phone', e.target.value)} />
                <input placeholder="배송지 주소 (상세주소 포함)" className="w-full border border-gray-300 p-3.5 rounded-xl text-base text-black placeholder-gray-500 focus:border-black outline-none transition" onChange={(e) => handleInputChange(p.id, 'address', e.target.value)} />
                
                <button onClick={() => handleSubmitOrder(p)} className="w-full bg-black text-white p-4 rounded-xl text-base font-bold hover:bg-gray-800 transition shadow-md mt-2">주문하기</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}