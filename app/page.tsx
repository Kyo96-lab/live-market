'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const handleOptionClick = (productId: string, option: string) => {
    setOrders({ ...orders, [productId]: { ...orders[productId], selectedOption: option } });
  };

  const handleInputChange = (productId: string, field: string, value: string) => {
    setOrders({ ...orders, [productId]: { ...orders[productId], [field]: value } });
  };

  const handleSubmitOrder = async (p: any) => {
    const order = orders[p.id];
    if (!order?.selectedOption || !order?.name || !order?.phone || !order?.address) {
      return alert('옵션 선택 및 배송지 등 필수 정보를 모두 입력해주세요!');
    }

    // 💡 안전장치: 주문 직전 한 번 더 재고가 남아있는지 확인합니다.
    if (p.stock <= 0) {
      return alert('앗! 방금 상품 재고가 모두 소진되어 품절되었습니다 😭');
    }

    // 1. 주문 테이블에 인서트
    const { error: orderError } = await supabase.from('orders').insert([{
      product_name: p.name,
      buyer_name: order.name,
      buyer_nickname: order.nickname || '', 
      buyer_phone: order.phone,
      shipping_address: order.address,
      option_selected: order.selectedOption,
      total_price: p.price,
      status: '입금대기'
    }]);

    if (orderError) {
      console.error(orderError);
      return alert('주문 실패: 데이터베이스 연결을 확인해주세요.');
    }

    // 2. 💡 상품 테이블의 재고 수량(stock)을 1 깎아주는 업데이트 연동
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: p.stock - 1 })
      .eq('id', p.id);

    if (stockError) {
      console.error(stockError);
    }

    alert(p.name + ' 주문 접수 완료!');
    fetchProducts(); // 💡 주문 후 남은 재고 수량 화면에 바로 반영
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
          const imagesArray = p.image_url ? p.image_url.split(',') : [];
          
          // 💡 상품 자체 재고가 0개 이하면 전체 품절로 판정합니다.
          const isTotalSoldOut = p.stock <= 0;

          return (
            <div key={p.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${isTotalSoldOut ? 'opacity-60 border-red-200' : 'border-gray-200'}`}>
              
              <div className="flex overflow-x-auto gap-3 mb-3 snap-x snap-mandatory hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
                {imagesArray.map((imgUrl: string, idx: number) => (
                  <img key={idx} src={imgUrl} className="w-full shrink-0 snap-center h-80 object-cover rounded-xl bg-gray-50 border border-gray-100" alt=""/>
                ))}
              </div>
              
              {imagesArray.length > 1 && !isTotalSoldOut && <p className="text-center text-xs text-gray-400 font-bold mb-5 mt-1 animate-pulse">← 사진을 옆으로 넘겨보세요 →</p>}

              <div className="flex justify-between items-start mb-1">
                <h1 className="text-lg font-bold text-black">{p.name}</h1>
                {/* 💡 잔여 재고가 5개 이하로 떨어지면 불 들어오게 시인성 추가 */}
                {p.stock <= 5 && p.stock > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold animate-bounce">품절임박 {p.stock}개!</span>
                )}
              </div>
              <p className="text-red-600 font-black text-xl mb-4">{p.price.toLocaleString()}원</p>
              
              {p.description && <div className="mb-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100">{p.description}</div>}

              <div className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-black">옵션 선택</p>
                <div className="flex flex-wrap gap-2">
                  {optionsArray.map((opt: string) => {
                    const isOptionSoldOut = (p.soldout_options || '').split(',').map((o:string)=>o.trim()).includes(opt);
                    // 전체 품절이거나 개별 옵션이 품절이면 활성화 차단
                    const isDisabled = isTotalSoldOut || isOptionSoldOut;

                    return (
                      <button 
                        key={opt}
                        disabled={isDisabled}
                        onClick={() => handleOptionClick(p.id, opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                          isDisabled 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                            : orders[p.id]?.selectedOption === opt 
                              ? 'bg-black text-white border-black' 
                              : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {opt} {isTotalSoldOut ? '[품절]' : isOptionSoldOut && '[품절]'}
                      </button>
                    );
                  })}
                </div>
                
                <input placeholder="입금자명 (필수)" disabled={isTotalSoldOut} className="w-full border border-gray-300 p-3.5 rounded-xl text-base text-black placeholder-gray-500 focus:border-black outline-none transition disabled:bg-gray-50" onChange={(e) => handleInputChange(p.id, 'name', e.target.value)} />
                <input placeholder="주문자 닉네임 (선택사항)" disabled={isTotalSoldOut} className="w-full border border-gray-300 p-3.5 rounded-xl text-base text-black placeholder-gray-500 focus:border-black outline-none transition bg-gray-50 disabled:bg-gray-50" onChange={(e) => handleInputChange(p.id, 'nickname', e.target.value)} />
                <input placeholder="연락처 (예: 01012345678)" disabled={isTotalSoldOut} className="w-full border border-gray-300 p-3.5 rounded-xl text-base text-black placeholder-gray-500 focus:border-black outline-none transition disabled:bg-gray-50" onChange={(e) => handleInputChange(p.id, 'phone', e.target.value)} />
                <input placeholder="배송지 주소 (상세주소 포함)" disabled={isTotalSoldOut} className="w-full border border-gray-300 p-3.5 rounded-xl text-base text-black placeholder-gray-500 focus:border-black outline-none transition disabled:bg-gray-50" onChange={(e) => handleInputChange(p.id, 'address', e.target.value)} />
                
                <button 
                  onClick={() => handleSubmitOrder(p)} 
                  disabled={isTotalSoldOut}
                  className={`w-full p-4 rounded-xl text-base font-bold transition shadow-md mt-2 ${isTotalSoldOut ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                  {isTotalSoldOut ? '⚠️ 품절된 상품입니다' : '주문하기'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}