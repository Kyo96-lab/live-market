'use client';
import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import Link from 'next/link';

export default function TrackOrder() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!name || !phone) return alert('성함과 연락처를 모두 입력해주세요.');
    setIsSearching(true);
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_name', name)
      .eq('buyer_phone', phone)
      .order('created_at', { ascending: false });
      
    if (error) alert('조회 중 오류가 발생했습니다.');
    else setOrders(data || []);
    setIsSearching(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-100 pb-10 font-sans">
      <header className="bg-white p-5 font-black text-center border-b flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <Link href="/" className="text-sm text-black font-bold hover:text-gray-700 transition">← 스토어 홈</Link>
        <span className="text-xl text-black">주문 조회</span>
        <div className="w-16"></div>
      </header>

      <div className="p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-300 mb-6">
          <h2 className="font-black mb-4 text-black text-lg">주문자 정보 입력</h2>
          
          <input 
            placeholder="입금자명" 
            className="w-full border-2 border-gray-300 p-4 rounded-xl mb-3 text-base font-bold text-black placeholder-gray-500 focus:border-black outline-none transition" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <input 
            placeholder="연락처 (숫자만)" 
            className="w-full border-2 border-gray-300 p-4 rounded-xl mb-4 text-base font-bold text-black placeholder-gray-500 focus:border-black outline-none transition" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
          />
          <button 
            onClick={handleSearch} 
            disabled={isSearching} 
            className="w-full bg-black text-white p-4 rounded-xl text-lg font-black hover:bg-gray-800 transition shadow-md"
          >
            {isSearching ? '조회 중...' : '내 주문 조회하기'}
          </button>
        </div>

        {orders !== null && (
          <div className="space-y-4">
            <h3 className="font-black text-black text-lg px-1">조회 결과 ({orders.length}건)</h3>
            {orders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-black font-bold border-2 border-gray-200 shadow-sm">
                일치하는 주문 내역이 없습니다.
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-sm relative">
                  <div className="absolute top-4 right-4 flex gap-1">
                    {order.status === '배송중' && <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-black border border-blue-200">배송중</span>}
                    {order.status === '결제완료' && <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-black border border-green-200">결제완료</span>}
                    {order.status === '입금대기' && <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-black border border-red-200">입금대기</span>}
                  </div>
                  <p className="text-sm font-bold text-gray-500 mb-2">{new Date(order.created_at).toLocaleString()}</p>
                  
                  <h4 className="font-black text-lg mb-1 text-black">{order.product_name || '이전 주문'}</h4>
                  <p className="text-base font-bold text-black mb-4">옵션: {order.option_selected}</p>
                  
                  <div className="bg-gray-100 p-4 rounded-xl text-sm space-y-3 mt-3 border border-gray-200">
                    <p className="flex justify-between"><span className="font-bold text-gray-600">배송지</span> <span className="font-bold text-black text-right ml-4">{order.shipping_address}</span></p>
                    <p className="flex justify-between"><span className="font-bold text-gray-600">결제액</span> <span className="font-black text-red-600 text-base">{order.total_price.toLocaleString()}원</span></p>
                    
                    {/* 운송장 번호 노출 영역 */}
                    {order.tracking_number && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <p className="font-black text-blue-700 text-lg text-center bg-blue-50 py-3 rounded-lg border border-blue-100">
                          🚚 운송장: {order.tracking_number}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}