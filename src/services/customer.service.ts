import api from '../api/axios';

const customerService = {
    getCustomerCount: async (): Promise<CustomerCountResponse> => {
        const response = await api.get<CustomerCountResponse>('/books/countbook');
        return response.data;
    }
};

export default customerService;





