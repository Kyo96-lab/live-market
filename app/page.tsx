'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
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

  const handleOptionClick = (p: any, option: string) => {
    if (p.stock <= 0) return alert('품절된 상품입니다.');
    
    const existingIdx = cart.findIndex(c => c.productId === p.id && c.option === option);
    
    if (existingIdx >= 0) {
      const newCart = [...cart];
      if (newCart[existingIdx].quantity >= p.stock) return alert(`남은 재고가 ${p.stock}개 뿐입니다.`);
      newCart[existingIdx].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: p.id, name: p.name, option: option, 
        price: p.price, quantity: 1, originalStock: p.stock
      }]);
    }
  };

  const handleCartQtyChange = (index: number, delta: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQty = item.quantity + delta;
    
    if (newQty < 1) return; 
    if (newQty > item.originalStock) return alert('재고가 부족합니다.');
    
    newCart[index].quantity = newQty;
    setCart(newCart);
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('장바구니가 비어있습니다.');
    
    // 💡 닉네임(!buyerInfo.nickname)도 안 적으면 통과하지 못하게 필수값 검사를 추가했습니다!
    if (!buyerInfo.name || !buyerInfo.nickname || !buyerInfo.phone || !buyerInfo.address) {
      return alert('입금자명, 닉네임, 연락처, 배송지 주소를 모두 입력해주세요!');
    }

    setIsSubmitting(true);
    try {
      const orderInserts = cart.map(item => ({
        product_name: item.name,
        buyer_name: buyerInfo.name,
        buyer_nickname: buyerInfo.nickname,
        buyer_phone: buyerInfo.phone,
        shipping_address: buyerInfo.address,
        option_selected: `${item.option} (${item.quantity}개)`, 
        total_price: item.price * item.quantity,
        status: '입금대기'
      }));

      const { error: orderError } = await supabase.from('orders').insert(orderInserts);
      if (orderError) throw orderError;

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
      setCart([]); setBuyerInfo({ name: '', nickname: '', phone: '', address: '' });
      fetchProducts(); window.scrollTo(0, 0);

    } catch (error) {
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

      {cart.length > 0 && (
        <button 
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-4 rounded-full shadow-2xl font-black flex items-center gap-2 hover:bg-gray-800 transition transform hover:scale-105"
        >
          🛒 결제하기 <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{cart.length}</span>
        </button>
      )}

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
                <p className="text-sm font-bold text-black">옵션 선택 <span className="text-xs text-gray-500 font-normal ml-2">(클릭 시 장바구니에 담깁니다)</span></p>
                <div className="flex flex-wrap gap-2">
                  {optionsArray.map((opt: string) => {
                    const isOptionSoldOut = (p.soldout_options || '').split(',').map((o:string)=>o.trim()).includes(opt);
                    const isDisabled = isTotalSoldOut || isOptionSoldOut;
                    
                    return (
                      <button 
                        key={opt}
                        disabled={isDisabled}
                        onClick={() => handleOptionClick(p, opt)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                          isDisabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 active:bg-gray-200'
                        }`}
                      >
                        {opt} {isTotalSoldOut ? '[전체품절]' : isOptionSoldOut && '[품절]'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="bg-white border-t border-gray-300 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)] p-6 mt-10">
          <h2 className="font-black text-2xl mb-5 text-black flex items-center gap-2">
            🛒 내 장바구니 <span className="bg-red-500 text-white text-sm px-2.5 py-1 rounded-full">{cart.length}</span>
          </h2>
          
          <div className="space-y-3 mb-6">
            {cart.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm relative">
                <button onClick={() => handleRemoveFromCart(idx)} className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full w-7 h-7 flex items-center justify-center text-xs font-black border border-gray-300">✕</button>
                
                <p className="font-black text-base text-black pr-8">{item.name}</p>
                <p className="text-sm font-bold text-gray-700 mt-1 mb-3">옵션: {item.option}</p>
                
                <div className="flex justify-between items-end">
                  <div className="flex items-center border-2 border-gray-200 rounded-lg bg-gray-50">
                    <button onClick={() => handleCartQtyChange(idx, -1)} className="px-3 py-1.5 text-gray-600 font-bold hover:bg-gray-200 rounded-l-lg">-</button>
                    <span className="px-3 text-sm font-black text-black">{item.quantity}</span>
                    <button onClick={() => handleCartQtyChange(idx, 1)} className="px-3 py-1.5 text-gray-600 font-bold hover:bg-gray-200 rounded-r-lg">+</button>
                  </div>
                  <p className="font-black text-red-600 text-lg">{(item.price * item.quantity).toLocaleString()}원</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-end border-t-2 border-gray-200 pt-5 mb-6">
            <span className="font-black text-gray-800 text-lg">총 결제 금액</span>
            <span className="font-black text-3xl text-red-600">{totalCartPrice.toLocaleString()}원</span>
          </div>

          <div className="space-y-3 bg-gray-50 p-5 rounded-2xl border-2 border-gray-200">
            <p className="font-black text-base text-black mb-2">🚚 배송지 정보 입력</p>
            <input placeholder="입금자명 (필수)" value={buyerInfo.name} onChange={e => setBuyerInfo({...buyerInfo, name: e.target.value})} className="w-full border-2 border-gray-300 p-3.5 rounded-xl text-base font-bold text-black outline-none focus:border-black placeholder-gray-400" />
            
            {/* 💡 (필수)로 문구를 변경했습니다 */}
            <input placeholder="주문자 닉네임 (필수)" value={buyerInfo.nickname} onChange={e => setBuyerInfo({...buyerInfo, nickname: e.target.value})} className="w-full border-2 border-gray-300 p-3.5 rounded-xl text-base font-bold text-black outline-none focus:border-black placeholder-gray-400" />
            
            <input placeholder="연락처 (숫자만)" value={buyerInfo.phone} onChange={e => setBuyerInfo({...buyerInfo, phone: e.target.value})} className="w-full border-2 border-gray-300 p-3.5 rounded-xl text-base font-bold text-black outline-none focus:border-black placeholder-gray-400" />
            <input placeholder="배송지 주소 (상세주소 포함)" value={buyerInfo.address} onChange={e => setBuyerInfo({...buyerInfo, address: e.target.value})} className="w-full border-2 border-gray-300 p-3.5 rounded-xl text-base font-bold text-black outline-none focus:border-black placeholder-gray-400" />
          </div>

          <button 
            onClick={handleCheckout} 
            disabled={isSubmitting}
            className="w-full bg-black text-white p-5 rounded-xl text-xl font-black hover:bg-gray-800 transition shadow-lg mt-6"
          >
            {isSubmitting ? '주문 처리 중...' : `${totalCartPrice.toLocaleString()}원 전체 주문하기`}
          </button>
        </div>
      )}
    </div>
  );
}