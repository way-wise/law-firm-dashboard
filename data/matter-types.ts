export interface MatterType {
  id: string;
  name: string;
  code: string;
  category: string;
  estimatedDays: number;
  isActive: boolean;
}

export const matterTypes: MatterType[] = [
  { id: "mt1", name: "I-485 (Green Card)", code: "I485", category: "Employment", estimatedDays: 365, isActive: true },
  { id: "mt2", name: "H-1B Petition", code: "H1B", category: "Employment", estimatedDays: 180, isActive: true },
  { id: "mt3", name: "Asylum Application", code: "ASYLUM", category: "Humanitarian", estimatedDays: 540, isActive: true },
  { id: "mt4", name: "L-1 Visa", code: "L1", category: "Employment", estimatedDays: 120, isActive: true },
  { id: "mt5", name: "EB-2 NIW", code: "EB2NIW", category: "Employment", estimatedDays: 365, isActive: true },
  { id: "mt6", name: "O-1 Visa", code: "O1", category: "Employment", estimatedDays: 90, isActive: true },
  { id: "mt7", name: "Family-Based Green Card", code: "FAMILY", category: "Family", estimatedDays: 730, isActive: true },
  { id: "mt8", name: "Naturalization", code: "N400", category: "Citizenship", estimatedDays: 365, isActive: true },
];

export const getMatterTypeById = (id: string) => matterTypes.find((mt) => mt.id === id);
