export type BlocketAccessToken = {
  user: null;
  isLoggedIn: false;
  bearerToken: string;
};

export interface BlocketResponse {
  data: BlocketAd[];
}

export interface BlocketAd {
  ad_id: string;
  ad_status: 'active' | 'inactive' | string;
  advertiser: {
    account_id: string;
    contact_methods: Record<string, any>;
    name: string;
    public_profile: Record<string, any>;
    type: 'private' | 'business';
  };
  body: string;
  category: Record<string, any>[];
  co2_text: string;
  images: Record<string, any>[];
  list_id: string;
  list_time: string; // ISO date string
  location: Record<string, any>[];
  map_url: string;
  parameter_groups: Record<string, any>[];
  parameters_raw: {
    is_shipping_buy_now_enabled: Record<string, any>;
    shipping_enabled: Record<string, any>;
  };
  price: {
    suffix: string;
    value: number;
  };
  price_badge?: {
    icon: Record<string, any>;
    id: string;
    label: string;
  };
  share_url: string;
  state_id: string;
  subject: string;
  type: string;
  zipcode: string;
}
