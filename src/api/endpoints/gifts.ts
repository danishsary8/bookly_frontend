import { api } from "../client";
import type { components } from "../schema";
import type { Resource } from "../types";

export type Gift = components["schemas"]["Gift"];
export const giftsApi = {
  list: () => api.get<Resource<Gift[]>>("/staff/gifts").then((r) => r.data),
  save: (id: number | undefined, gift: Gift) => id ? api.patch(`/staff/gifts/${id}`, gift) : api.post("/staff/gifts", gift),
};
