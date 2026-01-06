export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  currentStatus: string | null;
  createdAt: Date;
}

export const clients: Client[] = [
  {
    id: "c1",
    name: "Maria Rodriguez",
    email: "maria.rodriguez@email.com",
    phone: "+1 555-0101",
    nationality: "Mexico",
    currentStatus: "H1B",
    createdAt: new Date("2024-10-31"),
  },
  {
    id: "c2",
    name: "Chen Wei",
    email: "chen.wei@email.com",
    phone: "+1 555-0102",
    nationality: "China",
    currentStatus: "F1",
    createdAt: new Date("2024-11-05"),
  },
  {
    id: "c3",
    name: "Ahmed Hassan",
    email: "ahmed.hassan@email.com",
    phone: "+1 555-0103",
    nationality: "Egypt",
    currentStatus: "Tourist",
    createdAt: new Date("2024-11-10"),
  },
  {
    id: "c4",
    name: "Priya Sharma",
    email: "priya.sharma@email.com",
    phone: "+1 555-0104",
    nationality: "India",
    currentStatus: "L1",
    createdAt: new Date("2024-11-15"),
  },
  {
    id: "c5",
    name: "Dimitri Volkov",
    email: "dimitri.volkov@email.com",
    phone: "+1 555-0105",
    nationality: "Russia",
    currentStatus: "O1",
    createdAt: new Date("2024-11-20"),
  },
  {
    id: "c6",
    name: "Fatima Al-Sayed",
    email: "fatima.alsayed@email.com",
    phone: "+1 555-0106",
    nationality: "UAE",
    currentStatus: "B1",
    createdAt: new Date("2024-11-25"),
  },
  {
    id: "c7",
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1 555-0107",
    nationality: "UK",
    currentStatus: "E2",
    createdAt: new Date("2024-12-01"),
  },
  {
    id: "c8",
    name: "Yuki Tanaka",
    email: "yuki.tanaka@email.com",
    phone: "+1 555-0108",
    nationality: "Japan",
    currentStatus: "H1B",
    createdAt: new Date("2024-12-05"),
  },
];

export const getClientById = (id: string) => clients.find((c) => c.id === id);
