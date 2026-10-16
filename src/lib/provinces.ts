export interface ProvinceOption {
  code: string;
  nameEn: string;
  nameKm: string;
  area: "phnom_penh" | "provinces";
  daysMin: number;
  daysMax: number;
  feeUsd: string;
}

export const CAMBODIA_PROVINCES: ProvinceOption[] = [
  { code: "phnom_penh", nameEn: "Phnom Penh", nameKm: "ភ្នំពេញ", area: "phnom_penh", daysMin: 1, daysMax: 2, feeUsd: "1.50" },
  { code: "kandal", nameEn: "Kandal", nameKm: "កណ្តាល", area: "provinces", daysMin: 1, daysMax: 2, feeUsd: "2.00" },
  { code: "siem_reap", nameEn: "Siem Reap", nameKm: "សៀមរាប", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "battambang", nameEn: "Battambang", nameKm: "បាត់ដំបង", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "preah_sihanouk", nameEn: "Preah Sihanouk", nameKm: "ព្រះសីហនុ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "kampot", nameEn: "Kampot", nameKm: "កំពត", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "kep", nameEn: "Kep", nameKm: "កែប", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "kampong_cham", nameEn: "Kampong Cham", nameKm: "កំពង់ចាម", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "kampong_chhnang", nameEn: "Kampong Chhnang", nameKm: "កំពង់ឆ្នាំង", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "kampong_speu", nameEn: "Kampong Speu", nameKm: "កំពង់ស្ពឺ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "kampong_thom", nameEn: "Kampong Thom", nameKm: "កំពង់ធំ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "koh_kong", nameEn: "Koh Kong", nameKm: "កោះកុង", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "kratie", nameEn: "Kratie", nameKm: "ក្រចេះ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "preah_vihear", nameEn: "Preah Vihear", nameKm: "ព្រះវិហារ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "pursat", nameEn: "Pursat", nameKm: "ពោធិ៍សាត់", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "prey_veng", nameEn: "Prey Veng", nameKm: "ព្រៃវែង", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "svay_rieng", nameEn: "Svay Rieng", nameKm: "ស្វាយរៀង", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "takeo", nameEn: "Takeo", nameKm: "តាកែវ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "tboung_khmum", nameEn: "Tboung Khmum", nameKm: "ត្បូងឃ្មុំ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "banteay_meanchey", nameEn: "Banteay Meanchey", nameKm: "បន្ទាយមានជ័យ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "oddar_meanchey", nameEn: "Oddar Meanchey", nameKm: "ឧត្តរមានជ័យ", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "pailin", nameEn: "Pailin", nameKm: "ប៉ៃលិន", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "stung_treng", nameEn: "Stung Treng", nameKm: "ស្ទឹងត្រែង", area: "provinces", daysMin: 2, daysMax: 3, feeUsd: "3.00" },
  { code: "mondulkiri", nameEn: "Mondulkiri", nameKm: "មណ្ឌលគិរី", area: "provinces", daysMin: 3, daysMax: 4, feeUsd: "3.50" },
  { code: "ratanakiri", nameEn: "Ratanakiri", nameKm: "រតនគិរី", area: "provinces", daysMin: 3, daysMax: 4, feeUsd: "3.50" },
];

export function findProvince(nameOrCode: string | null | undefined): ProvinceOption | undefined {
  if (!nameOrCode) return undefined;
  const clean = nameOrCode.toLowerCase().replace(/[\s\-_.]+/g, "");
  return CAMBODIA_PROVINCES.find(
    (p) =>
      p.code.replace(/_/g, "") === clean ||
      p.nameEn.toLowerCase().replace(/[\s\-_.]+/g, "") === clean ||
      p.nameKm.replace(/[\s\-_.]+/g, "") === clean,
  );
}
