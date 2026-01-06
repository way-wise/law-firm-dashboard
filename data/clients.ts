// Docketwise API aligned types
export type ContactType = "Person" | "Institution";

// Physical/Mailing Address
export interface Address {
  id: number | null;
  street_number_and_name: string | null;
  apartment_number: string | null;
  city: string | null;
  state: string | null;
  county: string | null;
  province: string | null;
  zip_code: string | null;
  country: string | null;
  date_from: string | null;
  date_to: string | null;
  in_care_of: string | null;
  physical: boolean;
  mailing: boolean;
}

// Phone number
export interface PhoneNumber {
  id: number;
  number: string;
  daytime: boolean;
}

// Contact/Client interface aligned with Docketwise API
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  company_name: string | null;
  email: string | null;
  type: ContactType;
  lead: boolean;
  lead_phone: string | null;
  physical_address: Address | null;
  mailing_address: Address | null;
  phone_numbers: PhoneNumber[];
  created_at: string;
  updated_at: string;
}

// Helper to get full name
export const getContactName = (client: Client) => {
  if (client.type === "Institution" && client.company_name) {
    return client.company_name;
  }
  const parts = [client.first_name, client.middle_name, client.last_name].filter(Boolean);
  return parts.join(" ");
};

// Helper to get primary phone
export const getPrimaryPhone = (client: Client) => {
  const daytimePhone = client.phone_numbers.find(p => p.daytime);
  return daytimePhone?.number || client.phone_numbers[0]?.number || client.lead_phone || null;
};

