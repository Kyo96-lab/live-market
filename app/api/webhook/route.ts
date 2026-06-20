import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';

// 은행(또는 스크래핑 서버)에서 입금 정보가 도착했을 때 실행되는 함수
export async function POST(request: Request) {
  try {
    // 1. 은행에서 보내준 데이터(입금자명, 금액)를 받습니다.
    const { depositorName, amount } = await request.json();

    // 2. 우리 DB의 orders 테이블에서 '입금자명'과 '금액'이 일치하고, '입금대기' 상태인 주문을 찾습니다.
    const { data: matchingOrders, error: searchError } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_name', depositorName)
      .eq('total_price', amount)
      .eq('status', '입금대기');

    if (searchError) throw searchError;

    // 3. 일치하는 주문이 없다면? (동명이인이거나 금액을 잘못 입금한 경우)
    if (!matchingOrders || matchingOrders.length === 0) {
      return NextResponse.json({ success: false, message: '일치하는 입금대기 주문을 찾을 수 없습니다. 수동 확인이 필요합니다.' });
    }

    // 4. 일치하는 주문을 찾았다면! 해당 주문의 상태를 '결제완료'로 업데이트합니다.
    const matchedOrder = matchingOrders[0]; // 가장 먼저 찾은 주문
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: '결제완료' })
      .eq('id', matchedOrder.id);

    if (updateError) throw updateError;

    // 5. 성공 메시지를 반환합니다.
    return NextResponse.json({ 
      success: true, 
      message: `${depositorName}님의 주문(${matchedOrder.id})이 자동 결제완료 처리되었습니다.` 
    });

  } catch (error) {
    console.error('입금 확인 처리 중 오류:', error);
    return NextResponse.json({ success: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}