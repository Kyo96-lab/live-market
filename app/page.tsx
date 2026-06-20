'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  
  // 💡 장바구니에 넣기 전, 선택한 옵션들을 임시로 모아두는 곳 (수량 조절용)
  const [stagedItems, setStagedItems] = useState<any>({}); 
  
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

  // 💡 옵션 버튼을 눌렀을 때 임시 보관함(Staging)에 담는 함수
  const handleOptionClick = (p: any, option: string) => {
    if (p.stock <= 0) return alert('품절된 상품입니다.');
    
    const currentStaged = stagedItems[p.id] || [];
    const existing = currentStaged.find((item: any) => item.option === option);
    
    // 이미 선택한 옵션이면 수량을 1개 늘리고, 아니면 목록에 새로 추가합니다.
    if (existing) {
      if (existing.quantity >= p.stock) return alert(`남은 재고가 ${p.stock}개 뿐입니다.`);
      const updated = currentStaged.map((item: any) => 
        item.option === option ? { ...item, quantity: item.quantity + 1 } : item
      );
      setStagedItems({ ...stagedItems, [p.id]: updated });
    } else {
      setStagedItems({ ...stagedItems, [p.id]: [...currentStaged, { option, quantity: 1, price: p.price, originalStock: p.stock }] });
    }
  };

  // 💡 임시 보관함 안에서 + / - 버튼으로 수량을 조절하는 함수
  const handleStagedQtyChange = (productId: string, option: string, delta: number) => {
    const currentStaged = stagedItems[productId] || [];
    const updated = currentStaged.map((item: any) => {
      if (item.option === option) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item; 
        if (newQty > item.originalStock) { alert('재고가 부족합니다.'); return item; }
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setStagedItems({ ...stagedItems, [productId]: updated });
  };

  // 💡 임시 보관함에서 특정 옵션의 X 버튼을 눌러 지우는 함수
  const handleRemoveStaged = (productId: string, option: string) => {
    const currentStaged = stagedItems[productId] || [];
    setStagedItems({ ...stagedItems, [productId]: currentStaged.filter((item: any) => item.option !== option) });
  };

  // 💡 임시 보관함에 모인 옵션들을 한꺼번에 진짜 장바구니로 넘기는 함수
  const handleAddToCart = (p: any) => {
    const itemsToAdd = stagedItems[p.id] || [];
    if (itemsToAdd.length === 0) return alert('먼저 옵션을 선택해주세요!');
    
    let newCart = [...cart];
    itemsToAdd.forEach((newItem: any) => {
      const existingIdx = newCart.findIndex(c => c.productId === p.id && c.option === newItem.option);
      if (existingIdx >= 0) {
        const potentialQty = newCart[existingIdx].quantity + newItem.quantity;
        if (potentialQty > newItem.originalStock) {
          alert(`[${newItem.option}] 옵션은 남은 재고를 초과하여 담을 수 없습니다.`);
        } else {
          newCart[existingIdx].quantity = potentialQty;
        }
      } else {
        newCart.push({
          productId: p.id, name: p.name, option: newItem.option, 
          price: newItem.price, quantity: newItem.quantity, originalStock: newItem.originalStock
        });
      }
    });
    
    setCart(newCart);
    setStagedItems({ ...stagedItems, [p.id]: [] }); // 임시 보관함 비우기
    alert('🛒 장바구니에 한꺼번에 담겼습니다!');
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('장바구니가 비어있습니다.');
    if (!buyerInfo.name || !buyerInfo.phone || !buyerInfo.address) return alert('입금자명, 연락처, 배송지 주소를 모두 입력해주세요!');

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

      <div className="p-4 space-y-6">
        {products.map((p) => {
          const optionsArray = p.options ? p.options.split(',').map((o: string) => o.trim()) : [];
          const imagesArray = p.image_url ? p.image_url.split(',') : [];
          const isTotalSoldOut = p.stock <= 0;
          const currentStaged = stagedItems[p.id] || [];

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

                {/* 💡 임시 보관함 (선택한 옵션 목록과 수량 조절 UI) */}
                {currentStaged.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mt-4 space-y-2">
                    {currentStaged.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-sm font-bold text-black">{item.option}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50">
                            <button onClick={() => handleStagedQtyChange(p.id, item.option, -1)} className="px-3 py-1 text-gray-600 font-bold hover:bg-gray-200 rounded-l-lg">-</button>
                            <span className="px-3 text-sm font-black text-black">{item.quantity}</span>
                            <button onClick={() => handleStagedQtyChange(p.id, item.option, 1)} className="px-3 py-1 text-gray-600 font-bold hover:bg-gray-200 rounded-r-lg">+</button>
                          </div>
                          <button onClick={() => handleRemoveStaged(p.id, item.option)} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 px-1 border-t border-gray-200 mt-2">
                      <span className="text-sm font-bold text-gray-600">총 상품금액</span>
                      <span className="text-lg font-black text-red-600">
                        {currentStaged.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => handleAddToCart(p)} 
                  disabled={isTotalSoldOut}
                  className={`w-full p-4 rounded-xl text-base font-bold transition shadow-md mt-2 ${isTotalSoldOut ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                  {isTotalSoldOut ? '⚠️ 품절된 상품입니다' : '🛒 한꺼번에 장바구니 담기'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🛒 💡 글씨를 훨씬 진하게 키운 하단 통합 장바구니 영역 */}
      {cart.length > 0 && (
        <div className="bg-white border-t border-gray-300 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)] p-6 mt-10">
          <h2 className="font-black text-2xl mb-5 text-black flex items-center gap-2">
            🛒 내 장바구니 <span className="bg-red-500 text-white text-sm px-2.5 py-1 rounded-full">{cart.length}</span>
          </h2>
          
          <div className="space-y-3 mb-6">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                <div>
                  <p className="font-black text-base text-black">{item.name}</p>
                  <p className="text-sm font-bold text-gray-700 mt-1">옵션: {item.option} <span className="font-black text-blue-600 ml-1">({item.quantity}개)</span></p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <button onClick={() => handleRemoveFromCart(idx)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full w-7 h-7 flex items-center justify-center text-xs font-black border border-gray-300">✕</button>
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
            <input placeholder="주문자 닉네임 (선택사항)" value={buyerInfo.nickname} onChange={e => setBuyerInfo({...buyerInfo, nickname: e.target.value})} className="w-full border-2 border-gray-300 p-3.5 rounded-xl text-base font-bold text-black outline-none focus:border-black placeholder-gray-400" />
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