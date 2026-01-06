export interface Worker {
  id: string;
  name: string;
  email: string;
  image: string | null;
  teamType: "inHouse" | "contractor";
  title: string;
  specializations: string[];
  isActive: boolean;
  totalCasesHandled: number;
  activeCases: number;
  avgResolutionDays: number;
  clientSatisfaction: number;
  createdAt: Date;
}

export const workers: Worker[] = [
  {
    id: "w1",
    name: "Soraya",
    email: "soraya@lawfirm.com",
    image: null,
    teamType: "inHouse",
    title: "Senior Paralegal",
    specializations: ["H1B", "Green Card"],
    isActive: true,
    totalCasesHandled: 45,
    activeCases: 1,
    avgResolutionDays: 120,
    clientSatisfaction: 4.8,
    createdAt: new Date("2023-01-15"),
  },
  {
    id: "w2",
    name: "Saurabh",
    email: "saurabh@lawfirm.com",
    image: null,
    teamType: "inHouse",
    title: "Immigration Specialist",
    specializations: ["Asylum", "Family-Based"],
    isActive: true,
    totalCasesHandled: 38,
    activeCases: 2,
    avgResolutionDays: 150,
    clientSatisfaction: 4.6,
    createdAt: new Date("2023-03-20"),
  },
  {
    id: "w3",
    name: "Maryam",
    email: "maryam@lawfirm.com",
    image: null,
    teamType: "inHouse",
    title: "Paralegal",
    specializations: ["L1", "O1"],
    isActive: true,
    totalCasesHandled: 22,
    activeCases: 0,
    avgResolutionDays: 90,
    clientSatisfaction: 4.9,
    createdAt: new Date("2023-06-10"),
  },
  {
    id: "w4",
    name: "Sue",
    email: "sue@contractor.com",
    image: null,
    teamType: "contractor",
    title: "Contract Paralegal",
    specializations: ["H1B", "EB-2 NIW"],
    isActive: true,
    totalCasesHandled: 15,
    activeCases: 1,
    avgResolutionDays: 100,
    clientSatisfaction: 4.5,
    createdAt: new Date("2024-01-05"),
  },
  {
    id: "w5",
    name: "Santosh",
    email: "santosh@contractor.com",
    image: null,
    teamType: "contractor",
    title: "Contract Specialist",
    specializations: ["EB-2 NIW", "O1"],
    isActive: true,
    totalCasesHandled: 12,
    activeCases: 1,
    avgResolutionDays: 110,
    clientSatisfaction: 4.7,
    createdAt: new Date("2024-02-15"),
  },
  {
    id: "w6",
    name: "Mahdis",
    email: "mahdis@contractor.com",
    image: null,
    teamType: "contractor",
    title: "Contract Paralegal",
    specializations: ["Asylum"],
    isActive: true,
    totalCasesHandled: 8,
    activeCases: 0,
    avgResolutionDays: 130,
    clientSatisfaction: 4.4,
    createdAt: new Date("2024-03-01"),
  },
];

export const getWorkerById = (id: string) => workers.find((w) => w.id === id);

export const getInHouseWorkers = () => workers.filter((w) => w.teamType === "inHouse" && w.isActive);

export const getContractorWorkers = () => workers.filter((w) => w.teamType === "contractor" && w.isActive);
