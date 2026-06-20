'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  
  // 💡 선택된 옵션과 장바구니, 구매자 정보를 따로 관리합니다.
  const [selectedOptions, setSelectedOptions] = useState<any>({});
  const [cart, setCart] = useState<any[]>([]);
  const [buyerInfo, setBuyerInfo] = useState({ name: '', nickname: '', phone: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const handleOptionSelect = (productId: string, option: string) => {
    setSelectedOptions({ ...selectedOptions, [productId]: option });
  };

  // 💡 장바구니에 담기 로직
  const handleAddToCart = (p: any) => {
    const option = selectedOptions[p.id];
    if (!option) return alert('먼저 옵션을 선택해주세요!');
    if (p.stock <= 0) return alert('앗! 방금 품절된 상품입니다.');

    // 이미 장바구니에 같은 상품+옵션이 있는지 확인
    const existingIndex = cart.findIndex(item => item.productId === p.id && item.option === option);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      if (newCart[existingIndex].quantity >= p.stock) return alert(`남은 재고가 ${p.stock}개 뿐입니다.`);
      newCart[existingIndex].quantity += 1; // 수량 증가
      setCart(newCart);
    } else {
      setCart([...cart, { 
        productId: p.id, 
        name: p.name, 
        option: option, 
        price: p.price, 
        quantity: 1,
        originalStock: p.stock
      }]);
    }
    
    setSelectedOptions({ ...selectedOptions, [p.id]: null }); // 선택 초기화
    alert('🛒 장바구니에 담겼습니다!');
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // 💡 장바구니 일괄 결제 로직
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('장바구니가 비어있습니다.');
    if (!buyerInfo.name || !buyerInfo.phone || !buyerInfo.address) {
      return alert('입금자명, 연락처, 배송지 주소를 모두 입력해주세요!');
    }

    setIsSubmitting(true);

    try {
      // 1. 장바구니에 있는 모든 상품을 주문 테이블(orders)에 개별 행으로 넣습니다.
      const orderInserts = cart.map(item => ({
        product_name: item.name,
        buyer_name: buyerInfo.name,
        buyer_nickname: buyerInfo.nickname,
        buyer_phone: buyerInfo.phone,
        shipping_address: buyerInfo.address,
        // 💡 관리자 페이지에서 수량을 알아볼 수 있게 옵션 옆에 (n개)를 붙여줍니다!
        option_selected: `${item.option} (${item.quantity}개)`, 
        total_price: item.price * item.quantity,
        status: '입금대기'
      }));

      const { error: orderError } = await supabase.from('orders').insert(orderInserts);
      if (orderError) throw orderError;

      // 2. 주문한 수량만큼 각 상품의 재고(stock)를 깎아줍니다.
      const stockDeductions: any = {};
      cart.forEach(item => {
        if (!stockDeductions[item.productId]) stockDeductions[item.productId] = 0;
        stockDeductions[item.productId] += item.quantity;
      });

      for (const productId of Object.keys(stockDeductions)) {
        const product = products.find(p => p.id === productId);
        if (product) {
          const newStock = Math.max(0, product.stock - stockDeductions[productId]);
          await supabase.from('products').update({ stock: newStock }).eq('id', productId);
        }
      }

      alert('주문이 성공적으로 접수되었습니다! 🎉');
      setCart([]); // 장바구니 비우기
      setBuyerInfo({ name: '', nickname: '', phone: '', address: '' }); // 입력칸 비우기
      fetchProducts(); // 재고 갱신
      window.scrollTo(0, 0); // 맨 위로 올리기

    } catch (error) {
      console.error(error);
      alert('주문 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-100 pb-32 font-sans relative">
      <header className="bg-white p-5 font-black text-center border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div className="w-16"></div>
        <span className="text-xl text-black">LIVE 마켓</span>
        <Link href="/track" className="text-xs bg-gray-100 text-gray-800 px-3 py-2 rounded-lg font-bold hover:bg-gray-200 transition">
          주문 조회
        </Link>
      </header>

      {/* 🛍️ 상품 목록 영역 */}
      <div className="p-4 space-y-6">
        {products.map((p) => {
          const optionsArray = p.options ? p.options.split(',').map((o: string) => o.trim()) : [];
          const imagesArray = p.image_url ? p.image_url.split(',') : [];
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
                {p.stock <= 5 && p.stock > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold animate-bounce">품절임박 {p.stock}개!</span>}
              </div>
              <p className="text-red-600 font-black text-xl mb-4">{p.price.toLocaleString()}원</p>
              
              {p.description && <div className="mb-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100">{p.description}</div>}

              <div className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-black">옵션 선택</p>
                <div className="flex flex-wrap gap-2">
                  {optionsArray.map((opt: string) => {
                    const isOptionSoldOut = (p.soldout_options || '').split(',').map((o:string)=>o.trim()).includes(opt);
                    const isDisabled = isTotalSoldOut || isOptionSoldOut;
                    const isSelected = selectedOptions[p.id] === opt;

                    return (
                      <button 
                        key={opt}
                        disabled={isDisabled}
                        onClick={() => handleOptionSelect(p.id, opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                          isDisabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                            : isSelected ? 'bg-black text-white border-black ring-2 ring-offset-1 ring-black' 
                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {opt} {isTotalSoldOut ? '[전체품절]' : isOptionSoldOut && '[품절]'}
                      </button>
                    );
                  })}
                </div>
                
                {/* 💡 개별 정보 입력칸 삭제 -> 장바구니 담기 버튼으로 통합 */}
                <button 
                  onClick={() => handleAddToCart(p)} 
                  disabled={isTotalSoldOut}
                  className={`w-full p-4 rounded-xl text-base font-bold transition shadow-md mt-2 ${isTotalSoldOut ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {isTotalSoldOut ? '⚠️ 품절된 상품입니다' : '🛒 장바구니 담기'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🛒 하단 통합 장바구니 & 결제 영역 */}
      {cart.length > 0 && (
        <div className="bg-white border-t-2 border-gray-800 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)] p-5 mt-10">
          <h2 className="font-black text-xl mb-4 flex items-center gap-2">
            🛒 내 장바구니 <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{cart.length}</span>
          </h2>
          
          <div className="space-y-3 mb-6">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <p className="font-bold text-sm text-black">{item.name}</p>
                  <p className="text-xs text-gray-600 mt-1">옵션: {item.option} <span className="font-black text-blue-600 ml-1">({item.quantity}개)</span></p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-black text-red-600 text-sm">{(item.price * item.quantity).toLocaleString()}원</p>
                  <button onClick={() => handleRemoveFromCart(idx)} className="bg-gray-200 hover:bg-gray-300 text-gray-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-end border-t border-gray-200 pt-4 mb-6">
            <span className="font-bold text-gray-600">총 결제 금액</span>
            <span className="font-black text-2xl text-red-600">{totalCartPrice.toLocaleString()}원</span>
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <p className="font-bold text-sm text-black mb-2">배송지 정보 입력</p>
            <input placeholder="입금자명 (필수)" value={buyerInfo.name} onChange={e => setBuyerInfo({...buyerInfo, name: e.target.value})} className="w-full border p-3.5 rounded-xl text-sm outline-none focus:border-black" />
            <input placeholder="주문자 닉네임 (선택사항)" value={buyerInfo.nickname} onChange={e => setBuyerInfo({...buyerInfo, nickname: e.target.value})} className="w-full border p-3.5 rounded-xl text-sm outline-none focus:border-black" />
            <input placeholder="연락처 (숫자만)" value={buyerInfo.phone} onChange={e => setBuyerInfo({...buyerInfo, phone: e.target.value})} className="w-full border p-3.5 rounded-xl text-sm outline-none focus:border-black" />
            <input placeholder="배송지 주소 (상세주소 포함)" value={buyerInfo.address} onChange={e => setBuyerInfo({...buyerInfo, address: e.target.value})} className="w-full border p-3.5 rounded-xl text-sm outline-none focus:border-black" />
          </div>

          <button 
            onClick={handleCheckout} 
            disabled={isSubmitting}
            className="w-full bg-black text-white p-5 rounded-xl text-lg font-black hover:bg-gray-800 transition shadow-lg mt-6"
          >
            {isSubmitting ? '주문 처리 중...' : `${totalCartPrice.toLocaleString()}원 전체 주문하기`}
          </button>
        </div>
      )}
    </div>
  );
}