// Helper to format address
export const formatAddress = (address: Address | null) => {
  if (!address) return null;
  const parts = [
    address.street_number_and_name,
    address.apartment_number ? `Apt ${address.apartment_number}` : null,
    address.city,
    address.state || address.province,
    address.zip_code,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
};

export const clients: Client[] = [
  {
    id: 1,
    first_name: "Maria",
    last_name: "Rodriguez",
    middle_name: null,
    company_name: null,
    email: "maria.rodriguez@email.com",
    type: "Person",
    lead: false,
    lead_phone: null,
    physical_address: {
      id: 1,
      street_number_and_name: "123 Main Street",
      apartment_number: "4B",
      city: "Los Angeles",
      state: "CA",
      county: "Los Angeles",
      province: null,
      zip_code: "90001",
      country: "Mexico",
      date_from: "2020-01-01",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [
      { id: 1, number: "+1 555-0101", daytime: true },
    ],
    created_at: "2024-10-31T00:00:00Z",
    updated_at: "2024-10-31T00:00:00Z",
  },
  {
    id: 2,
    first_name: "Chen",
    last_name: "Wei",
    middle_name: null,
    company_name: null,
    email: "chen.wei@email.com",
    type: "Person",
    lead: false,
    lead_phone: null,
    physical_address: {
      id: 2,
      street_number_and_name: "456 Oak Avenue",
      apartment_number: null,
      city: "San Francisco",
      state: "CA",
      county: "San Francisco",
      province: null,
      zip_code: "94102",
      country: "China",
      date_from: "2022-06-15",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [
      { id: 2, number: "+1 555-0102", daytime: true },
    ],
    created_at: "2024-11-05T00:00:00Z",
    updated_at: "2024-11-05T00:00:00Z",
  },
  {
    id: 3,
    first_name: "Ahmed",
    last_name: "Hassan",
    middle_name: "Mohamed",
    company_name: null,
    email: "ahmed.hassan@email.com",
    type: "Person",
    lead: true,
    lead_phone: "+1 555-0103",
    physical_address: {
      id: 3,
      street_number_and_name: "789 Pine Road",
      apartment_number: "12",
      city: "New York",
      state: "NY",
      county: "New York",
      province: null,
      zip_code: "10001",
      country: "Egypt",
      date_from: "2024-01-10",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [],
    created_at: "2024-11-10T00:00:00Z",
    updated_at: "2024-11-10T00:00:00Z",
  },
  {
    id: 4,
    first_name: "Priya",
    last_name: "Sharma",
    middle_name: null,
    company_name: null,
    email: "priya.sharma@email.com",
    type: "Person",
    lead: false,
    lead_phone: null,
    physical_address: {
      id: 4,
      street_number_and_name: "321 Elm Street",
      apartment_number: null,
      city: "Chicago",
      state: "IL",
      county: "Cook",
      province: null,
      zip_code: "60601",
      country: "India",
      date_from: "2021-03-20",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [
      { id: 3, number: "+1 555-0104", daytime: true },
      { id: 4, number: "+1 555-0104-2", daytime: false },
    ],
    created_at: "2024-11-15T00:00:00Z",
    updated_at: "2024-11-15T00:00:00Z",
  },
  {
    id: 5,
    first_name: "Dimitri",
    last_name: "Volkov",
    middle_name: "Alexandrovich",
    company_name: null,
    email: "dimitri.volkov@email.com",
    type: "Person",
    lead: false,
    lead_phone: null,
    physical_address: {
      id: 5,
      street_number_and_name: "555 Tech Park Drive",
      apartment_number: "Suite 200",
      city: "Austin",
      state: "TX",
      county: "Travis",
      province: null,
      zip_code: "78701",
      country: "Russia",
      date_from: "2023-08-01",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [
      { id: 5, number: "+1 555-0105", daytime: true },
    ],
    created_at: "2024-11-20T00:00:00Z",
    updated_at: "2024-11-20T00:00:00Z",
  },
  {
    id: 6,
    first_name: "Fatima",
    last_name: "Al-Sayed",
    middle_name: null,
    company_name: null,
    email: "fatima.alsayed@email.com",
    type: "Person",
    lead: false,
    lead_phone: null,
    physical_address: {
      id: 6,
      street_number_and_name: "888 University Blvd",
      apartment_number: null,
      city: "Boston",
      state: "MA",
      county: "Suffolk",
      province: null,
      zip_code: "02101",
      country: "UAE",
      date_from: "2022-09-01",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [
      { id: 6, number: "+1 555-0106", daytime: true },
    ],
    created_at: "2024-11-25T00:00:00Z",
    updated_at: "2024-11-25T00:00:00Z",
  },
  {
    id: 7,
    first_name: "John",
    last_name: "Smith",
    middle_name: "William",
    company_name: null,
    email: "john.smith@email.com",
    type: "Person",
    lead: true,
    lead_phone: "+1 555-0107",
    physical_address: {
      id: 7,
      street_number_and_name: "100 Corporate Center",
      apartment_number: null,
      city: "Seattle",
      state: "WA",
      county: "King",
      province: null,
      zip_code: "98101",
      country: "UK",
      date_from: "2024-01-15",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [],
    created_at: "2024-12-01T00:00:00Z",
    updated_at: "2024-12-01T00:00:00Z",
  },
  {
    id: 8,
    first_name: "Yuki",
    last_name: "Tanaka",
    middle_name: null,
    company_name: null,
    email: "yuki.tanaka@email.com",
    type: "Person",
    lead: false,
    lead_phone: null,
    physical_address: {
      id: 8,
      street_number_and_name: "200 Innovation Way",
      apartment_number: "3A",
      city: "San Jose",
      state: "CA",
      county: "Santa Clara",
      province: null,
      zip_code: "95101",
      country: "Japan",
      date_from: "2023-04-01",
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [
      { id: 7, number: "+1 555-0108", daytime: true },
    ],
    created_at: "2024-12-05T00:00:00Z",
    updated_at: "2024-12-05T00:00:00Z",
  },
  {
    id: 9,
    first_name: "",
    last_name: "",
    middle_name: null,
    company_name: "TechCorp International",
    email: "hr@techcorp.com",
    type: "Institution",
    lead: false,
    lead_phone: null,
    physical_address: {
      id: 9,
      street_number_and_name: "500 Business Park",
      apartment_number: null,
      city: "Palo Alto",
      state: "CA",
      county: "Santa Clara",
      province: null,
      zip_code: "94301",
      country: "USA",
      date_from: null,
      date_to: null,
      in_care_of: null,
      physical: true,
      mailing: true,
    },
    mailing_address: null,
    phone_numbers: [
      { id: 8, number: "+1 555-9000", daytime: true },
    ],
    created_at: "2024-10-01T00:00:00Z",
    updated_at: "2024-10-01T00:00:00Z",
  },
];

export const getClientById = (id: number) => clients.find((c) => c.id === id);

// Get paginated clients
export function getClients(page: number = 1, limit: number = 10) {
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = clients.slice(start, end);
  
  return {
    data,
    meta: {
      page,
      limit,
      total: clients.length,
    },
  };
}
