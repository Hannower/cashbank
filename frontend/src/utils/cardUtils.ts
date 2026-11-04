export interface CardBrandInfo {
  name: string;
  badgeClass: string;
  color: string;
  darkColor: string;
}

export const getCardBrandInfo = (description?: string): CardBrandInfo => {
  const s = (description || '').toLowerCase();
  if (s.includes('nubank')) {
    return {
      name: 'Nubank',
      badgeClass: 'card-nubank',
      color: '#820ad1',
      darkColor: '#c084fc',
    };
  }
  if (s.includes('mercado pago') || s.includes('mercadopago')) {
    return {
      name: 'Mercado Pago',
      badgeClass: 'card-mercadopago',
      color: '#009ee3',
      darkColor: '#38bdf8',
    };
  }
  if (s.includes('inter')) {
    return {
      name: 'Banco Inter',
      badgeClass: 'card-inter',
      color: '#ff7a00',
      darkColor: '#fb923c',
    };
  }
  if (s.includes('itau') || s.includes('itaú')) {
    return {
      name: 'Itaú',
      badgeClass: 'card-itau',
      color: '#ec7000',
      darkColor: '#fb923c',
    };
  }
  if (s.includes('picpay')) {
    return {
      name: 'PicPay',
      badgeClass: 'card-picpay',
      color: '#11c76f',
      darkColor: '#4ade80',
    };
  }
  if (s.includes('bradesco') || s.includes('santander')) {
    return {
      name: s.includes('santander') ? 'Santander' : 'Bradesco',
      badgeClass: 'card-red',
      color: '#cc092f',
      darkColor: '#f87171',
    };
  }
  return {
    name: 'Cartão',
    badgeClass: '',
    color: '#2563eb',
    darkColor: '#60a5fa',
  };
};
