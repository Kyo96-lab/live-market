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
    
    // DB에서 이름과 연락처가 일치하는 주문 찾기
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_name', name)
      .eq('buyer_phone', phone)
      .order('created_at', { ascending: false }); // 최신순 정렬
      
    if (error) {
      alert('조회 중 오류가 발생했습니다.');
    } else {
      setOrders(data || []);
    }
    setIsSearching(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <header className="bg-white p-5 font-black text-center border-b flex justify-between items-center sticky top-0 z-10">
        <Link href="/" className="text-sm text-gray-500 font-bold hover:text-black transition">← 스토어 홈</Link>
        <span className="text-lg">주문 조회</span>
        <div className="w-16"></div> {/* 가운데 정렬을 위한 여백 */}
      </header>

      <div className="p-5">
        {/* 조회 입력 폼 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
          <h2 className="font-bold mb-4 text-gray-800">주문자 정보 입력</h2>
          <input 
            placeholder="입금자명" 
            className="w-full border border-gray-200 p-3 rounded-xl mb-3 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <input 
            placeholder="연락처 (숫자만)" 
            className="w-full border border-gray-200 p-3 rounded-xl mb-4 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full bg-black text-white p-4 rounded-xl font-bold hover:bg-gray-800 transition disabled:bg-gray-400"
          >
            {isSearching ? '조회 중...' : '내 주문 조회하기'}
          </button>
        </div>

        {/* 조회 결과 출력 */}
        {orders !== null && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-gray-700 px-1">조회 결과 ({orders.length}건)</h3>
            {orders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-400 border border-gray-100 shadow-sm">
                일치하는 주문 내역이 없습니다.
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
                  <div className="absolute top-4 right-4">
                    {order.status === '결제완료' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">결제완료</span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold animate-pulse">입금대기</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{new Date(order.created_at).toLocaleString()}</p>
                  <h4 className="font-bold text-base mb-1">선택 옵션: {order.option_selected}</h4>
                  <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 space-y-1 mt-3">
                    <p><span className="font-bold text-gray-500 mr-2">배송지</span> {order.shipping_address}</p>
                    <p><span className="font-bold text-gray-500 mr-2">결제액</span> {order.total_price.toLocaleString()}원</p>
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